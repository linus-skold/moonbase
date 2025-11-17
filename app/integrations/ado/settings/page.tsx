'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { loadConfig, saveConfig, exportConfig } from '@/lib/ado/storage';
import type { AdoConfig} from '@/lib/ado/schema/config.schema';
import type { AdoInstance } from '@/lib/ado/schema/instance.schema';
import { Plus, Trash2, Save, ArrowLeft, Eye, EyeOff, Download } from 'lucide-react';

async function fetchAuthenticatedUserId(organization: string, pat: string): Promise<string | null> {
  try {
    const url = `https://dev.azure.com/${organization}/_apis/connectionData`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${btoa(`:${pat}`)}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch user ID: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.authenticatedUser?.id || null;
  } catch (error) {
    console.error('Error fetching authenticated user ID:', error);
    return null;
  }
}

export default function AdoSettingsPage() {
  const [config, setConfig] = React.useState<AdoConfig>({
    instances: [],
    environments: [],
    pinnedProjects: [],
    userEmail: '',
  });
  const [isSaving, setIsSaving] = React.useState(false);
  const [showTokens, setShowTokens] = React.useState<{ [key: string]: boolean }>({});

  React.useEffect(() => {
    const savedConfig = loadConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, []);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    
    try {
      // Fetch userId for instances where it's empty
      const updatedInstances = await Promise.all(
        config.instances.map(async (instance) => {
          if (instance.userId === '' && instance.organization && instance.personalAccessToken) {
            const userId = await fetchAuthenticatedUserId(
              instance.organization,
              instance.personalAccessToken
            );
            
            if (userId) {
              console.log(`Fetched userId for instance ${instance.name}: ${userId}`);
              return { ...instance, userId };
            }
          }
          return instance;
        })
      );
      
      const updatedConfig = {
        ...config,
        instances: updatedInstances,
      };
      
      const success = saveConfig(updatedConfig);
      
      if (success) {
        setConfig(updatedConfig);
        console.log('Configuration saved successfully');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportConfig = () => {
    exportConfig(config);
  };

  const addInstance = () => {
    const newInstance: AdoInstance = {
      id: `instance-${Date.now()}`,
      name: '',
      organization: '',
      baseUrl: '',
      personalAccessToken: '',
      enabled: true,
      userId: '',
    };

    setConfig({
      ...config,
      instances: [...config.instances, newInstance],
    });
  };

  const updateInstance = (id: string, updates: Partial<AdoInstance>) => {
    setConfig({
      ...config,
      instances: config.instances.map((instance) =>
        instance.id === id ? { ...instance, ...updates } : instance
      ),
    });
  };

  const removeInstance = (id: string) => {
    setConfig({
      ...config,
      instances: config.instances.filter((instance) => instance.id !== id),
    });
  };

  const toggleTokenVisibility = (id: string) => {
    setShowTokens((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="sm" asChild>
            <a href="/integrations/ado">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inbox
            </a>
          </Button>
        </div>
        <h1 className="text-3xl font-bold">Azure DevOps Settings</h1>
        <p className="text-muted-foreground">
          Configure your Azure DevOps instances and preferences
        </p>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">User Email</label>
            <Input
              type="email"
              value={config.userEmail || ''}
              onChange={(e) => setConfig({ ...config, userEmail: e.target.value })}
              placeholder="your.email@company.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used to identify work items assigned to you
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Pinned Project IDs</label>
            <Input
              type="text"
              value={config.pinnedProjects?.join(', ') || ''}
              onChange={(e) =>
                setConfig({
                  ...config,
                  pinnedProjects: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="project-id-1, project-id-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Comma-separated project IDs to track new tasks and pipelines
            </p>
          </div>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Azure DevOps Instances</h2>
            <Button onClick={addInstance} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Instance
            </Button>
          </div>

          {config.instances.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                <p>No instances configured</p>
                <p className="text-sm mt-1">Click "Add Instance" to get started</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {config.instances.map((instance) => (
                <Card key={instance.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={instance.enabled}
                        onChange={(e) =>
                          updateInstance(instance.id, { enabled: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium">
                        {instance.name || 'New Instance'}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInstance(instance.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name</label>
                      <Input
                        type="text"
                        value={instance.name}
                        onChange={(e) =>
                          updateInstance(instance.id, { name: e.target.value })
                        }
                        placeholder="Production"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Organization
                      </label>
                      <Input
                        type="text"
                        value={instance.organization}
                        onChange={(e) =>
                          updateInstance(instance.id, { organization: e.target.value })
                        }
                        placeholder="your-org"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        Base URL (optional)
                      </label>
                      <Input
                        type="text"
                        value={instance.baseUrl}
                        onChange={(e) =>
                          updateInstance(instance.id, { baseUrl: e.target.value })
                        }
                        placeholder="https://dev.azure.com/your-org"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave empty to use default: https://dev.azure.com/[organization]
                      </p>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        Personal Access Token
                      </label>
                      <div className="relative">
                        <Input
                          type={showTokens[instance.id] ? 'text' : 'password'}
                          value={instance.personalAccessToken}
                          onChange={(e) =>
                            updateInstance(instance.id, {
                              personalAccessToken: e.target.value,
                            })
                          }
                          placeholder="your-pat-token"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => toggleTokenVisibility(instance.id)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showTokens[instance.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Requires Code (Read), Work Items (Read), Build (Read) scopes
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleExportConfig}>
            <Download className="h-4 w-4 mr-2" />
            Export Config
          </Button>
          <Button variant="outline" asChild>
            <a href="/integrations/ado">Cancel</a>
          </Button>
          <Button onClick={handleSaveConfig} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </div>
  );
}

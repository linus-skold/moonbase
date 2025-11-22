'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import React from 'react';
import { loadConfig, saveConfig } from '@/lib/ado/storage';
import { AdoInstance } from '@/lib/ado/schema/instance.schema';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Trash2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/datepicker/DatePicker';
import StatusMapper from '@/components/status-mapper/StatusMapper';
import { StatusMapperContent } from '@/components/status-mapper/StatusMapperContent';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

export default function Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const instanceId = searchParams.get('instanceId');
  
  const [instance, setInstance] = React.useState<AdoInstance | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [showToken, setShowToken] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);

  React.useEffect(() => {
    if (!instanceId) {
      router.push('/settings');
      return;
    }

    const config = loadConfig();
    const foundInstance = config?.instances?.find((inst) => inst.id === instanceId);
    
    if (foundInstance) {
      // Ensure expiresAt is a Date object when loading from storage
      setInstance({
        ...foundInstance,
        expiresAt: foundInstance.expiresAt instanceof Date ? foundInstance.expiresAt : new Date(foundInstance.expiresAt),
      });
    } else {
      router.push('/settings');
    }
    setLoading(false);
  }, [instanceId, router]);

  const updateInstance = (updates: Partial<AdoInstance>) => {
    setInstance((prev) => prev ? { ...prev, ...updates } : null);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!instance || !instanceId) return;

    const config = loadConfig();
    if (!config) return;

    // Instance is already in correct format with proper types
    const updatedInstances = config.instances.map((inst) =>
      inst.id === instanceId ? instance : inst
    );

    const success = saveConfig({ ...config, instances: updatedInstances });
    if (success) {
      setHasChanges(false);
      toast.success('Instance saved successfully');
    } else {
      toast.error('Failed to save instance');
    }
  };

  const handleStatusMappingsSave = (mappings: any[]) => {
    if (!instance || !instanceId) return;

    const config = loadConfig();
    if (!config) return;

    const updatedInstance = { ...instance, statusMappings: mappings };
    const updatedInstances = config.instances.map((inst) =>
      inst.id === instanceId ? updatedInstance : inst
    );

    const success = saveConfig({ ...config, instances: updatedInstances });
    if (success) {
      setInstance(updatedInstance);
      toast.success('Status mappings updated successfully');
    } else {
      toast.error('Failed to update status mappings');
    }
  };

  const handleDelete = () => {
    if (!instanceId) return;

    const config = loadConfig();
    if (!config) return;

    const updatedInstances = config.instances.filter((inst) => inst.id !== instanceId);
    const success = saveConfig({ ...config, instances: updatedInstances });
    
    if (success) {
      toast.success('Instance deleted successfully');
      router.push('/settings');
    } else {
      toast.error('Failed to delete instance');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading...</p>
      </div>
    );
  }

  if (!instance) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/settings')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleSave}
              disabled={!hasChanges}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setDeleteDialogOpen(true)}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
        <h1 className="text-3xl font-bold">Manage Azure DevOps Instance</h1>
        <p className="text-muted-foreground">
          Configure and manage {instance.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Edit instance details directly</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                type="text"
                value={instance.name}
                onChange={(e) => updateInstance({ name: e.target.value })}
                placeholder="Display Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Organization</label>
              <Input
                type="text"
                value={instance.organization ?? ''}
                onChange={(e) => updateInstance({ organization: e.target.value || undefined })}
                placeholder="your-org"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Base URL</label>
              <Input
                type="text"
                value={instance.baseUrl ?? ''}
                onChange={(e) => updateInstance({ baseUrl: e.target.value || undefined })}
                placeholder="https://dev.azure.com/your-org"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Personal Access Token</label>
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  value={instance.personalAccessToken}
                  onChange={(e) => updateInstance({ personalAccessToken: e.target.value })}
                  placeholder="your-pat-token"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <DatePicker
                label="PAT Expires"
                value={instance.expiresAt ? new Date(instance.expiresAt) : undefined}
                onChange={(date) => updateInstance({ expiresAt: date || new Date() })}
                description="PAT expiration date"
              />
            </div>
          </div>

          <Separator className="my-6" />

          <div>
            <h3 className="text-lg font-semibold mb-2">Status Mappings</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure how Azure DevOps work item states map to your workflow
            </p>
            <StatusMapper>
              <StatusMapperContent
                instanceId={instance.id}
                initialMappings={instance.statusMappings || []}
                onSave={handleStatusMappingsSave}
              />
            </StatusMapper>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Instance</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this instance? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="cursor-pointer" variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

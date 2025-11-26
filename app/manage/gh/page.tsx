'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import React from 'react';
import { type GhInstance, type GhConfig, GhInstanceSchema, GhConfigSchema } from '@/lib/gh/schema/instance.schema';
import { create } from '@/lib/storage'
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Trash2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import InboxCache from '@/lib/utils/inbox-cache';
import { clearSeenItems } from '@/lib/utils/new-items-tracker';

export default function Page() {
  const storage = create('gh-config', '1.0', GhConfigSchema);
  const searchParams = useSearchParams();
  const router = useRouter();
  const instanceId = searchParams.get('instanceId');
  
  const [instance, setInstance] = React.useState<GhInstance | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [showToken, setShowToken] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Helper to safely parse date
  const safeParseDate = (dateValue: any): Date => {
    if (!dateValue) return new Date();
    
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? new Date() : dateValue;
    }
    
    try {
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    } catch {
      return new Date();
    }
  };

  React.useEffect(() => {
    if (!instanceId) {
      router.push('/settings');
      return;
    }

    const config = storage.load();
    const foundInstance = config?.instances?.find((inst) => inst.id === instanceId);
    
    if (foundInstance) {
      // Ensure expiresAt is a valid Date object when loading from storage
      setInstance({
        ...foundInstance,
        expiresAt: safeParseDate(foundInstance.expiresAt),
      });
    } else {
      router.push('/settings');
    }
    setLoading(false);
  }, [instanceId, router]);

  const updateInstance = (updates: Partial<GhInstance>) => {
    setInstance((prev) => prev ? { ...prev, ...updates } : null);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!instance || !instanceId) return;

    const config = storage.load();
    if (!config) return;

    // Instance is already in correct format with proper types
    const updatedInstances = config.instances.map((inst) =>
      inst.id === instanceId ? instance : inst
    );

    const success = storage.save({ ...config, instances: updatedInstances });
    if (success) {
      setHasChanges(false);
      
      // Clear the cache for this instance to force a fresh fetch with new settings
      InboxCache.clearCachedItems('github', instanceId);
      
      // Clear the seen items tracker to reset badge counts
      clearSeenItems('github', instanceId);
      
      // Trigger a refresh event so the inbox will reload with new filters
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('inbox-config-updated', {
          detail: { instanceId, type: 'github' }
        }));
      }
      
      toast.success('Instance saved successfully. Cache and read status cleared - refresh your inbox to apply changes.');
    } else {
      toast.error('Failed to save instance');
    }
  };

  const handleDelete = () => {
    if (!instanceId) return;

    const config = storage.load();
    if (!config) return;

    const updatedInstances = config.instances.filter((inst) => inst.id !== instanceId);
    const success = storage.save({ ...config, instances: updatedInstances });
    
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
        <h1 className="text-3xl font-bold">Manage GitHub Instance</h1>
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
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              id="enabled-toggle"
              checked={instance.enabled}
              onChange={(e) => updateInstance({ enabled: e.target.checked })}
              className="w-4 h-4 text-primary bg-background border-gray-300 rounded focus:ring-primary focus:ring-2 cursor-pointer"
            />
            <Label htmlFor="enabled-toggle" className="cursor-pointer">
              Enable this integration instance
            </Label>
          </div>
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
              <label className="block text-sm font-medium mb-1">Username</label>
              <Input
                type="text"
                value={instance.username}
                disabled
                placeholder="GitHub username"
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Username is automatically fetched from your PAT
              </p>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Personal Access Token</label>
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  value={instance.personalAccessToken}
                  onChange={(e) => updateInstance({ personalAccessToken: e.target.value })}
                  placeholder="ghp_..."
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
              Configure how GitHub issue and PR states map to your workflow (Coming soon)
            </p>
            {/* TODO: Implement StatusMapper properly */}
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

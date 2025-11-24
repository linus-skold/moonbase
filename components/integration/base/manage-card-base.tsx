import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type AdoInstance } from "@/lib/ado/schema/instance.schema";
import { type GhInstance } from "@/lib/gh/schema/instance.schema";
import { VscAzureDevops } from "react-icons/vsc";
import { CalendarIcon, Trash2, Power, PowerOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { create } from "@/lib/storage";
import { AdoConfigSchema } from "@/lib/ado/schema/instance.schema";
import { GhConfigSchema } from "@/lib/gh/schema/instance.schema";

type InstanceType = AdoInstance | GhInstance;

interface ManageCardProps {
  children?: React.ReactNode;
  onClick?: () => void;
  onDelete?: () => void;
  instance: InstanceType;
  addText?: string;
}

function getDaysUntilExpiration(expiresAt: Date | number | undefined): number | null {
  if (!expiresAt) return null;
  const expireDate = new Date(expiresAt);
  const now = new Date();
  const diffTime = expireDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getExpirationColor(daysRemaining: number | null): string {
  if (daysRemaining === null) return "text-muted-foreground";
  if (daysRemaining <= 7) return "text-red-600 font-semibold";
  if (daysRemaining <= 30) return "text-yellow-600 font-semibold";
  return "text-muted-foreground";
}

function formatExpirationText(expiresAt: Date | number | undefined, daysRemaining: number | null): string {
  if (daysRemaining === null) return "";
  if (daysRemaining < 0) return "expired";
  
  // Less than 2 weeks: show in days
  if (daysRemaining < 14) {
    return `in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;
  }
  
  // More than 2 weeks: show full date
  const expireDate = new Date(expiresAt!);
  return `on ${expireDate.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  })}`;
}


export const ManageCard = ({ instance, children, onClick, onDelete }: ManageCardProps) => {
  const storageAdo = create('ado-config', '1.0', AdoConfigSchema);
  const storageGh = create('gh-config', '1.0', GhConfigSchema);


  const daysRemaining = getDaysUntilExpiration(instance.expiresAt);
  const expirationColor = getExpirationColor(daysRemaining);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = () => {
    // Determine instance type by checking for properties
    const isAdoInstance = 'organization' in instance || 'baseUrl' in instance;
    
    if (isAdoInstance) {
      const config = storageAdo.load();
      if (!config) {
        toast.error('Failed to load configuration');
        return;
      }
      const updatedInstances = config.instances.filter((inst) => inst.id !== instance.id);
      const success = storageAdo.save({ ...config, instances: updatedInstances });
      
      if (success) {
        toast.success('Instance deleted successfully');
        setDeleteDialogOpen(false);
        onDelete?.();
      } else {
        toast.error('Failed to delete instance');
      }
    } else {
      const config = storageGh.load();
      if (!config) {
        toast.error('Failed to load configuration');
        return;
      }
      const updatedInstances = config.instances.filter((inst) => inst.id !== instance.id);
      const success = storageGh.save({ ...config, instances: updatedInstances });
      
      if (success) {
        toast.success('Instance deleted successfully');
        setDeleteDialogOpen(false);
        onDelete?.();
      } else {
        toast.error('Failed to delete instance');
      }
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
              instance.enabled 
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
            }`}>
              {instance.enabled ? (
                <>
                  <Power className="h-3 w-3" />
                  Enabled
                </>
              ) : (
                <>
                  <PowerOff className="h-3 w-3" />
                  Disabled
                </>
              )}
            </div>
          </div>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <VscAzureDevops className="h-5 w-5" />
              {instance.name}
            </div>
            <Button 
              variant="ghost" 
              size="icon-sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>
            {'baseUrl' in instance 
              ? (instance.baseUrl || instance.organization)
              : 'username' in instance 
                ? `@${instance.username}` 
                : 'Personal Instance'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {instance.expiresAt && (
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4" />
              <span className={expirationColor}>
                PAT expires {formatExpirationText(instance.expiresAt, daysRemaining)}
              </span>
            </div>
          )}
          <Button className="hover:cursor-pointer" variant="outline" onClick={onClick}>Manage</Button>
        </CardContent>
      </Card>
      {children}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Instance</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{instance.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

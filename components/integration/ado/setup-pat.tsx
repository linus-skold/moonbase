import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { DatePicker } from "@/components/datepicker/DatePicker";

import { type AdoInstance, type AdoConfig, AdoInstanceSchema, AdoConfigSchema } from "@/lib/ado/schema/instance.schema";
import { fetchAuthenticatedUserId } from "@/lib/integrations/ado/api";

import { create } from "@/lib/storage";
import { WarningDialog } from "@/components/warning/WarningDialog";


interface SetupPatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;  
  onComplete?: (success: boolean) => void;
}

export const SetupPat = ({ open, onOpenChange, onComplete }: SetupPatProps) => {
  const storage = create('ado-config', '1.0', AdoConfigSchema);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>(
    {}
  );
  const [testConnectionLoading, setTestConnectionLoading] =
    useState(false);
  const [connectionSuccessful, setConnectionSuccessful] = useState<boolean | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const [instance, setInstance] = useState<AdoInstance>({
    instanceType: 'ado' as const,
    id: `ado-instance-${Date.now()}`,
    name: "",
    organization: undefined,
    baseUrl: undefined,
    personalAccessToken: "",
    enabled: false,
    userId: "",
    statusMappings: [],
    expiresAt: new Date(),
  });

  // Validation logic
  const isNameValid = instance.name.trim().length > 0;
  const isOrgOrBaseUrlValid =
    (instance.organization ?? "").trim().length > 0 ||
    (instance.baseUrl ?? "").trim().length > 0;
  const isPatValid = instance.personalAccessToken.trim().length > 0;
  const isFormValid = isNameValid && isOrgOrBaseUrlValid && isPatValid;

  const updateInstance = (updates: Partial<typeof instance>) => {
    setInstance((prev) => ({ ...prev, ...updates }));
  };

  const testConnection = async (): Promise<boolean> => {
    setTestConnectionLoading(true);
    setConnectionSuccessful(null);
    
    const reset = () => {
      setTimeout(() => {
        setConnectionSuccessful(null);
      }, 3000);
    };

    try {
      // Determine the base URL to use
      const baseUrl = instance.baseUrl || `https://dev.azure.com/${instance.organization}`;
      
      // Fetch the authenticated user ID
      const userId = await fetchAuthenticatedUserId(baseUrl, instance.personalAccessToken);
      
      if (userId) {
        // Update instance with the fetched userId
        updateInstance({ userId });
        setConnectionSuccessful(true);
        setTestConnectionLoading(false);
        reset();
        
        return true;
      } else {
        setConnectionSuccessful(false);
        setTestConnectionLoading(false);
        reset();
        return false;
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setConnectionSuccessful(false);
      setTestConnectionLoading(false);
      
      // Reset error message after 3 seconds
      setTimeout(() => {
        setConnectionSuccessful(null);
      }, 3000);
      
      return false;
    }
  };

  const toggleTokenVisibility = (id: string) => {
    setShowTokens((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Handler for Add Instance - shows warning first
  const handleAddInstance = () => {
    setShowWarning(true);
  };

  // Handler for confirming the warning and proceeding with save
  const handleConfirmAddInstance = async () => {
    try {
      // Test connection before saving
      const connectionSuccess = await testConnection();
      
      if (!connectionSuccess) {
        console.error("Connection test failed. Instance not saved.");
        if (onComplete) onComplete(false);
        return;
      }
      
      const config = storage.load();
      const instances = Array.isArray(config?.instances) ? config.instances : [];

      const valid = AdoInstanceSchema.safeParse(instance);

      if(!valid.success) {
        if (onComplete) onComplete(false);
        return;
      }


      const newInstance = { 
        ...instance,
        organization: instance.organization || undefined,
        baseUrl: instance.baseUrl || undefined,
      };


      // Optionally, generate a unique id if needed
      // newInstance.id = `instance-${Date.now()}`;
      const updatedConfig = { 
        ...config, 
        instances: [...instances, newInstance],
        // environments removed - not part of AdoConfig schema
      };
      storage.save(updatedConfig);
      if (onComplete) onComplete(true);
      onOpenChange(false);
    } catch (e) {
      if (onComplete) onComplete(false);
    }
  };

  return (
    <>
      <WarningDialog
        isOpen={showWarning}
        onClose={() => {
          setShowWarning(false);
          handleConfirmAddInstance();
        }}
      >
        Your Personal Access Token will be stored locally in your browser. 
        Please ensure you trust this device and understand the security implications.
      </WarningDialog>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add PAT Instance</DialogTitle>
          <DialogDescription>
            Enter your Personal Access Token to connect with Azure
          </DialogDescription>
        </DialogHeader>


        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={instance.name}
              onChange={(e) => updateInstance({ name: e.target.value })}
              placeholder="Display Name"
              required
            />
            {!isNameValid && (
              <p className="text-xs text-red-500 mt-1">Name is required.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Organization <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={instance.organization || ''}
              onChange={(e) => updateInstance({ organization: e.target.value })}
              placeholder="your-org"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              Base URL (optional) <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-muted-foreground mb-2 font-bold">
              Required if Organization is empty (for custom domains)
            </p>
            <Input
              type="text"
              value={instance.baseUrl || ''}
              onChange={(e) => updateInstance({ baseUrl: e.target.value })}
              placeholder="https://dev.azure.com/your-org"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to use default: https://dev.azure.com/[organization]
            </p>
            {!isOrgOrBaseUrlValid && (
              <p className="text-xs text-red-500 mt-1">
                Organization or Base URL is required.
              </p>
            )}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              Personal Access Token <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type={showTokens[instance.id] ? "text" : "password"}
                value={instance.personalAccessToken}
                onChange={(e) =>
                  updateInstance({ personalAccessToken: e.target.value })
                }
                placeholder="your-pat-token"
                className="pr-10"
                required
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
            {!isPatValid && (
              <p className="text-xs text-red-500 mt-1">
                Personal Access Token is required.
              </p>
            )}
          </div>

          <div>
            <DatePicker
              label="Expires"
              required
              onChange={(date) =>
                updateInstance({ expiresAt: date })
              }
              description="Set the expiry date of your PAT for a reminder in the app"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-2 grid-cols-2">
          <Button
            variant="outline"
            className="w-full justify-start hover:cursor-pointer"
            onClick={testConnection}
            disabled={testConnectionLoading}
          >
            {testConnectionLoading && <Spinner className="mr-2 h-5 w-5" />}
            {!testConnectionLoading && <RefreshCw className="mr-2 h-5 w-5" />}
            <span
              className={`transition-colors duration-300 ${
                connectionSuccessful === true
                  ? "text-green-500"
                  : connectionSuccessful === false
                  ? "text-red-500"
                  : "text-foreground"
              }`}
            >
              {connectionSuccessful === true
                ? "Connection Successful"
                : connectionSuccessful === false
                ? "Connection Failed"
                : "Test Connection"}
            </span>
          </Button>

          <Button
            variant="default"
            className="w-full justify-start hover:cursor-pointer"
            disabled={!isFormValid}
            onClick={handleAddInstance}
          >
            <Save className="mr-2 h-5 w-5" />
            Add Instance
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

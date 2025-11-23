import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { DatePicker } from "@/components/datepicker/DatePicker";

import { loadConfig, saveConfig } from "@/lib/gh/storage";
import { GhInstance } from "@/lib/gh/schema/instance.schema";
import { fetchAuthenticatedUser } from "@/lib/integrations/gh/api";

interface SetupPatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;  
  onComplete?: (success: boolean) => void;
}

export const SetupPat = ({ open, onOpenChange, onComplete }: SetupPatProps) => {
  const [showTokens, setShowTokens] = React.useState<Record<string, boolean>>(
    {}
  );
  const [testConnectionLoading, setTestConnectionLoading] =
    React.useState(false);
  const [connectionSuccessful, setConnectionSuccessful] = React.useState<
    boolean | null
  >(null);

  const [instance, setInstance] = React.useState<GhInstance>({
    id: `gh-instance-${Date.now()}`,
    name: "",
    personalAccessToken: "",
    enabled: false,
    username: "",
    statusMappings: [],
    expiresAt: new Date(),
  });

  // Validation logic
  const isNameValid = instance.name.trim().length > 0;
  const isPatValid = instance.personalAccessToken.trim().length > 0;
  const isFormValid = isNameValid && isPatValid;

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
      // Fetch the authenticated user
      const user = await fetchAuthenticatedUser(instance.personalAccessToken);
      
      if (user) {
        // Update instance with the fetched username
        updateInstance({ username: user.login });
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
      reset();
      
      return false;
    }
  };

  const toggleTokenVisibility = (id: string) => {
    setShowTokens((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Handler for Add Instance
  const handleAddInstance = async () => {
    try {
      // Test connection before saving
      const connectionSuccess = await testConnection();
      
      if (!connectionSuccess) {
        console.error("Connection test failed. Instance not saved.");
        if (onComplete) onComplete(false);
        return;
      }
      
      const config = loadConfig();
      const instances = Array.isArray(config?.instances) ? config.instances : [];

      console.log("Current config instances:", instance);
      const valid = GhInstance.safeParse(instance);

      if(!valid.success) {
        if (onComplete) onComplete(false);
        console.error("Invalid GitHub instance data:", valid.error);
        return;
      }

      const newInstance = { 
        ...instance,
      };

      console.log("Adding new GitHub instance:", newInstance);

      const updatedConfig = { 
        ...config, 
        instances: [...instances, newInstance],
        environments: config?.environments ?? [],
        pinnedRepositories: config?.pinnedRepositories ?? [],
      };
      saveConfig(updatedConfig);
      if (onComplete) onComplete(true);
      onOpenChange(false);
    } catch (e) {
      if (onComplete) onComplete(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add GitHub PAT Instance</DialogTitle>
          <DialogDescription>
            Enter your Personal Access Token to connect with GitHub
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={instance.name}
              onChange={(e) => updateInstance({ name: e.target.value })}
              placeholder="Display Name (e.g., My GitHub Account)"
              required
            />
            {!isNameValid && (
              <p className="text-xs text-red-500 mt-1">Name is required.</p>
            )}
          </div>

          <div>
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
                placeholder="ghp_..."
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
              Requires <code>repo</code> scope for private repositories and PRs
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
  );
};

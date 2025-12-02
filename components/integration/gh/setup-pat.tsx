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

import { fetchAuthenticatedUser } from "@/lib/exchanges/gh/api";
import { WarningDialog } from "@/components/warning/WarningDialog";
import { TrackEvent } from "@/lib/tracking/tracking";
import { integrationStorage } from "@/lib/utils/integration-storage";
import { GhIntegrationConfigSchema, type GhIntegrationInstance } from "@/lib/exchanges/gh/schema/config.schema";

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
  const [showWarning, setShowWarning] = React.useState(false);

  const [name, setName] = React.useState("");
  const [personalAccessToken, setPersonalAccessToken] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState<Date | undefined>(undefined);
  const [instanceId] = React.useState(() => crypto.randomUUID());

  const isNameValid = name.trim().length > 0;
  const isPatValid = personalAccessToken.trim().length > 0;
  const isFormValid = isNameValid && isPatValid;

  const testConnection = async (): Promise<boolean> => {
    if(!personalAccessToken) return false;

    setTestConnectionLoading(true);
    setConnectionSuccessful(null);
    
    const reset = () => {
      setTimeout(() => {
        setConnectionSuccessful(null);
      }, 3000);
    };

    try {
      // Fetch the authenticated user
      const user = await fetchAuthenticatedUser(personalAccessToken);
      
      if (user) {
        // Update username with the fetched username
        setUsername(user.login);
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

      const newInstance: GhIntegrationInstance = {
        instanceType: "gh",
        id: instanceId,
        name,
        enabled: true,
        personalAccessToken,
        username,
        expiresAt,
      };

      const valid = GhIntegrationConfigSchema.safeParse(newInstance);

      if (!valid.success) {
        console.error("Validation failed:", valid.error);
        if (onComplete) onComplete(false);
        return;
      }

      integrationStorage.saveInstance(newInstance);
      
      if (onComplete) {
        onComplete(true);
        TrackEvent("github_pat_instance_added", {});
      }
      onOpenChange(false);
    } catch (e) {
      console.error("Error saving instance:", e);
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
              value={name}
              onChange={(e) => setName(e.target.value)}
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
                type={showTokens[instanceId] ? "text" : "password"}
                value={personalAccessToken}
                onChange={(e) => setPersonalAccessToken(e.target.value)}
                placeholder="ghp_..."
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => toggleTokenVisibility(instanceId)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showTokens[instanceId] ? (
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
              onChange={(date) => setExpiresAt(date)}
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

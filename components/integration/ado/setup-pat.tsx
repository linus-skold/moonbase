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

import { AdoIntegrationConfigSchema, type AdoIntegrationInstance } from "@/lib/exchanges/ado/schema/config.schema";
import { fetchAuthenticatedUserId } from "@/lib/exchanges/ado/api";

import { integrationStorage } from "@/lib/utils/integration-storage";
import { WarningDialog } from "@/components/warning/WarningDialog";
import { TrackEvent } from "@/lib/tracking/tracking";


interface SetupPatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;  
  onComplete?: (success: boolean) => void;
}

export const SetupPat = ({ open, onOpenChange, onComplete }: SetupPatProps) => {
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>(
    {}
  );
  const [testConnectionLoading, setTestConnectionLoading] =
    useState(false);
  const [connectionSuccessful, setConnectionSuccessful] = useState<boolean | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const [name, setName] = useState("");
  const [organization, setOrganization] = useState<string | undefined>(undefined);
  const [baseUrl, setBaseUrl] = useState<string | undefined>(undefined);
  const [personalAccessToken, setPersonalAccessToken] = useState("");
  const [userId, setUserId] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);
  const [instanceId] = useState(() => crypto.randomUUID());

  // Validation logic
  const isNameValid = name.trim().length > 0;
  const isOrgOrBaseUrlValid =
    (organization ?? "").trim().length > 0 ||
    (baseUrl ?? "").trim().length > 0;
  const isPatValid = personalAccessToken.trim().length > 0;
  const isFormValid = isNameValid && isOrgOrBaseUrlValid && isPatValid;

  const testConnection = async (): Promise<{ success: boolean; userId?: string }> => {
    setTestConnectionLoading(true);
    setConnectionSuccessful(null);
    
    const reset = () => {
      setTimeout(() => {
        setConnectionSuccessful(null);
      }, 3000);
    };

    try {
      // Determine the base URL to use
      const url = baseUrl || `https://dev.azure.com/${organization}`;
      
      // Fetch the authenticated user ID
      const fetchedUserId = await fetchAuthenticatedUserId(url, personalAccessToken);
      
      if (fetchedUserId) {
        // Update userId state with the fetched userId
        setUserId(fetchedUserId);
        setConnectionSuccessful(true);
        setTestConnectionLoading(false);
        reset();
        
        return { success: true, userId: fetchedUserId };
      } else {
        setConnectionSuccessful(false);
        setTestConnectionLoading(false);
        reset();
        return { success: false };
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setConnectionSuccessful(false);
      setTestConnectionLoading(false);
      
      // Reset error message after 3 seconds
      setTimeout(() => {
        setConnectionSuccessful(null);
      }, 3000);
      
      return { success: false };
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
      const connectionResult = await testConnection();
      
      if (!connectionResult.success || !connectionResult.userId) {
        console.error("Connection test failed or userId not retrieved. Instance not saved.");
        if (onComplete) onComplete(false);
        return;
      }

      // Create the new instance with the fetched userId
      const newInstance: AdoIntegrationInstance = {
        instanceType: "ado",
        id: instanceId,
        name,
        enabled: true,
        personalAccessToken,
        userId: connectionResult.userId,
        organization,
        baseUrl,
        expiresAt,
      };

      const valid = AdoIntegrationConfigSchema.safeParse(newInstance);

      if (!valid.success) {
        console.error("Instance validation failed:", valid.error);
        if (onComplete) onComplete(false);
        return;
      }

      integrationStorage.saveInstance(newInstance);
      
      if (onComplete) {
        onComplete(true);
        TrackEvent("ado_pat_instance_added", { defaultBaseUrl: baseUrl?.match(/^https:\/\/dev.azure.com\//) });
      }
      onOpenChange(false);
    } catch (e) {
      console.error("Error adding instance:", e);
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
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              value={organization || ''}
              onChange={(e) => setOrganization(e.target.value)}
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
              value={baseUrl || ''}
              onChange={(e) => setBaseUrl(e.target.value)}
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
                type={showTokens[instanceId] ? "text" : "password"}
                value={personalAccessToken}
                onChange={(e) => setPersonalAccessToken(e.target.value)}
                placeholder="your-pat-token"
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

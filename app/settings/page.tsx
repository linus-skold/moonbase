"use client";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useEffect } from "react";
import { integrationStorage } from "@/lib/utils/integration-storage";
import { UserSettingsCard } from "@/components/settings/UserSettingsCard";
import { useRouter } from "next/navigation";
import { ConnectCard } from "@/components/integration/connect-card";
import { ManageCard } from "@/components/integration/manage-card";
import type { IntegrationInstance } from "@/lib/schema/config.schema";
import { integrations } from "@/components/integration/registry";

export default function SettingsPage() {
  const router = useRouter();
  const [instances, setInstances] = useState<IntegrationInstance[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadInstances = useCallback(() => {
    const config = integrationStorage.loadAll();
    const allInstances = config ? Object.values(config.instances) : [];
    setInstances(allInstances);
  }, []);

  const handleDelete = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleInstanceAdded = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    loadInstances();
  }, [loadInstances, refreshKey]);

  // Check for expiring PATs from all integrations
  const allInstances = instances;
  const expiringInstances = allInstances.filter((inst) => {
    if (!inst.expiresAt) return false;
    const expireDate = new Date(inst.expiresAt);
    const now = new Date();
    const diffTime = expireDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {expiringInstances.length > 0 && (
        <div className="bg-red-600 text-white p-4 rounded-lg">
          <div className="flex items-center gap-2 font-semibold">
            <TriangleAlert className="h-5 w-5" />
            Warning: PAT Expiring Soon
          </div>
          <p className="mt-2 text-sm">
            {expiringInstances.map(inst => inst.name).join(', ')} - Personal Access Token{expiringInstances.length > 1 ? 's' : ''} will expire within 3 days. Please update to maintain access.
          </p>
        </div>
      )}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your integrations and preferences here.
        </p>
      </div>
      <div className="space-y-6">
        <UserSettingsCard />
        
        <div>
          <h2 className="text-2xl font-bold mb-4">Add Integrations</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => (
              <ConnectCard
                key={integration.id}
                icon={integration.icon}
                title={integration.title}
                description={integration.description}
                dialogTitle={integration.dialogTitle}
                dialogDescription={integration.dialogDescription}
                oauthButtonText={integration.oauthButtonText}
                setupPatComponent={integration.setupPatComponent}
                onInstanceAdded={handleInstanceAdded}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">Connected Integrations</h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {instances.map((instance) => (
            <ManageCard
              key={instance.id}
              instance={instance}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

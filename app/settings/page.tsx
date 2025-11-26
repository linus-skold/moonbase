"use client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VscGithub, VscAzureDevops } from "react-icons/vsc";
import React from "react";
import { useIntegrations } from "@/components/integration/IntegrationProvider";

import { create } from "@/lib/storage";
import { type AdoInstance, type AdoConfig, AdoConfigSchema } from "@/lib/ado/schema/instance.schema";
import { type GhInstance, type GhConfig, GhConfigSchema } from "@/lib/gh/schema/instance.schema";
import { UserSettingsCard } from "@/components/settings/UserSettingsCard";
import Link from "next/link";

export default function SettingsPage() {

  const storageAdo = create('ado-config', '1.0', AdoConfigSchema);
  const storageGh = create('gh-config', '1.0', GhConfigSchema);

  // Map icon string to component
  const iconMap: Record<string, React.ComponentType<any>> = {
    VscAzureDevops,
    VscGithub,
  };

  const integrations = useIntegrations();

  // State for connected integration instances
  const [adoInstances, setAdoInstances] = React.useState<any[]>([]);
  const [ghInstances, setGhInstances] = React.useState<any[]>([]);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const loadInstances = React.useCallback(() => {
    const adoConfig = storageAdo.load();
    setAdoInstances(adoConfig?.instances || []);
    
    const ghConfig = storageGh.load();
    setGhInstances(ghConfig?.instances || []);
  }, []);

  const handleDelete = React.useCallback(() => {
    // Trigger refresh by updating the key
    setRefreshKey(prev => prev + 1);
  }, []);

  React.useEffect(() => {
    // Load instances from all integrations
    loadInstances();
  }, [loadInstances, refreshKey]);

  // Check for expiring PATs from all integrations
  const allInstances = [...adoInstances, ...ghInstances];
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Warning: PAT Expiring Soon
          </div>
          <p className="mt-2 text-sm">
            {expiringInstances.map(inst => inst.name).join(', ')} - Personal Access Token{expiringInstances.length > 1 ? 's' : ''} will expire within 3 days. Please update to maintain access.
          </p>
        </div>
      )}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Home (update to previous page)
            </Link>
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
            {integrations.map((integration) => {
              const CardComponent = integration.addIntegrationComponent;
              return (
                <CardComponent 
                  key={integration.id} 
                  integration={integration}
                  onInstanceAdded={() => setRefreshKey(prev => prev + 1)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">Connected Integrations</h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => {
            
            const ManageCardComponent = integration.manageIntegrationComponent;
            
            if (integration.id === "ado") {
              return adoInstances.map((inst, idx) => (
                <ManageCardComponent
                  key={inst.id || idx}
                  integration={integration}
                  instance={inst}
                  onDelete={handleDelete}
                />
              ));
            }
            
            if (integration.id === "github") {
              return ghInstances.map((inst, idx) => (
                <ManageCardComponent
                  key={inst.id || idx}
                  integration={integration}
                  instance={inst}
                  onDelete={handleDelete}
                />
              ));
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

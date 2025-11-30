'use client';

import { useState, useEffect, use } from 'react';
import { InboxView } from '@/components/inbox/InboxView';
import { useInbox } from '@/components/inbox/InboxContext';
import { Settings } from 'lucide-react';
import { create } from '@/lib/storage';
import { AdoConfigSchema } from '@/lib/exchanges/ado/schema/instance.schema';
import { GhConfigSchema } from '@/lib/exchanges/gh/schema/instance.schema';
import { InstancesEnum } from '@/lib/schema/instances.schema';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function Page({ params }: PageProps) {
  const storageAdo = create('ado-config', '1.0', AdoConfigSchema);
  const storageGh = create('gh-config', '1.0', GhConfigSchema);
  
  const { slug } = use(params);

  // Determine which data source to use based on instance ID
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [instanceType, setInstanceType] = useState<InstancesEnum | null>(null);

  useEffect(() => {
    // Check ADO config first
    const adoConfig = storageAdo.load();
    const adoInstance = adoConfig?.instances?.find(inst => inst.id === slug);
    
    if (adoInstance) {
      setInstanceName(adoInstance.name);
      setInstanceType('ado');
      return;
    }
    
    // Check GitHub config
    const ghConfig = storageGh.load();
    const ghInstance = ghConfig?.instances?.find(inst => inst.id === slug);
    
    if (ghInstance) {
      setInstanceName(ghInstance.name);
      setInstanceType('github');
      return;
    }
    
    setInstanceName(null);
    setInstanceType(null);
  }, [slug]);
  
  // Use the global inbox context but filter by instance ID
  const { groupedItems, isLoading, error, refresh, isConfigured, configUrl, lastRefreshTime, newItemsCount, markAsRead, markAllAsRead, loadingProgress } = useInbox(slug);
  
  return (
    <InboxView
      title={instanceName ? `${instanceName} Inbox` : 'Inbox'}
      groupedItems={groupedItems}
      isLoading={isLoading}
      error={error}
      onRefresh={() => refresh(true)}
      lastRefreshTime={lastRefreshTime}
      newItemsCount={newItemsCount}
      markAllAsRead={markAllAsRead}
      markAsRead={markAsRead}
      loadingProgress={loadingProgress}
      emptyStateConfig={
        !isConfigured
          ? {
              icon: <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />,
              title: 'No Instances Configured',
              description: 'Add your instances to start tracking your tasks and work items in Moonbase.',
              actionLabel: 'Add Instance',
              actionUrl: configUrl,
            }
          : undefined
      }
    />
  );
}

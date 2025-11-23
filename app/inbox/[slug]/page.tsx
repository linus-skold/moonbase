'use client';

import React from 'react';
import { InboxLayout } from '@/components/inbox/InboxLayout';
import { InboxProvider } from '@/components/inbox/InboxProvider';
import { createAdoDataSource } from '@/lib/ado/data-source';
import { createGhDataSource } from '@/lib/gh/data-source';
import { Settings } from 'lucide-react';
import { create } from '@/lib/storage';
import { AdoInstance } from '@/lib/ado/schema/instance.schema';
import { GhInstance } from '@/lib/gh/schema/instance.schema';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function Page({ params }: PageProps) {
  const storageAdo = create<{ instances: AdoInstance[] }>('ado-config', '1.0');
  const storageGh = create<{ instances: GhInstance[] }>('gh-config', '1.0');
  
  const { slug } = React.use(params);

  // Determine which data source to use based on instance ID
  const [instanceName, setInstanceName] = React.useState<string | null>(null);
  const [instanceType, setInstanceType] = React.useState<'ado' | 'github' | null>(null);

  React.useEffect(() => {
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
  
  const dataSource = React.useMemo(() => {
    if (instanceType === 'ado') {
      return createAdoDataSource(slug);
    } else if (instanceType === 'github') {
      return createGhDataSource(slug);
    }
    return createAdoDataSource(slug); // fallback
  }, [slug, instanceType]);
  
  return (
    <InboxProvider dataSources={[dataSource]}>
      {({ groupedItems, isLoading, error, refresh, isConfigured, configUrl }) => (
        
        <InboxLayout
          title={instanceName ? `${instanceName} Inbox` : 'Inbox'}
          groupedItems={groupedItems}
          isLoading={isLoading}
          error={error}
          onRefresh={refresh}
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
      )}
    </InboxProvider>
  );
}

'use client';

import React from 'react';
import { InboxLayout } from '@/components/inbox/InboxLayout';
import { InboxProvider } from '@/components/inbox/InboxProvider';
import { createAdoDataSource } from '@/lib/ado/data-source';
import { loadConfig } from '@/lib/ado/storage';
import { Settings } from 'lucide-react';


interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function Page({ params }: PageProps) {
  const { slug } = React.use(params);
  
  const adoDataSource = React.useMemo(() => createAdoDataSource(slug), [slug]);
  
  // Get instance name from config
  const [instanceName, setInstanceName] = React.useState<string | null>(null);
  


  React.useEffect(() => {
    const config = loadConfig();
    const instance = config?.instances?.find(inst => inst.id === slug);
    setInstanceName(instance?.name || null);
  }, [slug]);
  
  return (
    <InboxProvider dataSources={[adoDataSource]}>
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

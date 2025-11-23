'use client';

import React from 'react';
import { InboxLayout } from '@/components/inbox/InboxLayout';
import { InboxProvider } from '@/components/inbox/InboxProvider';
import { createAdoDataSource } from '@/lib/ado/data-source';
import { Inbox } from 'lucide-react';
import { createGhDataSource } from '@/lib/gh/data-source';

export default function Home() {
  // Create all data sources
  const dataSources = React.useMemo(() => {
    const sources = [];
    sources.push(createAdoDataSource());
    sources.push(createGhDataSource());
    
    return sources;
  }, []);

  return (
    <InboxProvider dataSources={dataSources}>
      {({ groupedItems, isLoading, error, refresh, isConfigured, configUrl, lastRefreshTime }) => (
        <InboxLayout
          title="Home"
          description="Your unified inbox across all integrations"
          groupedItems={groupedItems}
          isLoading={isLoading}
          error={error}
          onRefresh={() => refresh(true)}
          lastRefreshTime={lastRefreshTime}
          emptyStateConfig={
            !isConfigured
              ? {
                  icon: <Inbox className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />,
                  title: 'No Integrations Configured',
                  description: 'Configure your integrations to start seeing items in your inbox',
                  actionLabel: 'Configure Integrations',
                  actionUrl: configUrl || '/settings',
                }
              : undefined
          }
        />
      )}
    </InboxProvider>
  );
}


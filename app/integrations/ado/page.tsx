'use client';

import React from 'react';
import { InboxLayout } from '@/components/inbox/InboxLayout';
import { InboxProvider } from '@/components/inbox/InboxProvider';
import { createAdoDataSource } from '@/lib/ado/data-source';
import { Settings } from 'lucide-react';

export default function AdoInboxPage() {
  const adoDataSource = React.useMemo(() => createAdoDataSource(), []);

  return (
    <InboxProvider dataSources={[adoDataSource]}>
      {({ groupedItems, isLoading, error, refresh, isConfigured, configUrl }) => (
        <InboxLayout
          title="Azure DevOps Inbox"
          groupedItems={groupedItems}
          isLoading={isLoading}
          error={error}
          onRefresh={refresh}
          settingsUrl="/integrations/ado/settings"
          emptyStateConfig={
            !isConfigured
              ? {
                  icon: <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />,
                  title: 'No Instances Configured',
                  description: 'Add your Azure DevOps instances to start tracking your work items',
                  actionLabel: 'Configure Azure DevOps',
                  actionUrl: configUrl,
                }
              : undefined
          }
        />
      )}
    </InboxProvider>
  );
}

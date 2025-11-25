'use client';

import React from 'react';
import { InboxLayout } from '@/components/inbox/InboxLayout';
import { useInbox } from '@/components/inbox/InboxContext';
import { Inbox } from 'lucide-react';

export default function Home() {
  const { groupedItems, isLoading, error, refresh, isConfigured, configUrl, lastRefreshTime, newItemsCount, markAsRead, markAllAsRead, loadingProgress } = useInbox();

  return (
    <InboxLayout
      title="Home"
      description="Your unified inbox across all integrations"
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
              icon: <Inbox className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />,
              title: 'No Integrations Configured',
              description: 'Configure your integrations to start seeing items in your inbox',
              actionLabel: 'Configure Integrations',
              actionUrl: configUrl || '/settings',
            }
          : undefined
      }
    />
  );
}


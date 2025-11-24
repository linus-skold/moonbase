"use client";

import React, { useMemo, useCallback } from 'react';
import { InboxProvider, type InboxDataSource } from './InboxProvider';
import { InboxContextProvider } from './InboxContext';
import { createAdoDataSource } from '@/lib/ado/data-source';
import { createGhDataSource } from '@/lib/gh/data-source';
import type { GroupedInboxItems, InboxItem } from '@/lib/schema/inbox.schema';

interface GlobalInboxProviderProps {
  children: React.ReactNode;
}

export function GlobalInboxProvider({ children }: GlobalInboxProviderProps) {
  // Create all data sources without filtering by instance
  const dataSources = useMemo<InboxDataSource[]>(() => {
    return [
      createAdoDataSource(),
      createGhDataSource(),
    ];
  }, []);

  return (
    <InboxProvider dataSources={dataSources} autoFetch={true} enablePolling={true}>
      {(providerProps) => {
        // Helper function to filter items by instance ID
        const getFilteredItems = useCallback((instanceId?: string): GroupedInboxItems => {
          if (!instanceId) {
            return providerProps.groupedItems;
          }

          // Filter grouped items to only include those matching the instance
          const filtered: GroupedInboxItems = {};
          Object.entries(providerProps.groupedItems).forEach(([key, group]) => {
            // Check if the group's instance matches the instanceId
            if (group.instance.id === instanceId) {
              filtered[key] = group;
            }
          });
          
          return filtered;
        }, [providerProps.groupedItems]);

        // Helper function to count new items for a specific instance
        const getFilteredNewItemsCount = useCallback((instanceId?: string): number => {
          if (!instanceId) {
            return providerProps.newItemsCount;
          }

          const filteredItems = getFilteredItems(instanceId);
          let count = 0;
          
          Object.values(filteredItems).forEach((group) => {
            count += group.items.filter((item: InboxItem) => item.isNew).length;
            
            if (group.repositories) {
              Object.values(group.repositories).forEach((repo) => {
                count += repo.items.filter((item: InboxItem) => item.isNew).length;
              });
            }
          });
          
          return count;
        }, [getFilteredItems]);

        const contextValue = {
          ...providerProps,
          getFilteredItems,
          getFilteredNewItemsCount,
        };

        return (
          <InboxContextProvider value={contextValue}>
            {children}
          </InboxContextProvider>
        );
      }}
    </InboxProvider>
  );
}

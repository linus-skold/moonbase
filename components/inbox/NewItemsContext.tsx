"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getNewItemsCount } from '@/lib/utils/new-items-tracker';
import { create } from '@/lib/storage';
import { AdoConfigSchema } from '@/lib/ado/schema/instance.schema';
import { GhConfigSchema } from '@/lib/gh/schema/instance.schema';
import { createAdoDataSource } from '@/lib/ado/data-source';
import { createGhDataSource } from '@/lib/gh/data-source';

interface NewItemsCounts {
  [instanceId: string]: number;
}

interface NewItemsContextValue {
  counts: NewItemsCounts;
  refreshCounts: () => Promise<void>;
}

const NewItemsContext = createContext<NewItemsContextValue | undefined>(undefined);

export const NewItemsProvider = ({ children }: { children: React.ReactNode }) => {
  const [counts, setCounts] = useState<NewItemsCounts>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshCounts = useCallback(async () => {
    if (!mounted) return;
    const integrations = [
      {
        type: 'ado' as const,
        storage: create('ado-config', '1.0', AdoConfigSchema),
        createDataSource: createAdoDataSource,
      },
      {
        type: 'github' as const,
        storage: create('gh-config', '1.0', GhConfigSchema),
        createDataSource: createGhDataSource,
      },
    ];

    const newCounts: NewItemsCounts = {};

    for (const integration of integrations) {
      const config = integration.storage.load();
      
      if (config?.instances) {
        for (const instance of config.instances) {
          try {
            const dataSource = integration.createDataSource(instance.id);
            const items = await dataSource.fetchInboxItems({ forceRefresh: false });
            
            const allItemIds: string[] = [];
            Object.values(items).forEach((group) => {
              allItemIds.push(...group.items.map(item => item.id));
              if (group.repositories) {
                Object.values(group.repositories).forEach((repo) => {
                  allItemIds.push(...repo.items.map(item => item.id));
                });
              }
            });

            newCounts[instance.id] = getNewItemsCount(allItemIds, integration.type, instance.id);
          } catch (error) {
            console.error(`Failed to count new items for ${instance.name}:`, error);
            newCounts[instance.id] = 0;
          }
        }
      }
    }

    setCounts(newCounts);
  }, [mounted]);

  useEffect(() => {
    if (mounted) {
      refreshCounts();
      
      // Refresh counts periodically (every minute)
      const interval = setInterval(refreshCounts, 60 * 1000);
      
      // Listen for custom event when items are marked as read
      const handleItemsRead = () => refreshCounts();
      
      window.addEventListener('inbox-items-read', handleItemsRead);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('inbox-items-read', handleItemsRead);
      };
    }
  }, [mounted, refreshCounts]);

  return (
    <NewItemsContext.Provider value={{ counts, refreshCounts }}>
      {children}
    </NewItemsContext.Provider>
  );
}

export const useNewItems = () => {
  const context = useContext(NewItemsContext);
  if (!context) {
    throw new Error('useNewItems must be used within a NewItemsProvider');
  }
  return context;
}

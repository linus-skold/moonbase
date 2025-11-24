"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { GroupedInboxItems, InboxItem } from "@/lib/schema/inbox.schema";
import { getPollingManager } from "@/lib/utils/polling-manager";
import { loadSeenItems, markItemsAsSeen } from "@/lib/utils/new-items-tracker";
import { settingsStorage } from "@/lib/utils/settings-storage";

export interface InboxDataSource {
  id: string;
  name: string;
  fetchInboxItems: (options?: {
    forceRefresh?: boolean;
  }) => Promise<GroupedInboxItems>;
  getConfigStatus: () => { isConfigured: boolean; configUrl?: string };
}

export interface InboxProviderProps {
  children: (props: {
    groupedItems: GroupedInboxItems;
    isLoading: boolean;
    error: string | null;
    refresh: (forceRefresh?: boolean) => Promise<void>;
    isConfigured: boolean;
    configUrl?: string;
    lastRefreshTime: Date | null;
    newItemsCount: number;
    markAsRead: (itemId: string) => void;
    markAllAsRead: () => void;
  }) => React.ReactNode;
  dataSources: InboxDataSource[];
  autoFetch?: boolean;
  enablePolling?: boolean;
  instanceId?: string;
}

export function InboxProvider({
  children,
  dataSources,
  autoFetch = true,
  enablePolling = true,
  instanceId,
}: InboxProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [groupedItems, setGroupedItems] = useState<GroupedInboxItems>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [newItemsCount, setNewItemsCount] = useState(0);

  // Only run on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Mark new items in the fetched data
  const markNewItems = useCallback((items: GroupedInboxItems): GroupedInboxItems => {
    const markedItems: GroupedInboxItems = {};
    
    Object.entries(items).forEach(([key, group]) => {
      // Load seen items for this specific instance
      const sourceId = group.instance.instanceType === 'ado' ? 'ado' : 'github';
      const seenItems = loadSeenItems(sourceId, group.instance.id);
      
      const markedGroup = {
        ...group,
        items: group.items.map((item: InboxItem) => ({
          ...item,
          isNew: !seenItems.has(item.id),
        })),
      };
      
      if (markedGroup.repositories) {
        const markedRepos: typeof markedGroup.repositories = {};
        Object.entries(markedGroup.repositories).forEach(([repoKey, repo]) => {
          markedRepos[repoKey] = {
            ...repo,
            items: repo.items.map((item: InboxItem) => ({
              ...item,
              isNew: !seenItems.has(item.id),
            })),
          };
        });
        markedGroup.repositories = markedRepos;
      }
      
      markedItems[key] = markedGroup;
    });
    
    return markedItems;
  }, []);

  // Count new items
  const countNewItems = useCallback((items: GroupedInboxItems): number => {
    let count = 0;
    
    Object.values(items).forEach((group) => {
      count += group.items.filter((item: InboxItem) => item.isNew).length;
      
      if (group.repositories) {
        Object.values(group.repositories).forEach((repo) => {
          count += repo.items.filter((item: InboxItem) => item.isNew).length;
        });
      }
    });
    
    return count;
  }, []);

  const refresh = useCallback(
    async (forceRefresh = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const allItems: GroupedInboxItems = {};

        // Fetch from all data sources in parallel
        const results = await Promise.allSettled(
          dataSources.map((source) => source.fetchInboxItems({ forceRefresh }))
        );

        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            // Merge items from this source
            Object.entries(result.value).forEach(([key, value]) => {
              // Ensure unique keys by prefixing with source ID
              const uniqueKey = `${dataSources[index].id}-${key}`;
              allItems[uniqueKey] = value;
            });
          } else {
            console.error(
              `Error fetching from ${dataSources[index].name}:`,
              result.reason
            );
          }
        });

        const markedItems = markNewItems(allItems);
        setGroupedItems(markedItems);
        setNewItemsCount(countNewItems(markedItems));
        setLastRefreshTime(new Date());
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch inbox items"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [dataSources, markNewItems, countNewItems]
  );

  // Auto-fetch on mount and when data sources change (only on client)
  useEffect(() => {
    if (mounted && autoFetch && dataSources.length > 0) {
      refresh();
    }
  }, [mounted, autoFetch, dataSources, refresh]);

  // Set up background polling
  useEffect(() => {
    if (!mounted || !enablePolling || dataSources.length === 0) {
      return;
    }

    // Check user settings for polling preference
    const settings = settingsStorage.load();
    if (!settings.pollingEnabled) {
      return;
    }

    const pollingManager = getPollingManager();
    
    // Create a unique ID for this inbox provider instance
    const providerPollId = instanceId 
      ? `inbox-provider-${instanceId}` 
      : `inbox-provider-${dataSources.map(ds => ds.id).join('-')}`;

    // Register a single poll that fetches all data sources together
    pollingManager.registerSource({
      id: providerPollId,
      poll: async () => {
        // Poll silently in the background without showing loading state
        try {
          // Check user settings for auto-refresh behavior
          const settings = settingsStorage.load();
          
          // Fetch from all data sources with forceRefresh to get fresh data
          // This bypasses the cache to update it with new data from the API
          const allItems: GroupedInboxItems = {};
          
          const results = await Promise.allSettled(
            dataSources.map((ds) => ds.fetchInboxItems({ forceRefresh: true }))
          );

          results.forEach((result, index) => {
            if (result.status === "fulfilled") {
              Object.entries(result.value).forEach(([key, value]) => {
                const uniqueKey = `${dataSources[index].id}-${key}`;
                allItems[uniqueKey] = value;
              });
            } else {
              console.error(
                `Background poll failed for ${dataSources[index].name}:`,
                result.reason
              );
            }
          });
          
          const markedItems = markNewItems(allItems);
          const newCount = countNewItems(markedItems);
          
          // Use setState callback to get fresh current state for comparison
          setGroupedItems((currentItems) => {
            // Check if there are actual changes (compare item IDs)
            const currentItemIds = new Set<string>();
            Object.values(currentItems).forEach((group) => {
              group.items.forEach((item: InboxItem) => currentItemIds.add(item.id));
              if (group.repositories) {
                Object.values(group.repositories).forEach((repo) => {
                  repo.items.forEach((item: InboxItem) => currentItemIds.add(item.id));
                });
              }
            });
            
            const newItemIds = new Set<string>();
            Object.values(markedItems).forEach((group) => {
              group.items.forEach((item: InboxItem) => newItemIds.add(item.id));
              if (group.repositories) {
                Object.values(group.repositories).forEach((repo) => {
                  repo.items.forEach((item: InboxItem) => newItemIds.add(item.id));
                });
              }
            });
            
            // Check if there are differences in the item sets (additions or removals)
            const hasChanges = currentItemIds.size !== newItemIds.size || 
              Array.from(newItemIds).some(id => !currentItemIds.has(id)) ||
              Array.from(currentItemIds).some(id => !newItemIds.has(id));
            
            // Only update the UI if auto-refresh is enabled
            if (settings.autoRefreshOnPoll) {
              setNewItemsCount(newCount);
              setLastRefreshTime(new Date());
              return markedItems;
            } else if (hasChanges) {
              // Only dispatch event if there are actual changes
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('inbox-data-available'));
              }
            }
            
            // No changes or auto-refresh disabled, keep current state
            return currentItems;
          });
        } catch (err) {
          console.error(`Background poll failed:`, err);
        }
      },
    });

    // Start polling
    pollingManager.startPolling();

    // Cleanup: unregister the poll when component unmounts
    return () => {
      pollingManager.unregisterSource(providerPollId);
    };
  }, [mounted, enablePolling, dataSources, instanceId, markNewItems, countNewItems]);

  // Mark an item as read
  const markAsRead = useCallback((itemId: string) => {
    // Update the state to reflect the change using setState callback to get fresh state
    setGroupedItems((currentItems) => {
      // First, find which instance this item belongs to
      let itemInstanceId: string | undefined;
      let itemSourceId: string | undefined;
      
      Object.values(currentItems).forEach((group) => {
        const itemInGroup = group.items.find((item: InboxItem) => item.id === itemId);
        if (itemInGroup) {
          itemInstanceId = group.instance.id;
          itemSourceId = group.instance.instanceType === 'ado' ? 'ado' : 'github';
        }
        
        if (group.repositories && !itemInGroup) {
          Object.values(group.repositories).forEach((repo) => {
            const itemInRepo = repo.items.find((item: InboxItem) => item.id === itemId);
            if (itemInRepo) {
              itemInstanceId = group.instance.id;
              itemSourceId = group.instance.instanceType === 'ado' ? 'ado' : 'github';
            }
          });
        }
      });
      
      // Mark as seen with the correct instance ID
      if (itemSourceId && itemInstanceId) {
        markItemsAsSeen([itemId], itemSourceId, itemInstanceId);
      }
      
      const updatedItems: GroupedInboxItems = {};
      Object.entries(currentItems).forEach(([key, group]) => {
        const updatedGroup = {
          ...group,
          items: group.items.map((item: InboxItem) => 
            item.id === itemId ? { ...item, isNew: false } : item
          ),
        };
        
        if (updatedGroup.repositories) {
          const updatedRepos: typeof updatedGroup.repositories = {};
          Object.entries(updatedGroup.repositories).forEach(([repoKey, repo]) => {
            updatedRepos[repoKey] = {
              ...repo,
              items: repo.items.map((item: InboxItem) =>
                item.id === itemId ? { ...item, isNew: false } : item
              ),
            };
          });
          updatedGroup.repositories = updatedRepos;
        }
        
        updatedItems[key] = updatedGroup;
      });
      
      const newCount = countNewItems(updatedItems);
      setNewItemsCount(newCount);
      
      return updatedItems;
    });
    
    // Dispatch custom event to update sidebar counts
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('inbox-items-read'));
    }
  }, [countNewItems]);

  // Mark all items as read
  const markAllAsRead = useCallback(() => {
    setGroupedItems((currentItems) => {
      // Group items by instance for proper storage
      const itemsByInstance: Record<string, { sourceId: string; instanceId: string; itemIds: string[] }> = {};
      
      Object.values(currentItems).forEach((group) => {
        const instanceId = group.instance.id;
        const sourceId = group.instance.instanceType === 'ado' ? 'ado' : 'github';
        
        if (!itemsByInstance[instanceId]) {
          itemsByInstance[instanceId] = { sourceId, instanceId, itemIds: [] };
        }
        
        itemsByInstance[instanceId].itemIds.push(...group.items.map((item: InboxItem) => item.id));
        
        if (group.repositories) {
          Object.values(group.repositories).forEach((repo) => {
            itemsByInstance[instanceId].itemIds.push(...repo.items.map((item: InboxItem) => item.id));
          });
        }
      });

      // Mark items as seen with correct instance IDs
      Object.values(itemsByInstance).forEach(({ sourceId, instanceId, itemIds }) => {
        markItemsAsSeen(itemIds, sourceId, instanceId);
      });

      // Update all items to not be new
      const updatedItems: GroupedInboxItems = {};
      Object.entries(currentItems).forEach(([key, group]) => {
        const updatedGroup = {
          ...group,
          items: group.items.map((item: InboxItem) => ({ ...item, isNew: false })),
        };
        
        if (updatedGroup.repositories) {
          const updatedRepos: typeof updatedGroup.repositories = {};
          Object.entries(updatedGroup.repositories).forEach(([repoKey, repo]) => {
            updatedRepos[repoKey] = {
              ...repo,
              items: repo.items.map((item: InboxItem) => ({ ...item, isNew: false })),
            };
          });
          updatedGroup.repositories = updatedRepos;
        }
        
        updatedItems[key] = updatedGroup;
      });
      
      setNewItemsCount(0);
      
      return updatedItems;
    });
    
    // Dispatch custom event to update sidebar counts
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('inbox-items-read'));
    }
  }, []);

  // Check if at least one data source is configured (only on client)
  const configStatus = useMemo(() => {
    if (!mounted) {
      return { isConfigured: false, configUrl: undefined };
    }

    const configured = dataSources.some(
      (source) => source.getConfigStatus().isConfigured
    );
    const configUrl = dataSources
      .find((source) => !source.getConfigStatus().isConfigured)
      ?.getConfigStatus().configUrl;

    return { isConfigured: configured, configUrl };
  }, [mounted, dataSources]);

  return (
    <>
      {children({
        groupedItems,
        isLoading,
        error,
        refresh,
        isConfigured: configStatus.isConfigured,
        configUrl: configStatus.configUrl,
        lastRefreshTime,
        newItemsCount,
        markAsRead,
        markAllAsRead,
      })}
    </>
  );
}

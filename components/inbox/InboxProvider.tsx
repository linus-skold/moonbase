"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { GroupedInboxItems, InboxItem } from "@/lib/schema/inbox.schema";
import { getPollingManager } from "@/lib/utils/polling-manager";
import { loadSeenItems, markItemsAsSeen } from "@/lib/utils/new-items-tracker";
import { settingsStorage } from "@/lib/utils/settings-storage";

// Helper to save seen items directly (used internally)
function saveSeenItemsDirectly(sourceId: string, seenItemIds: Set<string>, instanceId?: string): void {
  if (typeof window === 'undefined') return;
  
  const STORAGE_KEY_PREFIX = 'new-items-';
  const key = instanceId 
    ? `${STORAGE_KEY_PREFIX}${sourceId}-${instanceId}`
    : `${STORAGE_KEY_PREFIX}${sourceId}`;
  
  try {
    const data = {
      seenItemIds: Array.from(seenItemIds),
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save seen items:', error);
  }
}

export interface InboxDataSource {
  id: string;
  name: string;
  fetchInboxItems: (options?: {
    forceRefresh?: boolean;
    onProgress?: (data: GroupedInboxItems, progress: { current: number, total: number, stage: string }) => void;
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
    loadingProgress?: { current: number, total: number, stage: string };
  }) => React.ReactNode;
  dataSources: InboxDataSource[];
  autoFetch?: boolean;
  enablePolling?: boolean;
  instanceId?: string;
  enableProgressiveLoading?: boolean;
}

export function InboxProvider({
  children,
  dataSources,
  autoFetch = true,
  enablePolling = true,
  instanceId,
  enableProgressiveLoading = true,
}: InboxProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [groupedItems, setGroupedItems] = useState<GroupedInboxItems>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [newItemsCount, setNewItemsCount] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number, total: number, stage: string } | undefined>(undefined);

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
      
      // Show progress immediately when force refreshing
      if (enableProgressiveLoading && forceRefresh) {
        setLoadingProgress({ current: 0, total: 1, stage: 'Starting refresh...' });
      }

      try {
        const allItems: GroupedInboxItems = {};
        let accumulatedItems: GroupedInboxItems = {};
        let progressUpdatePending = false;

        if (enableProgressiveLoading && forceRefresh) {
          // Capture current items to detect changes
          const currentItemsSnapshot = new Map<string, { updatedDate: string; instanceId: string; sourceId: string }>();
          
          setGroupedItems(prevItems => {
            Object.values(prevItems).forEach((group) => {
              const sourceId = group.instance.instanceType === 'ado' ? 'ado' : 'github';
              const instanceId = group.instance.id;
              
              group.items.forEach((item: InboxItem) => {
                currentItemsSnapshot.set(item.id, { 
                  updatedDate: item.updatedDate, 
                  instanceId, 
                  sourceId 
                });
              });
            });
            return prevItems;
          });

          // Progressive loading with live updates
          const results = await Promise.allSettled(
            dataSources.map((source) => 
              source.fetchInboxItems({ 
                forceRefresh,
                onProgress: (progressData, progress) => {
                  // Prevent overlapping updates
                  if (progressUpdatePending) return;
                  progressUpdatePending = true;
                  
                  // Schedule state updates for next tick to avoid setState during render
                  setTimeout(() => {
                    progressUpdatePending = false;
                    
                    // Update progress indicator
                    setLoadingProgress(progress);
                    
                    // Merge progressive data into accumulated items
                    Object.entries(progressData).forEach(([key, value]) => {
                      const uniqueKey = `${source.id}-${key}`;
                      accumulatedItems[uniqueKey] = value;
                    });
                    
                    // Update UI with accumulated results, merging with existing items
                    setGroupedItems(prevItems => {
                      // Create a merged view that preserves existing groups and updates them
                      const merged: GroupedInboxItems = { ...prevItems };
                      
                      Object.entries(accumulatedItems).forEach(([key, newGroup]) => {
                        if (merged[key]) {
                          // Group exists - merge items, replacing by ID
                          const existingItemsMap = new Map(
                            merged[key].items.map((item: InboxItem) => [item.id, item])
                          );
                          
                          // Update with new items and detect changes
                          newGroup.items.forEach((newItem: InboxItem) => {
                            const oldItem = currentItemsSnapshot.get(newItem.id);
                            
                            // If item was updated (different updatedDate), mark as unseen
                            if (oldItem && oldItem.updatedDate !== newItem.updatedDate) {
                              const seenItems = loadSeenItems(oldItem.sourceId, oldItem.instanceId);
                              seenItems.delete(newItem.id);
                              saveSeenItemsDirectly(oldItem.sourceId, seenItems, oldItem.instanceId);
                            }
                            
                            existingItemsMap.set(newItem.id, newItem);
                          });
                          
                          merged[key] = {
                            ...newGroup,
                            items: Array.from(existingItemsMap.values()),
                          };
                        } else {
                          // New group
                          merged[key] = newGroup;
                        }
                      });
                      
                      const markedItems = markNewItems(merged);
                      return markedItems;
                    });
                    
                    setNewItemsCount(prevCount => {
                      const count = countNewItems({ ...accumulatedItems });
                      return count;
                    });
                  }, 0);
                },
              })
            )
          );

          results.forEach((result, index) => {
            if (result.status === "fulfilled") {
              // Merge final items from this source
              Object.entries(result.value).forEach(([key, value]) => {
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
        } else {
          // Standard loading: fetch all at once
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
        }

        const markedItems = markNewItems(allItems);
        setGroupedItems(markedItems);
        setNewItemsCount(countNewItems(markedItems));
        setLastRefreshTime(new Date());
        
        // Notify sidebar to refresh its counts
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('inbox-items-updated'));
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch inbox items"
        );
      } finally {
        setIsLoading(false);
        // Delay clearing progress to ensure all setTimeout callbacks complete
        setTimeout(() => {
          setLoadingProgress(undefined);
        }, 100);
      }
    },
    [dataSources, markNewItems, countNewItems, enableProgressiveLoading]
  );

  // Auto-fetch on mount and when data sources change (only on client)
  useEffect(() => {
    if (mounted && autoFetch && dataSources.length > 0) {
      refresh();
    }
  }, [mounted, autoFetch, dataSources, refresh]);

  // Listen for config updates and refresh when settings change
  useEffect(() => {
    if (!mounted) return;

    const handleConfigUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ instanceId: string; type: string }>;
      const { instanceId: updatedInstanceId, type } = customEvent.detail || {};
      
      // Check if this config update affects any of our data sources
      const affectsUs = dataSources.some(
        ds => ds.id === updatedInstanceId || (instanceId && instanceId === updatedInstanceId)
      );
      
      if (affectsUs) {
        // Force refresh to apply new configuration
        refresh(true);
      }
    };

    window.addEventListener('inbox-config-updated', handleConfigUpdate);
    
    return () => {
      window.removeEventListener('inbox-config-updated', handleConfigUpdate);
    };
  }, [mounted, dataSources, instanceId, refresh]);

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
          
          // Use setState callback to get fresh current state for comparison
          setGroupedItems((currentItems) => {
            // Build maps of current items by ID with their update times
            const currentItemsMap = new Map<string, { updatedDate: string; instanceId: string; sourceId: string }>();
            Object.values(currentItems).forEach((group) => {
              const sourceId = group.instance.instanceType === 'ado' ? 'ado' : 'github';
              const instanceId = group.instance.id;
              
              group.items.forEach((item: InboxItem) => {
                currentItemsMap.set(item.id, { updatedDate: item.updatedDate, instanceId, sourceId });
              });
              if (group.repositories) {
                Object.values(group.repositories).forEach((repo) => {
                  repo.items.forEach((item: InboxItem) => {
                    currentItemsMap.set(item.id, { updatedDate: item.updatedDate, instanceId, sourceId });
                  });
                });
              }
            });
            
            // Check for new items, removed items, or updated items
            const newItemIds = new Set<string>();
            const updatedItemIds: string[] = [];
            
            Object.values(allItems).forEach((group) => {
              group.items.forEach((item: InboxItem) => {
                const currentItem = currentItemsMap.get(item.id);
                if (!currentItem) {
                  // New item
                  newItemIds.add(item.id);
                } else if (currentItem.updatedDate !== item.updatedDate) {
                  // Item was updated - mark it as new so it gets highlighted
                  updatedItemIds.push(item.id);
                  newItemIds.add(item.id);
                }
              });
              
              if (group.repositories) {
                Object.values(group.repositories).forEach((repo) => {
                  repo.items.forEach((item: InboxItem) => {
                    const currentItem = currentItemsMap.get(item.id);
                    if (!currentItem) {
                      newItemIds.add(item.id);
                    } else if (currentItem.updatedDate !== item.updatedDate) {
                      updatedItemIds.push(item.id);
                      newItemIds.add(item.id);
                    }
                  });
                });
              }
            });
            
            // Check if any items were removed
            const allNewItemIds = new Set<string>();
            Object.values(allItems).forEach((group) => {
              group.items.forEach((item: InboxItem) => allNewItemIds.add(item.id));
              if (group.repositories) {
                Object.values(group.repositories).forEach((repo) => {
                  repo.items.forEach((item: InboxItem) => allNewItemIds.add(item.id));
                });
              }
            });
            
            const removedItems = Array.from(currentItemsMap.keys()).filter(id => !allNewItemIds.has(id));
            
            // Mark updated items as "unseen" so they show as new
            if (updatedItemIds.length > 0) {
              // Group by instance to minimize storage operations
              const updatesByInstance = new Map<string, { sourceId: string; instanceId: string; itemIds: string[] }>();
              
              updatedItemIds.forEach(itemId => {
                const itemInfo = currentItemsMap.get(itemId);
                if (itemInfo) {
                  const key = `${itemInfo.sourceId}-${itemInfo.instanceId}`;
                  if (!updatesByInstance.has(key)) {
                    updatesByInstance.set(key, { 
                      sourceId: itemInfo.sourceId, 
                      instanceId: itemInfo.instanceId, 
                      itemIds: [] 
                    });
                  }
                  updatesByInstance.get(key)!.itemIds.push(itemId);
                }
              });
              
              // Remove updated items from seen list for each instance
              updatesByInstance.forEach(({ sourceId, instanceId, itemIds }) => {
                const seenItems = loadSeenItems(sourceId, instanceId);
                itemIds.forEach(id => seenItems.delete(id));
                saveSeenItemsDirectly(sourceId, seenItems, instanceId);
              });
            }
            
            // Now mark items with isNew flag
            const markedItems = markNewItems(allItems);
            const newCount = countNewItems(markedItems);
            
            const hasChanges = newItemIds.size > 0 || removedItems.length > 0;
            
            // Only update the UI if auto-refresh is enabled
            if (settings.autoRefreshOnPoll) {
              setNewItemsCount(newCount);
              setLastRefreshTime(new Date());
              return markedItems;
            } else if (hasChanges) {
              // Only dispatch event if there are actual changes
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('inbox-data-available', {
                  detail: { timestamp: Date.now() }
                }));
                // Also trigger a refresh of the sidebar counts
                window.dispatchEvent(new CustomEvent('inbox-items-updated'));
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

  // Mark an item as unread
  const markAsUnread = useCallback((itemId: string) => {
    setGroupedItems((currentItems) => {
      // Find which instance this item belongs to
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
      
      // Remove from seen items
      if (itemSourceId && itemInstanceId) {
        const seenItems = loadSeenItems(itemSourceId, itemInstanceId);
        seenItems.delete(itemId);
        saveSeenItemsDirectly(itemSourceId, seenItems, itemInstanceId);
      }
      
      // Update UI to mark as new
      const updatedItems: GroupedInboxItems = {};
      Object.entries(currentItems).forEach(([key, group]) => {
        const updatedGroup = {
          ...group,
          items: group.items.map((item: InboxItem) => 
            item.id === itemId ? { ...item, isNew: true } : item
          ),
        };
        
        if (updatedGroup.repositories) {
          const updatedRepos: typeof updatedGroup.repositories = {};
          Object.entries(updatedGroup.repositories).forEach(([repoKey, repo]) => {
            updatedRepos[repoKey] = {
              ...repo,
              items: repo.items.map((item: InboxItem) =>
                item.id === itemId ? { ...item, isNew: true } : item
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
        markAsUnread,
        markAllAsRead,
        loadingProgress,
      })}
    </>
  );
}

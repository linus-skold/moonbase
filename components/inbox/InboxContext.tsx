"use client";

import React, { createContext, useContext, useMemo } from 'react';
import type { GroupedInboxItems, InboxItem } from '@/lib/schema/inbox.schema';

interface InboxContextValue {
  groupedItems: GroupedInboxItems;
  isLoading: boolean;
  error: string | null;
  refresh: (forceRefresh?: boolean) => Promise<void>;
  isConfigured: boolean;
  configUrl?: string;
  lastRefreshTime: Date | null;
  newItemsCount: number;
  markAsRead: (itemId: string) => void;
  markAsUnread: (itemId: string) => void;
  markAllAsRead: () => void;
  loadingProgress?: { current: number, total: number, stage: string };
  getFilteredItems: (instanceId?: string) => GroupedInboxItems;
  getFilteredNewItemsCount: (instanceId?: string) => number;
}

const InboxContext = createContext<InboxContextValue | undefined>(undefined);

export const useInbox = (instanceId?: string) => {
  const context = useContext(InboxContext);
  if (!context) {
    throw new Error('useInbox must be used within InboxContext');
  }
  
  // If no instanceId provided, return all data
  if (!instanceId) {
    return context;
  }
  
  // Filter data for specific instance and create instance-specific functions
  return useMemo(() => {
    const filteredItems = context.getFilteredItems(instanceId);
    
    // Create a markAllAsRead function that only marks items in this instance
    const markAllAsReadFiltered = () => {
      // Get all item IDs from the filtered items
      const itemIds: string[] = [];
      Object.values(filteredItems).forEach((group) => {
        itemIds.push(...group.items.map((item: InboxItem) => item.id));
        if (group.repositories) {
          Object.values(group.repositories).forEach((repo) => {
            itemIds.push(...repo.items.map((item: InboxItem) => item.id));
          });
        }
      });
      
      // Mark each item as read individually
      itemIds.forEach(itemId => context.markAsRead(itemId));
    };
    
    return {
      ...context,
      groupedItems: filteredItems,
      newItemsCount: context.getFilteredNewItemsCount(instanceId),
      markAllAsRead: markAllAsReadFiltered,
    };
  }, [context, instanceId]);
};

interface InboxContextProviderProps {
  children: React.ReactNode;
  value: InboxContextValue;
}

export const InboxContextProvider = ({ children, value }: InboxContextProviderProps) => {
  return (
    <InboxContext.Provider value={value}>
      {children}
    </InboxContext.Provider>
  );
};

// Keep old hook for backwards compatibility
export const useInboxContext = () => {
  return useContext(InboxContext);
};

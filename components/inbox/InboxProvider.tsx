"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { GroupedInboxItems } from "@/lib/schema/inbox.schema";

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
  }) => React.ReactNode;
  dataSources: InboxDataSource[];
  autoFetch?: boolean;
}

export function InboxProvider({
  children,
  dataSources,
  autoFetch = true,
}: InboxProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [groupedItems, setGroupedItems] = useState<GroupedInboxItems>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only run on client side
  useEffect(() => {
    setMounted(true);
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

        setGroupedItems(allItems);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch inbox items"
        );
        console.error("Error fetching inbox items:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [dataSources]
  );

  // Auto-fetch on mount and when data sources change (only on client)
  React.useEffect(() => {
    if (mounted && autoFetch && dataSources.length > 0) {
      refresh();
    }
  }, [mounted, autoFetch, dataSources, refresh]);

  // Check if at least one data source is configured (only on client)
  const configStatus = React.useMemo(() => {
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
      })}
    </>
  );
}

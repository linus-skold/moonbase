'use client';

import React, { useState , useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GroupedInboxView } from '@/components/GroupedInboxView';
import { InboxSearch } from '@/components/search/InboxSearch';
import {
  InboxFilters,
  sortItems,
  filterItems,
  getItemCounts,
  type SortOption,
  type FilterOption,
} from '@/components/InboxFilters';
import type { GroupedInboxItems, InboxItem } from '@/lib/schema/inbox.schema';
import { RefreshCw, Settings as SettingsIcon, Inbox } from 'lucide-react';

export interface InboxLayoutProps {
  title?: string;
  description?: string;
  groupedItems: GroupedInboxItems;
  isLoading: boolean;
  error?: string | null;
  onRefresh?: () => Promise<void> | void;
  settingsUrl?: string;
  lastRefreshTime?: Date | null;
  newItemsCount?: number;
  markAllAsRead?: () => void;
  markAsRead?: (itemId: string) => void;
  emptyStateConfig?: {
    icon?: React.ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    actionUrl?: string;
  };
}

export function InboxLayout({
  title = 'Inbox',
  description,
  groupedItems,
  isLoading,
  error,
  onRefresh,
  lastRefreshTime,
  newItemsCount = 0,
  markAllAsRead,
  markAsRead,
  emptyStateConfig,
}: InboxLayoutProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showNewDataBanner, setShowNewDataBanner] = useState(false);
  const [lastRefreshTriggered, setLastRefreshTriggered] = useState<number>(0);

  // Listen for new data available events
  useEffect(() => {
    const handleNewData = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventTime = customEvent.detail?.timestamp || Date.now();
      
      // Only show banner if the event is newer than the last manual refresh
      if (eventTime > lastRefreshTriggered) {
        setShowNewDataBanner(true);
      }
    };

    window.addEventListener('inbox-data-available', handleNewData);
    return () => {
      window.removeEventListener('inbox-data-available', handleNewData);
    };
  }, [lastRefreshTriggered]);

  const handleRefreshClick = async () => {
    setShowNewDataBanner(false);
    setLastRefreshTriggered(Date.now());
    if (onRefresh) {
      await onRefresh();
    }
  };

  const filteredItems = useMemo(() => {
    // Flatten all items from grouped structure
    const allItems: InboxItem[] = [];
    Object.values(groupedItems).forEach((group) => {
      allItems.push(...group.items);
    });

    // Apply text search filter
    let filtered = allItems;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.repository?.name.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    filtered = filterItems(filtered, filterBy);

    // Apply sorting
    filtered = sortItems(filtered, sortBy);

    // Re-group the filtered and sorted items
    const regrouped: GroupedInboxItems = {};
    filtered.forEach((item) => {
      const projectKey = `${item.project.name}`;
      if (!regrouped[projectKey]) {
        regrouped[projectKey] = {
          project: item.project,
          instance: item.instance,
          items: [],
        };
      }

      regrouped[projectKey].items.push(item);
    });

    return regrouped;
  }, [groupedItems, searchQuery, filterBy, sortBy]);

  // Get item counts for all items (before filtering)
  const allItems = useMemo(() => {
    const items: InboxItem[] = [];
    Object.values(groupedItems).forEach((group) => {
      items.push(...group.items);
    });
    return items;
  }, [groupedItems]);

  const itemCounts = useMemo(() => getItemCounts(allItems), [allItems]);

  const totalItems = Object.values(groupedItems).reduce(
    (sum, group) => sum + group.items.length,
    0
  );

  const hasNoItems = totalItems === 0 && !isLoading;
  const showEmptyState = hasNoItems && emptyStateConfig;

  return (
    <div className="container mx-auto p-6" suppressHydrationWarning>
      {showNewDataBanner && (
        <Card className="p-4 mb-4 bg-blue-500/10 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">New items are available</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRefreshClick}
                size="sm"
                variant="default"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh to see updates
              </Button>
              <Button
                onClick={() => setShowNewDataBanner(false)}
                size="sm"
                variant="ghost"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      )}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Inbox className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
              {!description && totalItems > 0 && (
                <p className="text-sm text-muted-foreground">
                  {totalItems} item{totalItems !== 1 ? 's' : ''} across{' '}
                  {Object.keys(groupedItems).length} project
                  {Object.keys(groupedItems).length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {newItemsCount > 0 && markAllAsRead && (
              <Button
                onClick={markAllAsRead}
                variant="secondary"
                size="sm"
              >
                Mark All as Read ({newItemsCount})
              </Button>
            )}
            {lastRefreshTime && (
              <span className="text-xs text-muted-foreground">
                Last updated: {lastRefreshTime.toLocaleTimeString()}
              </span>
            )}
            {onRefresh && (
              <Button
                onClick={onRefresh}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}

          </div>
        </div>

        {totalItems > 0 && (
          <>
            <div className="mb-4">
              <InboxSearch
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>

            <InboxFilters
              sortBy={sortBy}
              filterBy={filterBy}
              onSortChange={setSortBy}
              onFilterChange={setFilterBy}
              itemCounts={itemCounts}
            />
          </>
        )}
      </div>

      {error && (
        <Card className="p-4 mb-6 border-destructive">
          <div className="flex items-start gap-2">
            <span className="text-destructive font-medium">Error:</span>
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}

      {showEmptyState ? (
        <Card className="p-8">
          <div className="text-center">
            {emptyStateConfig.icon || <SettingsIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />}
            <h2 className="text-xl font-semibold mb-2">{emptyStateConfig.title}</h2>
            <p className="text-muted-foreground mb-4">
              {emptyStateConfig.description}
            </p>
            {emptyStateConfig.actionLabel && emptyStateConfig.actionUrl && (
              <Button asChild>
                <a href={emptyStateConfig.actionUrl}>{emptyStateConfig.actionLabel}</a>
              </Button>
            )}
          </div>
        </Card>
      ) : isLoading && totalItems === 0 ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <GroupedInboxView groupedItems={filteredItems} markAsRead={markAsRead} />
      )}
    </div>
  );
}

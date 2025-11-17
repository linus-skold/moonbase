'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { GroupedInboxView } from '@/app/components/GroupedInboxView';
import {
  InboxFilters,
  sortItems,
  filterItems,
  getItemCounts,
  type SortOption,
  type FilterOption,
} from '@/app/components/InboxFilters';
import type { GroupedInboxItems, InboxItem } from '@/lib/schema/inbox.schema';
import { RefreshCw, Settings as SettingsIcon, Inbox, Search } from 'lucide-react';

export interface InboxLayoutProps {
  title?: string;
  description?: string;
  groupedItems: GroupedInboxItems;
  isLoading: boolean;
  error?: string | null;
  onRefresh?: () => void;
  settingsUrl?: string;
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
  settingsUrl,
  emptyStateConfig,
}: InboxLayoutProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState<SortOption>('date-desc');
  const [filterBy, setFilterBy] = React.useState<FilterOption>('all');

  const filteredItems = React.useMemo(() => {
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
  const allItems = React.useMemo(() => {
    const items: InboxItem[] = [];
    Object.values(groupedItems).forEach((group) => {
      items.push(...group.items);
    });
    return items;
  }, [groupedItems]);

  const itemCounts = React.useMemo(() => getItemCounts(allItems), [allItems]);

  const totalItems = Object.values(groupedItems).reduce(
    (sum, group) => sum + group.items.length,
    0
  );

  const hasNoItems = totalItems === 0 && !isLoading;
  const showEmptyState = hasNoItems && emptyStateConfig;

  return (
    <div className="container mx-auto p-6" suppressHydrationWarning>
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
            {settingsUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={settingsUrl}>
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Settings
                </a>
              </Button>
            )}
          </div>
        </div>

        {totalItems > 0 && (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search inbox items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
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
        <GroupedInboxView groupedItems={filteredItems} />
      )}
    </div>
  );
}

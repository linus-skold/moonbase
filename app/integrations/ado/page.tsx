'use client';

import React from 'react';
import { GroupedInboxView } from '@/app/components/GroupedInboxView';
import {
  InboxFilters,
  sortItems,
  filterItems,
  getItemCounts,
  type SortOption,
  type FilterOption,
} from '@/app/components/InboxFilters';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AdoService } from '@/lib/ado/service';
import { loadConfig } from '@/lib/ado/storage';

import type { AdoConfig } from '@/lib/ado/schema/config.schema';
import type { GroupedInboxItems, InboxItem } from '@/lib/schema/inbox.schema';

import { RefreshCw, Settings, Inbox, Search } from 'lucide-react';


export default function AdoInboxPage() {
  const [groupedItems, setGroupedItems] = React.useState<GroupedInboxItems>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState<SortOption>('date-desc');
  const [filterBy, setFilterBy] = React.useState<FilterOption>('all');
  const [config, setConfig] = React.useState<AdoConfig | null>(null);

  // Load config from localStorage on mount
  React.useEffect(() => {
    const savedConfig = loadConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, []);

  const fetchInboxItems = React.useCallback(async () => {
    if (!config || config.instances.length === 0) {
      setError('No Azure DevOps instances configured');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const service = new AdoService(config);
      const items = await service.fetchAndGroupInboxItems();
      setGroupedItems(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inbox items');
      console.error('Error fetching inbox items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  // Auto-fetch on mount and config change
  React.useEffect(() => {
    if (config && config.instances.length > 0) {
      fetchInboxItems();
    }
  }, [config, fetchInboxItems]);

  const filteredItems = React.useMemo(() => {
    // First, flatten all items from grouped structure
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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Inbox className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">Azure DevOps Inbox</h1>
              <p className="text-sm text-muted-foreground">
                {totalItems} item{totalItems !== 1 ? 's' : ''} across{' '}
                {Object.keys(groupedItems).length} project
                {Object.keys(groupedItems).length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={fetchInboxItems}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/integrations/ado/settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </a>
            </Button>
          </div>
        </div>

        <div className="relative">
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
      </div>

      {error && (
        <Card className="p-4 mb-6 border-destructive">
          <div className="flex items-start gap-2">
            <span className="text-destructive font-medium">Error:</span>
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}

      {!config || config.instances.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Instances Configured</h2>
            <p className="text-muted-foreground mb-4">
              Add your Azure DevOps instances to start tracking your work items
            </p>
            <Button asChild>
              <a href="/integrations/ado/settings">Configure Azure DevOps</a>
            </Button>
          </div>
        </Card>
      ) : isLoading && Object.keys(groupedItems).length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <GroupedInboxView groupedItems={filteredItems} />
      )}
    </div>
  );
}

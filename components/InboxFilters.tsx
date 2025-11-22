'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import type { InboxItem } from '@/lib/schema/inbox.schema';
import {
  ArrowDownAZ,
  Calendar,
  Filter,
} from 'lucide-react';

export type SortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'priority';
export type FilterOption = 'all' | 'pullRequest' | 'workItem' | 'pipeline' | 'task';

interface InboxFiltersProps {
  sortBy: SortOption;
  filterBy: FilterOption;
  onSortChange: (sort: SortOption) => void;
  onFilterChange: (filter: FilterOption) => void;
  itemCounts: {
    all: number;
    pullRequest: number;
    workItem: number;
    pipeline: number;
    task: number;
  };
}

export function InboxFilters({
  sortBy,
  filterBy,
  onSortChange,
  onFilterChange,
  itemCounts,
}: InboxFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filter:</span>
      </div>

      <div className="flex gap-1">
        <Button
          variant={filterBy === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('all')}
        >
          All ({itemCounts.all})
        </Button>
        <Button
          variant={filterBy === 'pullRequest' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('pullRequest')}
        >
          PRs ({itemCounts.pullRequest})
        </Button>
        <Button
          variant={filterBy === 'workItem' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('workItem')}
        >
          Work Items ({itemCounts.workItem})
        </Button>
        <Button
          variant={filterBy === 'pipeline' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('pipeline')}
        >
          Pipelines ({itemCounts.pipeline})
        </Button>
        <Button
          variant={filterBy === 'task' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('task')}
        >
          Tasks ({itemCounts.task})
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="text-sm font-medium">Sort:</span>
        <div className="flex gap-1">
          <Button
            variant={sortBy === 'date-desc' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortChange('date-desc')}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Newest
          </Button>
          <Button
            variant={sortBy === 'date-asc' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortChange('date-asc')}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Oldest
          </Button>
          <Button
            variant={sortBy === 'title-asc' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortChange('title-asc')}
          >
            <ArrowDownAZ className="h-4 w-4" />
          </Button>
          <Button
            variant={sortBy === 'priority' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortChange('priority')}
          >
            Priority
          </Button>
        </div>
      </div>
    </div>
  );
}

export function sortItems(items: InboxItem[], sortBy: SortOption): InboxItem[] {
  const sorted = [...items];

  switch (sortBy) {
    case 'date-desc':
      return sorted.sort(
        (a, b) =>
          new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime()
      );
    case 'date-asc':
      return sorted.sort(
        (a, b) =>
          new Date(a.updatedDate).getTime() - new Date(b.updatedDate).getTime()
      );
    case 'title-asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'title-desc':
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case 'priority': {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return sorted.sort((a, b) => {
        const aPriority = priorityOrder[a.priority || 'low'];
        const bPriority = priorityOrder[b.priority || 'low'];
        return aPriority - bPriority;
      });
    }
    default:
      return sorted;
  }
}

export function filterItems(items: InboxItem[], filterBy: FilterOption): InboxItem[] {
  if (filterBy === 'all') return items;
  return items.filter((item) => item.type === filterBy);
}

export function getItemCounts(items: InboxItem[]) {
  return {
    all: items.length,
    pullRequest: items.filter((i) => i.type === 'pullRequest').length,
    workItem: items.filter((i) => i.type === 'workItem').length,
    pipeline: items.filter((i) => i.type === 'pipeline').length,
    task: items.filter((i) => i.type === 'task').length,
  };
}

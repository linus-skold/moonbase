import type { InboxItem } from "@/lib/schema/inbox.schema";

export type SortOption = "title-asc" | "title-desc" | "date-asc" | "date-desc" | "source-asc" | "source-desc";
export type FilterOption = "all" | "pullRequest" | "workItem" | "pipeline";


interface ParsedFilters {
  filters: Record<string, string[]>;
  textQuery: string;
}

export function parseSearchQuery(searchQuery: string): ParsedFilters {
  const filters: Record<string, string[]> = {};
  let textQuery = searchQuery;

  // Extract @filter:value patterns
  const filterRegex = /@(\w+):([^\s]+)/g;
  let match;
  while ((match = filterRegex.exec(searchQuery)) !== null) {
    const [fullMatch, filterType, filterValue] = match;
    if (!filters[filterType]) {
      filters[filterType] = [];
    }
    filters[filterType].push(filterValue.toLowerCase());
    textQuery = textQuery.replace(fullMatch, "").trim();
  }

  return { filters, textQuery };
}

function getItemValueForFilter(item: InboxItem, filterType: string): string | undefined {
  switch (filterType) {
    case "project":
      return item.project?.name;
    case "org":
      return item.instance?.name;
    case "repo":
      return item.repository?.name;
    case "status":
      return item.status;
    case "assignee":
      return item.assignedTo?.displayName;
    case "type":
      return item.type;
    default:
      return undefined;
  }
}

export function applyFilterSearch(
  items: InboxItem[],
  filters: Record<string, string[]>
): InboxItem[] {
  if (Object.keys(filters).length === 0) {
    return items;
  }

  return items.filter((item) => {
    return Object.entries(filters).every(([filterType, filterValues]) => {
      const itemValue = getItemValueForFilter(item, filterType);
      if (!itemValue) return false;
      return filterValues.some((fv) => itemValue.toLowerCase().includes(fv));
    });
  });
}

export function applyTextSearch(items: InboxItem[], textQuery: string): InboxItem[] {
  if (!textQuery.trim()) {
    return items;
  }

  const query = textQuery.toLowerCase();
  return items.filter(
    (item) =>
      item.title?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.repository?.name?.toLowerCase().includes(query)
  );
}

export function applyTypeFilter(items: InboxItem[], filterBy: FilterOption): InboxItem[] {
  if (filterBy === "all") {
    return items;
  }

  return items.filter((item) => item.type === filterBy);
}

export function groupItemsByProject(items: InboxItem[]): Record<string, any> {
  const grouped: Record<string, any> = {};

  items.forEach((item) => {
    const projectKey = item.project?.name || "Unknown Project";
    const itemTime = new Date(item.updatedDate || item.createdDate || 0).getTime();
    
    if (!grouped[projectKey]) {
      grouped[projectKey] = {
        project: item.project,
        instance: item.instance,
        items: [],
        latestUpdate: itemTime,
        oldestUpdate: itemTime,
      };
    } else {
      if (itemTime > grouped[projectKey].latestUpdate) {
        grouped[projectKey].latestUpdate = itemTime;
      }
      if (itemTime < grouped[projectKey].oldestUpdate) {
        grouped[projectKey].oldestUpdate = itemTime;
      }
    }
    grouped[projectKey].items.push(item);
  });

  return grouped;
}

export function sortGroupedProjects(
  grouped: Record<string, any>,
  sortBy: SortOption
): Record<string, any> {
  const entries = Object.entries(grouped);

  let sortedEntries: [string, any][];

  switch (sortBy) {
    case "title-asc":
      sortedEntries = entries.sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
      break;
    case "title-desc":
      sortedEntries = entries.sort(([keyA], [keyB]) => keyB.localeCompare(keyA));
      break;
    case "date-desc":
      sortedEntries = entries.sort(
        ([, a], [, b]) => b.latestUpdate - a.latestUpdate
      );
      break;
    case "date-asc":
      sortedEntries = entries.sort(
        ([, a], [, b]) => a.oldestUpdate - b.oldestUpdate
      );
      break;
    case "source-asc":
      sortedEntries = entries.sort(([, a], [, b]) => 
        (a.instance?.name || "").localeCompare(b.instance?.name || "")
      );
      break;
    case "source-desc":
      sortedEntries = entries.sort(([, a], [, b]) => 
        (b.instance?.name || "").localeCompare(a.instance?.name || "")
      );
      break;
    default:
      sortedEntries = entries;
  }

  // Also sort items within each project
  sortedEntries.forEach(([, group]) => {
    group.items.sort((a: InboxItem, b: InboxItem) => {
      if (sortBy === "date-desc") {
        const aTime = new Date(a.updatedDate || a.createdDate || 0).getTime();
        const bTime = new Date(b.updatedDate || b.createdDate || 0).getTime();
        return bTime - aTime;
      } else if (sortBy === "date-asc") {
        const aTime = new Date(a.updatedDate || a.createdDate || 0).getTime();
        const bTime = new Date(b.updatedDate || b.createdDate || 0).getTime();
        return aTime - bTime;
      } else if (sortBy === "title-asc") {
        return (a.title || "").localeCompare(b.title || "");
      } else if (sortBy === "title-desc") {
        return (b.title || "").localeCompare(a.title || "");
      }
      return 0;
    });
  });

  const sortedGrouped: Record<string, any> = {};
  sortedEntries.forEach(([key, value]) => {
    sortedGrouped[key] = value;
  });

  return sortedGrouped;
}

export function processInboxItems(
  items: InboxItem[],
  searchQuery: string,
  filterBy: FilterOption,
  sortBy: SortOption
): Record<string, any> {
  const { filters, textQuery } = parseSearchQuery(searchQuery);

  let filteredItems = items;
  filteredItems = applyFilterSearch(filteredItems, filters);
  filteredItems = applyTextSearch(filteredItems, textQuery);
  filteredItems = applyTypeFilter(filteredItems, filterBy);

  const grouped = groupItemsByProject(filteredItems);

  return sortGroupedProjects(grouped, sortBy);
}

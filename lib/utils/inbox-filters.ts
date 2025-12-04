import next from "next";
import type { TypedItem } from "../schema/item.schema";
import { Project } from "../schema/project.schema";

export type SortOption =
  | "title-asc"
  | "title-desc"
  | "date-asc"
  | "date-desc"
  | "source-asc"
  | "source-desc";
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

function getItemValueForFilter(
  item: TypedItem,
  filterType: string
): string | undefined {
  switch (filterType) {
    case "project":
      return item.repository;
    case "org":
      return ""; // Placeholder, adjust with item property if available
    case "status":
      return item.status;
    case "type":
      return item.type;
    default:
      return undefined;
  }
}

export function applyFilterSearch(
  items: TypedItem[],
  filters: Record<string, string[]>
): TypedItem[] {
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

export function applyTextSearch(
  items: TypedItem[],
  textQuery: string
): TypedItem[] {
  if (!textQuery.trim()) {
    return items;
  }

  const query = textQuery.toLowerCase();
  return items.filter(
    (item) =>
      item.title?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.repository?.toLowerCase().includes(query)
  );
}

export function applyTypeFilter(
  items: TypedItem[],
  filterBy: FilterOption
): TypedItem[] {
  if (filterBy === "all") {
    return items;
  }

  return items.filter((item) => item.type === filterBy);
}

export function groupItemsByProject(items: TypedItem[]) {
  const grouped = items.reduce(
    (prev: Record<string, Project>, next: TypedItem) => {
      const projectKey = next.repository || "Unknown Project";
      if (!prev[projectKey]) {
        prev[projectKey] = {
          project: next.repository,
          organization: next.organization,
          items: [],
          latestUpdate: 0,
          createdDate: 0,
          url: "",
          id: "",
          name: "",
          description: "",
        };
      }

      const groups = prev[projectKey];
      groups.items.push(next);

      if(next.updateTimestamp) {
        const itemTime = new Date(next.updateTimestamp).getTime();
        if (itemTime > groups.latestUpdate!) {
          groups.latestUpdate = itemTime;
        }
      }

      return prev;
    },
    {}
  );

  return grouped;
}

export function sortGroupedProjects(
  grouped: Record<string, Project>,
  sortBy: SortOption
): Record<string, Project> {
  const entries = Object.entries(grouped);

  let sortedEntries: [string, any][];

  switch (sortBy) {
    case "title-asc":
      sortedEntries = entries.sort(([keyA], [keyB]) =>
        keyA.localeCompare(keyB)
      );
      break;
    case "title-desc":
      sortedEntries = entries.sort(([keyA], [keyB]) =>
        keyB.localeCompare(keyA)
      );
      break;
    case "date-desc":
      sortedEntries = entries.sort(
        ([, a], [, b]) => b.latestUpdate! - a.latestUpdate!
      );
      break;
    case "date-asc":
      sortedEntries = entries.sort(
        ([, a], [, b]) => a.createdDate! - b.createdDate!
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
    group.items.sort((a: TypedItem, b: TypedItem) => {
      if (sortBy === "date-desc") {
        const aTime = new Date(
          a.updateTimestamp || a.createdTimestamp || 0
        ).getTime();
        const bTime = new Date(
          b.updateTimestamp || b.createdTimestamp || 0
        ).getTime();
        return bTime - aTime;
      } else if (sortBy === "date-asc") {
        const aTime = new Date(
          a.updateTimestamp || a.createdTimestamp || 0
        ).getTime();
        const bTime = new Date(
          b.updateTimestamp || b.createdTimestamp || 0
        ).getTime();
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

export function processTypedItems(
  items: TypedItem[],
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

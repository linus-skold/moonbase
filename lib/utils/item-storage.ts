import type { TypedItem, WorkItem, PullRequest, Pipeline } from "@/lib/schema/item.schema";

const STORAGE_KEY_PREFIX = "items-";

const getStorageKey = (instanceId: string): string => 
  `${STORAGE_KEY_PREFIX}${instanceId}`;

export interface StoredItems {
  workItems: WorkItem[];
  pullRequests: PullRequest[];
  pipelines: Pipeline[];
  timestamp: number;
}

/**
 * Load items for a specific instance from localStorage
 */
export const loadItems = (instanceId: string): StoredItems | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const key = getStorageKey(instanceId);
    const stored = localStorage.getItem(key);

    if (!stored) {
      return null;
    }

    const data = JSON.parse(stored);
    return data;
  } catch (error) {
    console.error("Failed to load items:", error);
    return null;
  }
};

/**
 * Save items for a specific instance to localStorage
 */
export const saveItems = (
  instanceId: string,
  items: {
    workItems: WorkItem[];
    pullRequests: PullRequest[];
    pipelines: Pipeline[];
  }
): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const key = getStorageKey(instanceId);
    const data: StoredItems = {
      ...items,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save items:", error);
  }
};

/**
 * Clear items for a specific instance
 */
export const clearItems = (instanceId: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const key = getStorageKey(instanceId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear items:", error);
  }
};

/**
 * Check if an item has been updated by comparing timestamps
 */
export const hasItemChanged = (oldItem: TypedItem, newItem: TypedItem): boolean => {
  return newItem.updateTimestamp > oldItem.updateTimestamp;
};

/**
 * Merge new items with cached items, detecting changes and updating unread state
 * - New items: marked as unread
 * - Existing unchanged items: keep their unread state
 * - Existing changed items: mark as unread if they were previously read
 */
export const mergeItemsWithChangeDetection = <T extends TypedItem>(
  cachedItems: T[],
  newItems: T[]
): { items: T[]; hasChanges: boolean; newCount: number; updatedCount: number } => {
  const cachedItemsMap = new Map(cachedItems.map(item => [item.id, item]));
  let hasChanges = false;
  let newCount = 0;
  let updatedCount = 0;

  const mergedItems = newItems.map(newItem => {
    const cachedItem = cachedItemsMap.get(newItem.id);

    if (!cachedItem) {
      // New item - mark as unread
      newCount++;
      hasChanges = true;
      return { ...newItem, unread: true };
    }

    // Check if item was updated
    if (hasItemChanged(cachedItem, newItem)) {
      updatedCount++;
      hasChanges = true;
      // If item was READ (unread: false) before and now updated, mark as unread again
      const wasRead = cachedItem.unread === false;
      return {
        ...newItem,
        prevUpdateTimestamp: cachedItem.updateTimestamp,
        unread: wasRead ? true : cachedItem.unread,
      };
    }

    // Item unchanged - preserve unread state
    return {
      ...newItem,
      unread: cachedItem.unread,
      prevUpdateTimestamp: cachedItem.prevUpdateTimestamp,
    };
  });

  return { items: mergedItems, hasChanges, newCount, updatedCount };
};

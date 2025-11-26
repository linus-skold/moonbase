const STORAGE_KEY_PREFIX = "new-items-";
const getStorageKey = (sourceId: string, instanceId?: string): string =>
  instanceId
    ? `${STORAGE_KEY_PREFIX}${sourceId}-${instanceId}`
    : `${STORAGE_KEY_PREFIX}${sourceId}`;

export const loadSeenItems = (
  sourceId: string,
  instanceId?: string
): Set<string> => {
  if (typeof window === "undefined") {
    return new Set();
  }

  try {
    const key = getStorageKey(sourceId, instanceId);
    const stored = localStorage.getItem(key);

    if (!stored) {
      return new Set();
    }

    const data: { seenItemIds: string[]; timestamp: number } =
      JSON.parse(stored);
    return new Set(data.seenItemIds);
  } catch (error) {
    console.error("Failed to load seen items:", error);
    return new Set();
  }
};

const saveSeenItems = (
  sourceId: string,
  seenItemIds: Set<string>,
  instanceId?: string
): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const key = getStorageKey(sourceId, instanceId);
    const data = {
      seenItemIds: Array.from(seenItemIds),
      timestamp: Date.now(),
    };

    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save seen items:", error);
  }
};

export const markItemsAsSeen = (
  itemIds: string[],
  sourceId: string,
  instanceId?: string
): void => {
  const seenItems = loadSeenItems(sourceId, instanceId);
  itemIds.forEach((id) => seenItems.add(id));
  saveSeenItems(sourceId, seenItems, instanceId);
};

export const getNewItemsCount = (
  itemIds: string[],
  sourceId: string,
  instanceId?: string
): number => {
  const seenItems = loadSeenItems(sourceId, instanceId);
  return itemIds.filter((id) => !seenItems.has(id)).length;
};

export const clearSeenItems = (
  sourceId: string,
  instanceId?: string
): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const key = getStorageKey(sourceId, instanceId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear seen items:", error);
  }
};

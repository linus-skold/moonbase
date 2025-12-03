const STORAGE_KEY_PREFIX = "unread-state-";

const getStorageKey = (instanceId: string): string => 
  `${STORAGE_KEY_PREFIX}${instanceId}`;

export interface UnreadState {
  [itemId: string]: boolean;
}

export const loadUnreadState = (instanceId: string): UnreadState => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const key = getStorageKey(instanceId);
    const stored = localStorage.getItem(key);

    if (!stored) {
      return {};
    }

    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to load unread state:", error);
    return {};
  }
};

export const saveUnreadState = (instanceId: string, state: UnreadState): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const key = getStorageKey(instanceId);
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save unread state:", error);
  }
};

export const updateItemUnreadState = (
  instanceId: string,
  itemId: string,
  unread: boolean
): void => {
  const state = loadUnreadState(instanceId);
  state[itemId] = unread;
  saveUnreadState(instanceId, state);
};

export const clearUnreadState = (instanceId: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const key = getStorageKey(instanceId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear unread state:", error);
  }
};

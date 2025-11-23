import type { GroupedInboxItems } from '@/lib/schema/inbox.schema';

interface CachedData {
  data: GroupedInboxItems;
  timestamp: number;
  instanceId?: string;
}

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour in milliseconds


const getCacheKey = (sourceId: string, instanceId?: string): string  => instanceId ? `inbox-cache-${sourceId}-${instanceId}` : `inbox-cache-${sourceId}`;
  
const getRemainingTime = (sourceId: string, instanceId?: string): number | null => {
    if (typeof window === 'undefined') return null;

    try {
      const cacheKey = getCacheKey(sourceId, instanceId);
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;
      const cachedData: CachedData = JSON.parse(cached);
      const remaining = calculateTime(cachedData.timestamp);
      return remaining > 0 ? remaining : 0;
    } catch (error) {
      console.error('Failed to get remaining cache time:', error);
      return null;
    }
  }

const calculateTime = (timestamp: number) => {
      const elapsed = Date.now() - timestamp;
      const remaining = CACHE_DURATION_MS - elapsed;
      return remaining;
}


const getCachedItems = (sourceId: string, instanceId?: string): GroupedInboxItems | null => {
 if (typeof window === 'undefined') 
      return null;

    try {
      const cacheKey = getCacheKey(sourceId, instanceId);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }

      const cachedData: CachedData = JSON.parse(cached);
      
      // Check if cache is expired
      if (calculateTime(cachedData.timestamp) > CACHE_DURATION_MS) {
        // Clean up expired cache
        localStorage.removeItem(cacheKey);
        return null;
      }
      return cachedData.data;
    } catch (error) {
      console.error('Failed to read from inbox cache:', error);
      return null;
    }
};

const setCachedItems = (sourceId: string, data: GroupedInboxItems, instanceId?: string): boolean => {
  if (typeof window === 'undefined') 
      return false;

    try {
      const cacheKey = getCacheKey(sourceId, instanceId);
      const cachedData: CachedData = {
        data,
        timestamp: Date.now(),
        instanceId,
      };

      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
      return true;
    } catch (error) {
      console.error('Failed to write to inbox cache:', error);
      return false;
    }
};

const clearCachedItems = (sourceId: string, instanceId?: string): boolean => {
  if (typeof window === 'undefined') 
      return false;

  try {
      const cacheKey = getCacheKey(sourceId, instanceId);
      localStorage.removeItem(cacheKey);
      return true;
    } catch (error) {
      console.error('Failed to clear inbox cache:', error);
      return false;
    }
};



export default {
  getCachedItems,
  setCachedItems,
  clearCachedItems,
  getRemainingTime,
};
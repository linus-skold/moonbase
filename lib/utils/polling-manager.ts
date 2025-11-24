

export interface PollableDataSource {
  id: string;
  poll: () => Promise<void>;
}

export interface PollingConfig {
  minInterval?: number;
  staggerDelay?: number;
}

export interface PollingManager {
  registerSource: (source: PollableDataSource) => void;
  unregisterSource: (sourceId: string) => void;
  startPolling: () => void;
}

const DEFAULT_MIN_INTERVAL = 5 * 60 * 1000; // 10 seconds
const DEFAULT_STAGGER_DELAY = 30 * 1000; // 30 seconds

function createPollingManager(config: PollingConfig = {}): PollingManager {
  const sources = new Map<string, PollableDataSource>();
  const intervals = new Map<string, NodeJS.Timeout>();
  const lastPollTimes = new Map<string, number>();
  let isActive = false;

  const resolvedConfig = {
    minInterval: config.minInterval ?? DEFAULT_MIN_INTERVAL,
    staggerDelay: config.staggerDelay ?? DEFAULT_STAGGER_DELAY,
  };

  const pollSource = async (source: PollableDataSource): Promise<void> => {
    try {
      lastPollTimes.set(source.id, Date.now());
      await source.poll();
      console.log(`Polled ${source.id} at ${new Date().toISOString()}`);
    } catch (error) {
      console.error(`Error polling ${source.id}:`, error);
    }
  };

  const stopPollingForSource = (sourceId: string): void => {
    const interval = intervals.get(sourceId);
    if (interval) {
      clearInterval(interval);
      intervals.delete(sourceId);
    }
  };

  const startPollingForSource = (sourceId: string): void => {
    const source = sources.get(sourceId);
    if (!source) {
      return;
    }

    // Clear any existing interval
    stopPollingForSource(sourceId);

    // Poll immediately
    pollSource(source);

    // Set up recurring poll
    const interval = setInterval(() => {
      if (isActive) {
        pollSource(source);
      }
    }, resolvedConfig.minInterval);

    intervals.set(sourceId, interval);
  };

  const registerSource = (source: PollableDataSource): void => {
    sources.set(source.id, source);
    
    // If polling is already active, start polling for this new source
    if (isActive) {
      startPollingForSource(source.id);
    }
  };

  const unregisterSource = (sourceId: string): void => {
    stopPollingForSource(sourceId);
    sources.delete(sourceId);
    lastPollTimes.delete(sourceId);
  };

  const startPolling = (): void => {
    if (isActive) {
      return; // Already polling
    }

    isActive = true;
    
    // Start polling for each source with staggered delays
    let delayOffset = 0;
    for (const sourceId of sources.keys()) {
      setTimeout(() => {
        if (isActive) {
          startPollingForSource(sourceId);
        }
      }, delayOffset);
      
      delayOffset += resolvedConfig.staggerDelay;
    }
  };

  return {
    registerSource,
    unregisterSource,
    startPolling,
  };
}

// Singleton instance for app-wide polling
let pollingManagerInstance: PollingManager | null = null;

export function getPollingManager(config?: PollingConfig): PollingManager {
  if (!pollingManagerInstance) {
    pollingManagerInstance = createPollingManager(config);
  }
  return pollingManagerInstance;
}

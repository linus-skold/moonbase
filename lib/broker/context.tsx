"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createBroker } from './broker';
import { migrateOldStorage } from '@/lib/utils/migration';

type InboxBroker = ReturnType<typeof createBroker>;

const BrokerContext = createContext<InboxBroker | undefined>(undefined);

export function useBroker() {
  const context = useContext(BrokerContext);
  
  // During SSR or before mount, return a safe empty broker
  if (!context) {
    // Return a no-op broker for SSR
    return {
      getInstances: () => [],
      getInstance: () => null,
      fetchAllItems: async () => [],
      fetchItemsForInstance: async () => [],
      fetchWorkItems: async () => [],
      fetchPullRequests: async () => [],
      fetchPipelines: async () => [],
      isConfigured: () => false,
      getAllItems: async () => [],
      getWorkItems: async () => [],
      getPullRequests: async () => [],
      getPipelines: async () => [],
      getExchange: () => null,
      getAllExchanges: () => [],
    };
  }
  
  return context;
}

interface BrokerProviderProps {
  children: React.ReactNode;
}

export function BrokerProvider({ children }: BrokerProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [broker] = useState<InboxBroker | null>(() => {
    // Only create broker on client side
    if (typeof window !== 'undefined') {
      return createBroker();
    }
    return null;
  });
  
  useEffect(() => {
    // Run migration before anything else
    migrateOldStorage();
    setMounted(true);
  }, []);
  
  // Server-side: render children without broker (it won't work anyway)
  // Client-side: wait until mounted to avoid hydration issues
  if (!mounted || !broker) {
    return <>{children}</>;
  }
  
  return (
    <BrokerContext.Provider value={broker}>
      {children}
    </BrokerContext.Provider>
  );
}

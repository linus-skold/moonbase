'use client';

import React from 'react';
import type { AdoInstance } from '@/lib/ado/schema/instance.schema';
import type { GhInstance } from '@/lib/gh/schema/instance.schema';

type IntegrationInstance = AdoInstance | GhInstance;

interface InstanceContextValue {
  instance: IntegrationInstance | null;
}

const InstanceContext = React.createContext<InstanceContextValue | undefined>(undefined);

export function InstanceProvider({ 
  instance, 
  children 
}: { 
  instance: IntegrationInstance | null;
  children: React.ReactNode;
}) {
  return (
    <InstanceContext.Provider value={{ instance }}>
      {children}
    </InstanceContext.Provider>
  );
}

export function useInstance() {
  const context = React.useContext(InstanceContext);
  if (context === undefined) {
    throw new Error('useInstance must be used within an InstanceProvider');
  }
  return context.instance;
}

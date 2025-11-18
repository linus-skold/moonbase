'use client';

import React from 'react';
import type { AdoInstance } from '@/lib/ado/schema/instance.schema';

interface InstanceContextValue {
  instance: AdoInstance | null;
}

const InstanceContext = React.createContext<InstanceContextValue | undefined>(undefined);

export function InstanceProvider({ 
  instance, 
  children 
}: { 
  instance: AdoInstance | null;
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

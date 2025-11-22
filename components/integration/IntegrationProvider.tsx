'use client';
import React, { createContext, useContext, useMemo, ReactNode, useRef } from 'react';

import { z } from 'zod';

const ReactComponent = z.custom<React.ComponentType<any>>(type => typeof type === 'function' || type === undefined, { message: "Must be a React component" });

export const IntegrationSchema = z.object({ 
  id: z.string(),
  name: z.string(),
  description: z.string(),
  disabled: z.boolean().optional(),
  alternatives: z.array(z.string()),
  icon: ReactComponent,
  addIntegrationComponent: ReactComponent,
  manageIntegrationComponent: ReactComponent,

});

export type Integration = z.infer<typeof IntegrationSchema>;

interface IntegrationContextValue {
  integrations: Integration[];
  registerIntegration: (integration: Integration) => void;
}

const IntegrationContext = createContext<IntegrationContextValue | undefined>(undefined);

interface IntegrationProviderProps {
  children: ReactNode;
  initialIntegrations?: Integration[];
}

export function IntegrationProvider({ children, initialIntegrations = [] }: IntegrationProviderProps) {
  // Use a ref to persist the registry across renders
  const integrationRegistry = useRef<Integration[]>([...initialIntegrations]);

  const registerIntegration = (integration: Integration) => {
    if (!integrationRegistry.current.find(i => i.id === integration.id)) {
      integrationRegistry.current.push(integration);
    }
  };

  const value = useMemo(() => ({
    integrations: integrationRegistry.current,
    registerIntegration,
  }), []);

  return (
    <IntegrationContext.Provider value={value}>
      {children}
    </IntegrationContext.Provider>
  );
}

export function useIntegrations() {
  const ctx = useContext(IntegrationContext);
  if (!ctx) throw new Error('useIntegrations must be used within an IntegrationProvider');
  return ctx.integrations;
}

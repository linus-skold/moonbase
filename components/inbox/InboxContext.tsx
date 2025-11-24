"use client";

import React, { createContext, useContext } from 'react';

interface InboxContextValue {
  markAsRead: (itemId: string) => void;
}

const InboxContext = createContext<InboxContextValue | undefined>(undefined);

export const InboxContextProvider = ({ 
  children, 
  markAsRead 
}: { 
  children: React.ReactNode;
  markAsRead: (itemId: string) => void;
}) => {
  return (
    <InboxContext.Provider value={{ markAsRead }}>
      {children}
    </InboxContext.Provider>
  );
}

export const useInboxContext = () => {
  return useContext(InboxContext);
}

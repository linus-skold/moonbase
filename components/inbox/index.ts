// Main inbox view component
export { InboxView } from './InboxView';
export type { InboxViewProps } from './InboxView';

// Legacy exports - deprecated, use broker instead
// These are kept for backward compatibility but should not be used in new code
export { InboxProvider } from './InboxProvider';
export { GlobalInboxProvider } from './GlobalInboxProvider';
export { useInbox } from './InboxContext';
export type { InboxProviderProps, InboxDataSource } from './InboxProvider';

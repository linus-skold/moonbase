import { z } from 'zod';
import { AdoInstance } from '../ado/schema/instance.schema';


export const InboxItemTypeSchema = z.enum(['pullRequest', 'workItem', 'pipeline', 'task']);
export type InboxItemType = z.infer<typeof InboxItemTypeSchema>;

export const InboxItemSchema = z.object({
  id: z.string(),
  type: InboxItemTypeSchema,
  title: z.string(),
  description: z.string().optional(),
  status: z.string(),
  createdDate: z.string(),
  updatedDate: z.string(),
  url: z.string(),
  project: z.object({
    id: z.string(),
    name: z.string(),
  }),
  repository: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
  instance: AdoInstance,
  metadata: z.record(z.string(), z.any()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignedTo: z.object({
    displayName: z.string(),
    imageUrl: z.string().optional(),
  }).optional(),
});
export type InboxItem = z.infer<typeof InboxItemSchema>;

export const GroupedInboxItemsSchema = z.record(
  z.string(),
  z.object({
    project: z.object({
      id: z.string(),
      name: z.string(),
    }),
    instance: AdoInstance,
    items: z.array(InboxItemSchema),
    repositories: z.record(
      z.string(),
      z.object({
        repository: z.object({
          id: z.string(),
          name: z.string(),
        }),
        items: z.array(InboxItemSchema),
      })
    ).optional(),
  })
);
export type GroupedInboxItems = z.infer<typeof GroupedInboxItemsSchema>;

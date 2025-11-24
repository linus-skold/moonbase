import { z } from 'zod';
import { AdoInstanceSchema } from '../ado/schema/instance.schema';
import { GhInstanceSchema } from '../gh/schema/instance.schema';
import { WorkItemKindSchema } from './workItemKind.schema';


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
  instance: z.union([AdoInstanceSchema, GhInstanceSchema]),
  metadata: z.record(z.string(), z.any()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignedTo: z.object({
    displayName: z.string(),
    imageUrl: z.string().optional(),
  }).optional(),
  workItemKind: WorkItemKindSchema.optional(),
  isNew: z.boolean().optional().default(false),
});
export type InboxItem = z.infer<typeof InboxItemSchema>;

export const GroupedInboxItemsSchema = z.record(
  z.string(),
  z.object({
    project: z.object({
      id: z.string(),
      name: z.string(),
    }),
    instance: z.union([AdoInstanceSchema, GhInstanceSchema]),
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

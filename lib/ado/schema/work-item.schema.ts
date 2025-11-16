import { z } from 'zod';

export const AdoWorkItemSchema = z.object({
  id: z.number(),
  rev: z.number(),
  fields: z.object({
    'System.Title': z.string(),
    'System.State': z.string(),
    'System.WorkItemType': z.string(),
    'System.AssignedTo': z.object({
      displayName: z.string(),
      imageUrl: z.string().optional(),
    }).optional(),
    'System.CreatedDate': z.string(),
    'System.ChangedDate': z.string(),
    'System.CreatedBy': z.object({
      displayName: z.string(),
    }).optional(),
    'System.AreaPath': z.string().optional(),
    'System.IterationPath': z.string().optional(),
    'System.Description': z.string().optional(),
  }),
  url: z.string(),
  _links: z.object({
    html: z.object({
      href: z.string().optional(),
    }).optional(),
  }).optional(),
});
export type AdoWorkItem = z.infer<typeof AdoWorkItemSchema>;

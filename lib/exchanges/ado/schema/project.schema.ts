import { z } from 'zod';

export const AdoProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  url: z.string(),
  state: z.enum(['wellFormed', 'createPending', 'deleting', 'new', 'all']),
  visibility: z.enum(['private', 'public']),
});
export type AdoProject = z.infer<typeof AdoProjectSchema>;


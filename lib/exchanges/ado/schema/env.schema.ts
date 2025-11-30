import { z } from 'zod';

export const AdoEnvironment = z.object({
  id: z.string(),
  instanceId: z.string(),
  name: z.string(),
  projectId: z.string().optional(),
  enabled: z.boolean(),
});
export type AdoEnvironment = z.infer<typeof AdoEnvironment>;
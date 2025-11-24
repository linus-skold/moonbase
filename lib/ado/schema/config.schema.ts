import { z } from 'zod';

import { AdoInstanceSchema } from './instance.schema';
import { AdoEnvironment } from './env.schema';

export const AdoConfig = z.object({
  instances: z.array(AdoInstanceSchema),
  environments: z.array(AdoEnvironment),
  pinnedProjects: z.array(z.string()).optional(),
  userEmail: z.string().optional(),
});
export type AdoConfig = z.infer<typeof AdoConfig>;
import { z } from 'zod';
import { GhInstance } from './instance.schema';

export const GhConfig = z.object({
  instances: z.array(GhInstance),
  environments: z.array(z.string()).optional(),
  pinnedRepositories: z.array(z.string()).optional(), // Array of "owner/repo" strings
});

export type GhConfig = z.infer<typeof GhConfig>;

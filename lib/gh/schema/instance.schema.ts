import { z } from 'zod';
import { StatusMapping } from '../../schema/statusMapping.schema';

export const GhInstance = z.object({
  id: z.string(),
  name: z.string(),
  personalAccessToken: z.string(),
  enabled: z.boolean(),
  username: z.string(),
  statusMappings: StatusMapping.array().optional(),
  expiresAt: z.date(),
});

export type GhInstance = z.infer<typeof GhInstance>;

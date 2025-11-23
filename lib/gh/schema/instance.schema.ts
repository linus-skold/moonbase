import { z } from 'zod';
import { StatusMapping } from '../../schema/statusMapping.schema';

export const GhInstance = z.object({
  instanceType: z.literal('gh').default('gh'),
  id: z.string(),
  name: z.string(),
  personalAccessToken: z.string(),
  enabled: z.boolean(),
  username: z.string(),
  statusMappings: StatusMapping.array().optional(),
  expiresAt: z.coerce.date(),
});

export type GhInstance = z.infer<typeof GhInstance>;

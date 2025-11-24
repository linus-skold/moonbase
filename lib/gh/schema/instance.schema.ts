import { z } from 'zod';
import { StatusMapping } from '../../schema/statusMapping.schema';

export const GhInstanceSchema = z.object({
  instanceType: z.literal('gh').default('gh'),
  id: z.string(),
  name: z.string(),
  personalAccessToken: z.string(),
  enabled: z.boolean(),
  username: z.string(),
  statusMappings: StatusMapping.array().optional(),
  expiresAt: z.coerce.date(),
});

export type GhInstance = z.infer<typeof GhInstanceSchema>;

export const GhConfigSchema = z.object({
  instances: GhInstanceSchema.array(),
});
export type GhConfig = z.infer<typeof GhConfigSchema>;


export const GhInstanceArraySchema = z.array(GhInstanceSchema);
export type GhInstanceArray = z.infer<typeof GhInstanceArraySchema>;
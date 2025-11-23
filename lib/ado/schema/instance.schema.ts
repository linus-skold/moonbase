import { z } from 'zod';
import { StatusMapping } from '../../schema/statusMapping.schema';

export const AdoInstance = z.object({
  instanceType: z.literal('ado').default('ado'),
  id: z.string(),
  name: z.string(),
  organization: z.string().optional(),
  baseUrl: z.url().optional(),
  personalAccessToken: z.string(),
  enabled: z.boolean(),
  userId: z.string(),
  statusMappings: StatusMapping.array().optional(),
  expiresAt: z.coerce.date(),
});
export type AdoInstance = z.infer<typeof AdoInstance>;
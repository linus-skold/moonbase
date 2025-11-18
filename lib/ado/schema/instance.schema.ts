import { z } from 'zod';
import { StatusMapping } from '../../schema/statusMapping.schema.js';

export const AdoInstance = z.object({
  id: z.string(),
  name: z.string(),
  organization: z.string(),
  baseUrl: z.url(),
  personalAccessToken: z.string(),
  enabled: z.boolean(),
  userId: z.string(),
  statusMappings: StatusMapping.array().optional(),
});
export type AdoInstance = z.infer<typeof AdoInstance>;
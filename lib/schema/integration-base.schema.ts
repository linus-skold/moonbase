import { z } from 'zod';
import { StatusMapping } from './statusMapping.schema';

export const IntegrationConfigSchema = z.object({
  instanceType: z.string(),
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  personalAccessToken: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
  statusMappings: StatusMapping.array().optional(),
});

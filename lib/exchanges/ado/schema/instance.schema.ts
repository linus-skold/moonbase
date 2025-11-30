import { z } from 'zod';
import { StatusMapping } from '../../../schema/statusMapping.schema';

export const AdoInstanceSchema = z.object({
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
  ignoredWorkItemStates: z.array(z.string()).optional(),
  customWorkItemQuery: z.string().optional(),
});
export type AdoInstance = z.infer<typeof AdoInstanceSchema>;

export const AdoConfigSchema = z.object({
  instances: AdoInstanceSchema.array(),
});
export type AdoConfig = z.infer<typeof AdoConfigSchema>;

export const AdoInstanceArraySchema = z.array(AdoInstanceSchema);
export type AdoInstanceArray = z.infer<typeof AdoInstanceArraySchema>;

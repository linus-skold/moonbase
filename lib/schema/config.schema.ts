import { z } from 'zod';
import { StatusMapping } from './statusMapping.schema';
import { AdoIntegrationConfigSchema } from '../exchanges/ado/schema/config.schema';
import { GhIntegrationConfigSchema } from '../exchanges/gh/schema/config.schema';


export const IntegrationConfigSchema = z.object({
  instanceType: z.string(),
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  personalAccessToken: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
  statusMappings: StatusMapping.array().optional(),
});




export const IntegrationInstanceSchema = z.discriminatedUnion('instanceType', [
  AdoIntegrationConfigSchema,
  GhIntegrationConfigSchema,
]);

export const IntegrationsConfigSchema = z.object({
  instances: z.record(z.string(), IntegrationInstanceSchema),
});

export type IntegrationInstance = z.infer<typeof IntegrationInstanceSchema>;
export type IntegrationsConfig = z.infer<typeof IntegrationsConfigSchema>;
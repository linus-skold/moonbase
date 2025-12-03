import { z } from 'zod';
import { AdoIntegrationConfigSchema } from '../exchanges/ado/schema/config.schema';
import { GhIntegrationConfigSchema } from '../exchanges/gh/schema/config.schema';



export const IntegrationInstanceSchema = z.discriminatedUnion('instanceType', [
  AdoIntegrationConfigSchema,
  GhIntegrationConfigSchema,
]);

export const IntegrationsConfigSchema = z.object({
  instances: z.record(z.string(), IntegrationInstanceSchema),
});

export type IntegrationInstance = z.infer<typeof IntegrationInstanceSchema>;
export type IntegrationsConfig = z.infer<typeof IntegrationsConfigSchema>;
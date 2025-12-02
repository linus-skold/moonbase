import { z } from "zod";
import { IntegrationConfigSchema } from "@/lib/schema/config.schema";

export const AdoIntegrationConfigSchema = IntegrationConfigSchema.extend({
  instanceType: z.literal("ado").default("ado"),
  baseUrl: z.url().optional(),
  organization: z.string().optional(),
  userId: z.string(),
  ignoredWorkItemStates: z.array(z.string()).optional(),
  customWorkItemQuery: z.string().optional(),
});

export type AdoIntegrationInstance = z.infer<typeof AdoIntegrationConfigSchema>;
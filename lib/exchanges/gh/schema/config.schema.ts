import { z } from "zod";
import { IntegrationConfigSchema } from "@/lib/schema/integration-base.schema";


export const GhIntegrationConfigSchema = IntegrationConfigSchema.extend({
  instanceType: z.literal("gh").default("gh"),
  username: z.string(),
});

export type GhIntegrationInstance = z.infer<typeof GhIntegrationConfigSchema>;
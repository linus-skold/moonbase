import { z } from "zod";
import { SimpleUserSchema } from "./common.schema";

/**
 * Enterprise schema
 * An enterprise on GitHub
 */
const EnterpriseSchema = z.object({
  description: z.string().nullable().optional(),
  html_url: z.string().url(),
  website_url: z.string().url().nullable().optional(),
  id: z.number().int(),
  node_id: z.string(),
  name: z.string(),
  slug: z.string(),
  created_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime().nullable(),
  avatar_url: z.string().url(),
});

/**
 * GitHub App Permissions
 */
const GitHubAppPermissionsSchema = z
  .object({
    issues: z.string().optional(),
    checks: z.string().optional(),
    metadata: z.string().optional(),
    contents: z.string().optional(),
    deployments: z.string().optional(),
  })
  .catchall(z.string());

/**
 * GitHub App schema
 * GitHub apps are a new way to extend GitHub
 */
export const GitHubAppSchema = z
  .object({
    id: z.number().int(),
    slug: z.string().optional(),
    node_id: z.string(),
    client_id: z.string().optional(),
    owner: z.union([SimpleUserSchema, EnterpriseSchema]),
    name: z.string(),
    description: z.string().nullable(),
    external_url: z.string().url(),
    html_url: z.string().url(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    permissions: GitHubAppPermissionsSchema,
    events: z.array(z.string()),
    installations_count: z.number().int().optional(),
  })
  .nullable();

export type GitHubApp = z.infer<typeof GitHubAppSchema>;

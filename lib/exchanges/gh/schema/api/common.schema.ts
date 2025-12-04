import { z } from "zod";

/**
 * Custom validation for GitHub URL templates that contain placeholders like {/user}
 */
const githubUrlTemplateSchema = z.string().refine(
  (val) => {
    try {
      // Remove template placeholders before validating as URL
      const baseUrl = val.replace(/\{[^}]+\}/g, "");
      new URL(baseUrl);
      return true;
    } catch {
      return false;
    }
  },
  { message: "Invalid GitHub URL template" }
);

/**
 * GitHub Simple User schema
 * A GitHub user with basic information
 */
export const SimpleUserSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  login: z.string(),
  id: z.number().int(),
  node_id: z.string(),
  avatar_url: z.string().url(),
  gravatar_id: z.string().nullable(),
  url: z.string().url(),
  html_url: z.string().url(),
  followers_url: z.string().url(),
  following_url: githubUrlTemplateSchema,
  gists_url: githubUrlTemplateSchema,
  starred_url: githubUrlTemplateSchema,
  subscriptions_url: z.string().url(),
  organizations_url: z.string().url(),
  repos_url: z.string().url(),
  events_url: githubUrlTemplateSchema,
  received_events_url: z.string().url(),
  type: z.string(),
  site_admin: z.boolean(),
  starred_at: z.string().optional(),
  user_view_type: z.string().optional(),
});

export type SimpleUser = z.infer<typeof SimpleUserSchema>;

/**
 * GitHub Label schema
 */
export const LabelSchema = z.object({
  id: z.number().int().optional(),
  node_id: z.string().optional(),
  url: z.string().optional(),
  name: z.string().optional(),
  color: z.string().optional(),
  default: z.boolean().optional(),
  description: z.string().nullable().optional(),
});

export type Label = z.infer<typeof LabelSchema>;

/**
 * License Simple schema
 */
export const LicenseSimpleSchema = z.object({
  key: z.string(),
  name: z.string(),
  url: z.string().url().nullable(),
  spdx_id: z.string().nullable(),
  node_id: z.string(),
  html_url: z.string().url().optional(),
});

export type LicenseSimple = z.infer<typeof LicenseSimpleSchema>;

/**
 * Author Association enum
 */
export const AuthorAssociationSchema = z.enum([
  "COLLABORATOR",
  "CONTRIBUTOR",
  "FIRST_TIMER",
  "FIRST_TIME_CONTRIBUTOR",
  "MANNEQUIN",
  "MEMBER",
  "NONE",
  "OWNER",
]);

export type AuthorAssociation = z.infer<typeof AuthorAssociationSchema>;

/**
 * Search Result Text Match
 */
export const TextMatchSchema = z.object({
  object_url: z.string().optional(),
  object_type: z.string().nullable().optional(),
  property: z.string().optional(),
  fragment: z.string().optional(),
  matches: z
    .array(
      z.object({
        text: z.string().optional(),
        indices: z.array(z.number().int()).optional(),
      })
    )
    .optional(),
});

export type TextMatch = z.infer<typeof TextMatchSchema>;

/**
 * Reaction Rollup
 */
export const ReactionRollupSchema = z.object({
  url: z.string().url(),
  total_count: z.number().int(),
  "+1": z.number().int(),
  "-1": z.number().int(),
  laugh: z.number().int(),
  confused: z.number().int(),
  heart: z.number().int(),
  hooray: z.number().int(),
  eyes: z.number().int(),
  rocket: z.number().int(),
});

export type ReactionRollup = z.infer<typeof ReactionRollupSchema>;

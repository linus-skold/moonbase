import { z } from "zod";

/**
 * Pull Request metadata in issue search results
 */
export const PullRequestSchema = z.object({
  merged_at: z.string().datetime().nullable().optional(),
  diff_url: z.string().url().nullable(),
  html_url: z.string().url().nullable(),
  patch_url: z.string().url().nullable(),
  url: z.string().url().nullable(),
});

export type PullRequest = z.infer<typeof PullRequestSchema>;

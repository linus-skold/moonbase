import { z } from "zod";
import { IssueSearchResultItemSchema } from "./issue-search-result.schema";

/**
 * GitHub Issue Search Response
 * The complete response from GitHub's issue search API
 */
export const GitHubIssueSearchResponseSchema = z.object({
  total_count: z.number().int(),
  incomplete_results: z.boolean(),
  items: z.array(IssueSearchResultItemSchema),
});

export type GitHubIssueSearchResponse = z.infer<
  typeof GitHubIssueSearchResponseSchema
>;

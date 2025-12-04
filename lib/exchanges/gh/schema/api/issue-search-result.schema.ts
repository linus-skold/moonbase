import { z } from "zod";
import {
  SimpleUserSchema,
  LabelSchema,
  AuthorAssociationSchema,
  TextMatchSchema,
  ReactionRollupSchema,
} from "./common.schema";
import { MilestoneSchema } from "./milestone.schema";
import { RepositorySchema } from "./repository.schema";
import { GitHubAppSchema } from "./github-app.schema";
import {
  IssueFieldValueSchema,
  SubIssuesSummarySchema,
  IssueDependenciesSummarySchema,
} from "./issue-field.schema";
import { IssueTypeSchema } from "./issue-type.schema";
import { PullRequestSchema } from "./pull-request.schema";

/**
 * Issue Search Result Item
 * An individual issue or pull request from GitHub search results
 */
export const IssueSearchResultItemSchema = z.object({
  url: z.url(),
  repository_url: z.url(),
  labels_url: z.url(),
  comments_url: z.url(),
  events_url: z.url(),
  html_url: z.url(),
  id: z.number().int(),
  node_id: z.string(),
  number: z.number().int(),
  title: z.string(),
  locked: z.boolean(),
  active_lock_reason: z.string().nullable().optional(),
  assignees: z.array(SimpleUserSchema).nullable().optional(),
  user: SimpleUserSchema.nullable(),
  labels: z.array(LabelSchema),
  sub_issues_summary: SubIssuesSummarySchema.optional(),
  issue_dependencies_summary: IssueDependenciesSummarySchema.optional(),
  issue_field_values: z.array(IssueFieldValueSchema).optional(),
  state: z.string(),
  state_reason: z.string().nullable().optional(),
  assignee: SimpleUserSchema.nullable(),
  milestone: MilestoneSchema.nullable(),
  comments: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  closed_at: z.coerce.date().nullable(),
  text_matches: z.array(TextMatchSchema).optional(),
  pull_request: PullRequestSchema.optional(),
  body: z.string().nullable().optional(),
  score: z.number(),
  author_association: AuthorAssociationSchema,
  draft: z.boolean().optional(),
  repository: RepositorySchema.optional(),
  body_html: z.string().optional(),
  body_text: z.string().optional(),
  timeline_url: z.string().url().optional(),
  type: IssueTypeSchema.optional(),
  performed_via_github_app: GitHubAppSchema.optional(),
  reactions: ReactionRollupSchema.optional(),
});

export type IssueSearchResultItem = z.infer<typeof IssueSearchResultItemSchema>;

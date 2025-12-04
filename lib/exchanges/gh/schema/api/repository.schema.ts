import { z } from "zod";
import { SimpleUserSchema, LicenseSimpleSchema } from "./common.schema";

/**
 * Repository Permissions
 */
const RepositoryPermissionsSchema = z.object({
  admin: z.boolean(),
  pull: z.boolean(),
  triage: z.boolean().optional(),
  push: z.boolean(),
  maintain: z.boolean().optional(),
});

/**
 * Code Search Index Status
 */
const CodeSearchIndexStatusSchema = z.object({
  lexical_search_ok: z.boolean().optional(),
  lexical_commit_sha: z.string().optional(),
});

/**
 * GitHub Repository schema
 * A repository on GitHub
 */
export const RepositorySchema = z.object({
  id: z.number().int(),
  node_id: z.string(),
  name: z.string(),
  full_name: z.string(),
  license: LicenseSimpleSchema.nullable(),
  forks: z.number().int(),
  permissions: RepositoryPermissionsSchema.optional(),
  owner: SimpleUserSchema,
  private: z.boolean(),
  html_url: z.string().url(),
  description: z.string().nullable(),
  fork: z.boolean(),
  url: z.string().url(),
  archive_url: z.string(),
  assignees_url: z.string(),
  blobs_url: z.string(),
  branches_url: z.string(),
  collaborators_url: z.string(),
  comments_url: z.string(),
  commits_url: z.string(),
  compare_url: z.string(),
  contents_url: z.string(),
  contributors_url: z.string().url(),
  deployments_url: z.string().url(),
  downloads_url: z.string().url(),
  events_url: z.string().url(),
  forks_url: z.string().url(),
  git_commits_url: z.string(),
  git_refs_url: z.string(),
  git_tags_url: z.string(),
  git_url: z.string(),
  issue_comment_url: z.string(),
  issue_events_url: z.string(),
  issues_url: z.string(),
  keys_url: z.string(),
  labels_url: z.string(),
  languages_url: z.string().url(),
  merges_url: z.string().url(),
  milestones_url: z.string(),
  notifications_url: z.string(),
  pulls_url: z.string(),
  releases_url: z.string(),
  ssh_url: z.string(),
  stargazers_url: z.string().url(),
  statuses_url: z.string(),
  subscribers_url: z.string().url(),
  subscription_url: z.string().url(),
  tags_url: z.string().url(),
  teams_url: z.string().url(),
  trees_url: z.string(),
  clone_url: z.string(),
  mirror_url: z.string().url().nullable(),
  hooks_url: z.string().url(),
  svn_url: z.string().url(),
  homepage: z.string().url().nullable(),
  language: z.string().nullable(),
  forks_count: z.number().int(),
  stargazers_count: z.number().int(),
  watchers_count: z.number().int(),
  size: z.number().int(),
  default_branch: z.string(),
  open_issues_count: z.number().int(),
  is_template: z.boolean().optional(),
  topics: z.array(z.string()).optional(),
  has_issues: z.boolean(),
  has_projects: z.boolean(),
  has_wiki: z.boolean(),
  has_pages: z.boolean(),
  has_downloads: z.boolean(),
  has_discussions: z.boolean().optional(),
  archived: z.boolean(),
  disabled: z.boolean(),
  visibility: z.string().optional(),
  pushed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime().nullable(),
  allow_rebase_merge: z.boolean().optional(),
  temp_clone_token: z.string().optional(),
  allow_squash_merge: z.boolean().optional(),
  allow_auto_merge: z.boolean().optional(),
  delete_branch_on_merge: z.boolean().optional(),
  allow_update_branch: z.boolean().optional(),
  use_squash_pr_title_as_default: z.boolean().optional(),
  squash_merge_commit_title: z
    .enum(["PR_TITLE", "COMMIT_OR_PR_TITLE"])
    .optional(),
  squash_merge_commit_message: z
    .enum(["PR_BODY", "COMMIT_MESSAGES", "BLANK"])
    .optional(),
  merge_commit_title: z.enum(["PR_TITLE", "MERGE_MESSAGE"]).optional(),
  merge_commit_message: z.enum(["PR_BODY", "PR_TITLE", "BLANK"]).optional(),
  allow_merge_commit: z.boolean().optional(),
  allow_forking: z.boolean().optional(),
  web_commit_signoff_required: z.boolean().optional(),
  open_issues: z.number().int(),
  watchers: z.number().int(),
  master_branch: z.string().optional(),
  starred_at: z.string().optional(),
  anonymous_access_enabled: z.boolean().optional(),
  code_search_index_status: CodeSearchIndexStatusSchema.optional(),
});

export type Repository = z.infer<typeof RepositorySchema>;

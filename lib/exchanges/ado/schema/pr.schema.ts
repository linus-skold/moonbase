import { z } from 'zod';

export const AdoPullRequestSchema = z.object({
  codeReviewId: z.number(),
  pullRequestId: z.number(),
  repository: z.object({
    id: z.string(),
    name: z.string(),
    project: z.object({
      id: z.string(),
      name: z.string(),
    }),
  }),
  title: z.string(),
  description: z.string().optional(),
  sourceRefName: z.string(),
  targetRefName: z.string(),
  status: z.enum(['active', 'abandoned', 'completed']),
  createdBy: z.object({
    displayName: z.string(),
    imageUrl: z.string().optional(),
  }),
  creationDate: z.string(),
  url: z.string(),
  isDraft: z.boolean().optional(),
  reviewers: z.array(
    z.object({
      displayName: z.string(),
      vote: z.number(),
    })
  ).optional(),
}).transform((data) => {
  // Extract PR ID from the API URL
  const prId = data.url.split("/").pop();

  const result = /^(https?:\/\/)([^\/]+)(\/?)/.exec(data.url);
  const baseUrl = result ? result[0] : "https://dev.azure.com/";

  // Extract org name from the URL
  const org = data.url.split("/")[3]; // could probably use the regex to get this one too

  // Build UI URL
  const uiUrl =
    `${baseUrl}${org}/${data.repository.project.name}/` +
    `_git/${data.repository.name}/pullrequest/${prId}`;

  return {
    ...data,
    uiUrl,
  };
});
export type AdoPullRequest = z.infer<typeof AdoPullRequestSchema>;
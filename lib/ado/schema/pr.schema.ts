import { z } from 'zod';

export const AdoPullRequestSchema = z.object({
  id: z.string(),
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
});
export type AdoPullRequest = z.infer<typeof AdoPullRequestSchema>;
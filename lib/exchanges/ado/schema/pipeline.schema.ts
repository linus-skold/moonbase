import { z } from 'zod';

export const AdoPipeline = z.object({
  id: z.number(),
  name: z.string(),
  folder: z.string().optional(),
  revision: z.number(),
});
export type AdoPipeline = z.infer<typeof AdoPipeline>;

export const AdoPipelineRun = z.object({
  id: z.number(),
  name: z.string(),
  pipeline: z.object({
    id: z.number(),
    name: z.string(),
  }),
  state: z.enum(['canceling', 'completed', 'inProgress', 'notStarted']),
  result: z.enum(['canceled', 'failed', 'succeeded', 'partiallySucceeded']).optional(),
  createdDate: z.string(),
  finishedDate: z.string().optional(),
  url: z.string(),
  _links: z.object({
    web: z.object({
      href: z.string(),
    }),
  }),
  resources: z.object({
    repositories: z.record( // Look into why this is wrapped in a record
      z.string(),
      z.object({
        repository: z.object({
          id: z.string(),
          type: z.string(),
        }),
      })
    ).optional(),
  }).optional(),
});

export type AdoPipelineRun = z.infer<typeof AdoPipelineRun>;
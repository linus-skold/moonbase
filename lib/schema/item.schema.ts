import { z } from "zod";

export const ItemSchema = z.object({
  id: z.string(),
  type: z.string(), // needs to be specified further
  title: z.string(),
  repository: z.string(),
  organization: z.string(),
  description: z.string().optional(),
  itemStatus: z.string(), // needs to be specified further maybe
  createdTimestamp: z.number(), // set on item creation
  updateTimestamp: z.number(), // set on item creation and update
  prevUpdateTimestamp: z.number().nullable(), // previous update timestamp for change tracking
  unread: z.boolean().default(true),
  url: z.url(),
});

export const PullRequestSchema = ItemSchema.extend({
  status: z.enum(["open", "closed", "merged"]), // might need more statuses to indicate review status etc.
  type: z.literal("pullRequest"),
});

export const WorkItemSchema = ItemSchema.extend({
  status: z.string(), // e.g. 'New', 'Active', 'Resolved', etc.
  type: z.literal("workItem"),
});

export const PipelineSchema = ItemSchema.extend({
  status: z.enum(["running", "completed", "failed", "queued"]),
  type: z.literal("pipeline"),
});


export const TypedItemSchema = z.discriminatedUnion("type", [
  PullRequestSchema,
  WorkItemSchema,
  PipelineSchema,
]);

export type Item = z.infer<typeof ItemSchema>;
export type PullRequest = z.infer<typeof PullRequestSchema>;
export type WorkItem = z.infer<typeof WorkItemSchema>;
export type Pipeline = z.infer<typeof PipelineSchema>;
export type TypedItem = z.infer<typeof TypedItemSchema>;
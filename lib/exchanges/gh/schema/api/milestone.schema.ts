import { z } from "zod";
import { SimpleUserSchema } from "./common.schema";

/**
 * GitHub Milestone schema
 * A collection of related issues and pull requests
 */
export const MilestoneSchema = z.object({
  url: z.string().url(),
  html_url: z.string().url(),
  labels_url: z.string().url(),
  id: z.number().int(),
  node_id: z.string(),
  number: z.number().int(),
  state: z.enum(["open", "closed"]),
  title: z.string(),
  description: z.string().nullable(),
  creator: SimpleUserSchema.nullable(),
  open_issues: z.number().int(),
  closed_issues: z.number().int(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  closed_at: z.string().datetime().nullable(),
  due_on: z.string().datetime().nullable(),
});

export type Milestone = z.infer<typeof MilestoneSchema>;

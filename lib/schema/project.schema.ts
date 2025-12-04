import { z } from "zod";
import { TypedItemSchema } from "./item.schema";


export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  url: z.url(),
  items: TypedItemSchema.array().default([]),
  project: z.string().optional(),
  organization: z.string().optional(),
  latestUpdate: z.number().optional(),
  createdDate: z.number().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;


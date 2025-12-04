import { z } from "zod";

export const AssigneeSchema = z.object({
  name: z.string().nullable(),
  imageUrl: z.url(),
  displayName: z.string()
});

export type Assignee = z.infer<typeof AssigneeSchema>;
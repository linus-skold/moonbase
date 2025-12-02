import { z } from "zod";


export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  url: z.string().url(),
  createdDate: z.string().optional(),
});


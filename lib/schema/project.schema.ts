import { z } from "zod";


export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  url: z.url(),
  createdDate: z.string().optional(),
});


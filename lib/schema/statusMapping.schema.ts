import { z } from 'zod';

export const StatusMapping = z.object({
  type: z.string(), // e.g., "workItem"
  status: z.string(), // e.g., "Active"
  color: z.string(),
});
export type StatusMapping = z.infer<typeof StatusMapping>;

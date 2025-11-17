import { z } from 'zod';
export const AdoInstance = z.object({
  id: z.string(),
  name: z.string(),
  organization: z.string(),
  baseUrl: z.url(),
  personalAccessToken: z.string(),
  enabled: z.boolean(),
  userId: z.string(),
});
export type AdoInstance = z.infer<typeof AdoInstance>;
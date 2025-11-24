import { z } from 'zod';

export const UserSettingsSchema = z.object({
  autoRefreshOnPoll: z.boolean().default(false),
  pollingEnabled: z.boolean().default(true),
  pollingInterval: z.number().min(10000).default(10000), // 10 seconds minimum
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

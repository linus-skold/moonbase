import { create } from '@/lib/storage';
import { UserSettings, UserSettingsSchema } from '@/lib/schema/settings.schema';

const storage = create('user-settings', '1.0', UserSettingsSchema);

export const settingsStorage = {
  load: (): UserSettings => {
    const settings = storage.load();
    if (!settings) {
      // Create default settings if they don't exist
      const defaults = UserSettingsSchema.parse({});
      storage.save(defaults);
      return defaults;
    }
    // Validate and apply defaults for any missing fields
    return settings;
  },
  
  save: (settings: Partial<UserSettings>): boolean => {
    const current = settingsStorage.load();
    const updated = { ...current, ...settings };
    return storage.save(updated);
  },
  
  clear: (): boolean => {
    return storage.clear();
  },
};

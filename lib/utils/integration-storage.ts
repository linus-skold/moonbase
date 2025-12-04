import { create } from "@/lib/storage";
import {
  IntegrationsConfigSchema,
  type IntegrationInstance,
} from "@/lib/schema/config.schema";

const storage = create("integration-config", "1.0", IntegrationsConfigSchema);

export const integrationStorage = {
  loadInstance: <T extends IntegrationInstance>(instanceId: string): T => {
      const config = storage.load();
      if(!config) 
        throw new Error("No integration config found");

      return config.instances[instanceId] as T;
  },

  saveInstance: (instance: IntegrationInstance): boolean => {
    const config = storage.load() ?? { instances: {} };
    config.instances[instance.id] = instance;
    return storage.save(config);
  },

  removeInstance: (instanceId: string): boolean => {
    const config = storage.load();
    if (!config || !config.instances[instanceId]) {
      return false;
    }
    delete config.instances[instanceId];
    return storage.save(config);
  },

  loadAll: () => storage.load(),
};

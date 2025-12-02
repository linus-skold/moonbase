import { create } from "@/lib/storage";
import {
  IntegrationsConfigSchema,
  type IntegrationInstance,
} from "@/lib/schema/config.schema";

const storage = create("integration-config", "1.0", IntegrationsConfigSchema);

export const integrationStorage = {
  loadInstance: (instanceId: string): IntegrationInstance | null => {
    const config = storage.load();
    return config?.instances[instanceId] || null;
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

import { integrationStorage } from './integration-storage';
import { AdoIntegrationConfigSchema } from '@/lib/exchanges/ado/schema/config.schema';
import { GhIntegrationConfigSchema } from '@/lib/exchanges/gh/schema/config.schema';

const MIGRATION_KEY = 'moonbase-migration-completed';

/**
 * Migrate old storage format to new unified integration storage
 */
export function migrateOldStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Check if migration already completed
  const migrationCompleted = localStorage.getItem(MIGRATION_KEY);
  if (migrationCompleted === 'true') {
    return;
  }

  console.log('[Migration] Starting migration from old storage format...');

  let migratedCount = 0;

  // Migrate ADO instances
  try {
    const adoConfigStr = localStorage.getItem('ado-config');
    if (adoConfigStr) {
      const oldConfig = JSON.parse(adoConfigStr);
      
      if (oldConfig.config?.instances) {
        oldConfig.config.instances.forEach((instance: any) => {
          try {
            // Parse with new schema to validate and transform
            const parsed = AdoIntegrationConfigSchema.parse(instance);
            integrationStorage.saveInstance(parsed);
            migratedCount++;
            console.log(`[Migration] Migrated ADO instance: ${parsed.name}`);
          } catch (error) {
            console.error('[Migration] Failed to parse ADO instance:', error);
          }
        });
      }
    }
  } catch (error) {
    console.error('[Migration] Error migrating ADO config:', error);
  }

  // Migrate GitHub instances
  try {
    const ghConfigStr = localStorage.getItem('gh-config');
    if (ghConfigStr) {
      const oldConfig = JSON.parse(ghConfigStr);
      
      if (oldConfig.config?.instances) {
        oldConfig.config.instances.forEach((instance: any) => {
          try {
            // Add instanceType if missing
            if (!instance.instanceType) {
              instance.instanceType = 'gh';
            }
            // Parse with new schema to validate and transform
            const parsed = GhIntegrationConfigSchema.parse(instance);
            integrationStorage.saveInstance(parsed);
            migratedCount++;
            console.log(`[Migration] Migrated GitHub instance: ${parsed.name}`);
          } catch (error) {
            console.error('[Migration] Failed to parse GitHub instance:', error);
          }
        });
      }
    }
  } catch (error) {
    console.error('[Migration] Error migrating GitHub config:', error);
  }

  // Mark migration as completed
  localStorage.setItem(MIGRATION_KEY, 'true');
  console.log(`[Migration] Migration completed. Migrated ${migratedCount} instances.`);
}

/**
 * Reset migration flag (useful for testing)
 */
export function resetMigration(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(MIGRATION_KEY);
    console.log('[Migration] Migration flag reset.');
  }
}

// Storage utilities for Azure DevOps configuration

 import type { AdoConfig } from './schema/config.schema';

const STORAGE_KEY = 'ado-config';
const STORAGE_VERSION = '1.0';

interface StorageData {
  version: string;
  config: AdoConfig;
  updatedAt: string;
}

/**
 * Load configuration from localStorage
 */
export function loadConfig(): AdoConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const data: StorageData = JSON.parse(raw);

    // Handle version migrations if needed
    if (data.version !== STORAGE_VERSION) {
      console.warn('Configuration version mismatch, migration may be needed');
    }

    return data.config;
  } catch (error) {
    console.error('Failed to load ADO configuration:', error);
    return null;
  }
}

/**
 * Save configuration to localStorage
 */
export function saveConfig(config: AdoConfig): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const data: StorageData = {
      version: STORAGE_VERSION,
      config,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save ADO configuration:', error);
    return false;
  }
}

/**
 * Clear configuration from localStorage
 */
export function clearConfig(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear ADO configuration:', error);
    return false;
  }
}

/**
 * Export configuration as JSON file
 */
export function exportConfig(config: AdoConfig): void {
  // Remove sensitive data before export
  const sanitized: AdoConfig = {
    ...config,
    instances: config.instances.map((instance) => ({
      ...instance,
      personalAccessToken: '***REDACTED***',
    })),
  };

  const data = JSON.stringify(sanitized, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `ado-config-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import configuration from JSON file
 */
export async function importConfig(file: File): Promise<AdoConfig | null> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    // Basic validation
    if (!parsed.instances || !Array.isArray(parsed.instances)) {
      throw new Error('Invalid configuration format');
    }

    return parsed as AdoConfig;
  } catch (error) {
    console.error('Failed to import configuration:', error);
    return null;
  }
}

/**
 * Get configuration metadata
 */
export function getConfigMetadata(): {
  hasConfig: boolean;
  updatedAt: string | null;
  instanceCount: number;
  enabledInstanceCount: number;
} | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        hasConfig: false,
        updatedAt: null,
        instanceCount: 0,
        enabledInstanceCount: 0,
      };
    }

    const data: StorageData = JSON.parse(raw);
    
    return {
      hasConfig: true,
      updatedAt: data.updatedAt,
      instanceCount: data.config.instances.length,
      enabledInstanceCount: data.config.instances.filter((i) => i.enabled).length,
    };
  } catch (error) {
    console.error('Failed to get configuration metadata:', error);
    return null;
  }
}

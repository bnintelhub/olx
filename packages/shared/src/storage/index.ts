export * from './storage.types';
export * from './local-storage-provider';
export * from './resolve-media-root';

import { StorageProvider } from './storage.types';
import { LocalStorageProvider } from './local-storage-provider';

let globalStorageInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!globalStorageInstance) {
    globalStorageInstance = new LocalStorageProvider();
  }
  return globalStorageInstance;
}


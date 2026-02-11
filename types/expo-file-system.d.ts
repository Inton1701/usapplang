declare module 'expo-file-system' {
  export const documentDirectory: string | null;
  export const cacheDirectory: string | null;

  export function makeDirectoryAsync(path: string, options?: { intermediates?: boolean }): Promise<void>;
  export function getInfoAsync(path: string, options?: { size?: boolean }): Promise<{ exists: boolean; isDirectory?: boolean; size?: number }>;
  export function copyAsync(options: { from: string; to: string }): Promise<void>;
  export function deleteAsync(path: string, options?: { idempotent?: boolean }): Promise<void>;
}

// legacy entrypoint used to avoid runtime deprecation warnings in older Expo SDKs
declare module 'expo-file-system/legacy' {
  export * from 'expo-file-system';
}

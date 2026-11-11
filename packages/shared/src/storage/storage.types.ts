export interface SaveInput {
  destinationKey: string;
  streamOrBuffer: NodeJS.ReadableStream | Buffer;
  mimeType?: string;
  isTemp?: boolean;
}

export interface StoredFile {
  key: string;
  fullPath: string;
  sizeBytes: number;
}

export interface StorageProvider {
  save(input: SaveInput): Promise<StoredFile>;
  read(key: string): Promise<NodeJS.ReadableStream>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  move(source: string, destination: string): Promise<void>;
  getPath(key: string): string;
  getRootDir(): string;
}


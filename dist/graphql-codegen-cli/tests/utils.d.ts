export declare class TempDir {
  dir: string;
  constructor();
  createFile(file: string, contents: string): void;
  clean(): void;
  deleteTempDir(): void;
}

import type {
  Bucket,
  IFileStorage,
} from "@/src/application/services/file-storage.service.interface";

// Where the mock's addresses point: nowhere real.
const MOCK_ORIGIN = "https://storage.test";

// Keeps what's stored, by bucket and key, for tests to check. Its addresses name the bucket and
// the key, as the real ones do, and a signed one says how long it lasts. Like S3, it signs an
// address for a key whether or not a file is there.
export class MockFileStorageService implements IFileStorage {
  readonly files = new Map<
    string,
    { bytes: Uint8Array; contentType: string }
  >();

  async put(
    bucket: Bucket,
    key: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<void> {
    this.files.set(`${bucket}/${key}`, { bytes, contentType });
  }

  async remove(bucket: Bucket, key: string): Promise<void> {
    this.files.delete(`${bucket}/${key}`);
  }

  async signedUrl(
    bucket: Bucket,
    key: string,
    seconds: number,
  ): Promise<string> {
    return `${this.publicUrl(bucket, key)}?expires-in=${seconds}`;
  }

  publicUrl(bucket: Bucket, key: string): string {
    return `${MOCK_ORIGIN}/${bucket}/${key}`;
  }
}

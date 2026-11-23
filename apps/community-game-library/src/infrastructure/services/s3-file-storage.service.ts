import type { S3Client } from "@aws-sdk/client-s3";
import type {
  Bucket,
  IFileStorage,
} from "@/src/application/services/file-storage.service.interface";

// Where Neon Object Storage is and the credential for it (docs/build-plan.md KTD11): the branch's
// S3 endpoint and region, and a storage credential's key id and secret.
type StorageConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

// A setting under Neon's quickstart name with STORAGE_ in front, as local development and the
// previews have them, or under Neon's own name, as production has them (2026-11-23). The prefixed
// name wins, so an AWS_ variable a shell already sets can't take over local development's storage:
// Next doesn't replace a variable the environment has with .env's.
function setting(name: string): string | undefined {
  return process.env[`STORAGE_${name}`] || process.env[name];
}

function configFromEnv(): StorageConfig {
  const endpoint = setting("AWS_ENDPOINT_URL_S3");
  const region = setting("AWS_REGION");
  const accessKeyId = setting("AWS_ACCESS_KEY_ID");
  const secretAccessKey = setting("AWS_SECRET_ACCESS_KEY");
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "File storage isn't configured: STORAGE_AWS_ENDPOINT_URL_S3, STORAGE_AWS_REGION, STORAGE_AWS_ACCESS_KEY_ID and STORAGE_AWS_SECRET_ACCESS_KEY, or the same without STORAGE_",
    );
  }
  return { endpoint, region, accessKeyId, secretAccessKey };
}

// A key in an address: each part between slashes encoded, the slashes kept.
function keyPath(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

// Neon Object Storage through the AWS SDK, the only place that knows it's S3 (KTD11). The SDK
// loads on the first upload, removal or signed address, not when a server function starts: the
// DI container builds this adapter for every request, and most never touch a file (KTD2).
// tests/di/container.test.ts keeps both AWS packages out of start-up.
export class S3FileStorageService implements IFileStorage {
  private client: Promise<S3Client> | undefined;

  // A config for tests. Left out, the environment's, read on first use, so `next build` and a
  // request that stores nothing don't need it.
  constructor(private readonly givenConfig?: StorageConfig) {}

  private config(): StorageConfig {
    return this.givenConfig ?? configFromEnv();
  }

  private getClient(): Promise<S3Client> {
    this.client ??= (async () => {
      const { endpoint, region, accessKeyId, secretAccessKey } = this.config();
      const { S3Client } = await import("@aws-sdk/client-s3");
      return new S3Client({
        endpoint,
        region,
        credentials: { accessKeyId, secretAccessKey },
        // Neon serves a bucket by path, not by subdomain (Neon's Object Storage docs).
        forcePathStyle: true,
        // Recent SDKs add checksums Neon's quickstart turns off for its uploads.
        requestChecksumCalculation: "WHEN_REQUIRED",
      });
    })();
    return this.client;
  }

  async put(
    bucket: Bucket,
    key: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<void> {
    const client = await this.getClient();
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
      }),
    );
  }

  async remove(bucket: Bucket, key: string): Promise<void> {
    const client = await this.getClient();
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async signedUrl(
    bucket: Bucket,
    key: string,
    seconds: number,
  ): Promise<string> {
    const client = await this.getClient();
    const [{ GetObjectCommand }, { getSignedUrl }] = await Promise.all([
      import("@aws-sdk/client-s3"),
      import("@aws-sdk/s3-request-presigner"),
    ]);
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: seconds },
    );
  }

  // A public-read bucket's file is served at the endpoint, the bucket and the key (Neon's
  // Buckets docs). Made without the SDK, since it's only an address.
  publicUrl(bucket: Bucket, key: string): string {
    const endpoint = this.config().endpoint.replace(/\/+$/, "");
    return `${endpoint}/${bucket}/${keyPath(key)}`;
  }
}

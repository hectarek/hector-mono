import { describe, expect, it } from "bun:test";
import { S3FileStorageService } from "@/src/infrastructure/services/s3-file-storage.service";

// A fictional branch's storage endpoint, in the shape Neon gives one.
const CONFIG = {
  endpoint: "https://br-example-123.storage.c-1.us-east-1.aws.neon.tech",
  region: "us-east-1",
  accessKeyId: "nak_test_key",
  secretAccessKey: "nsk_test_secret",
};

describe("S3FileStorageService", () => {
  // Neon serves a public-read bucket's file at the endpoint, the bucket and the key.
  it("gives a public file's address from the endpoint, the bucket and the key", () => {
    const storage = new S3FileStorageService(CONFIG);
    expect(
      storage.publicUrl("catalog-images", "covers/harbor-lights.jpg"),
    ).toBe(`${CONFIG.endpoint}/catalog-images/covers/harbor-lights.jpg`);
  });

  it("encodes each part of a key and keeps its slashes", () => {
    const storage = new S3FileStorageService({
      ...CONFIG,
      endpoint: `${CONFIG.endpoint}/`,
    });
    expect(storage.publicUrl("catalog-images", "box photos/a b#1.jpg")).toBe(
      `${CONFIG.endpoint}/catalog-images/box%20photos/a%20b%231.jpg`,
    );
  });

  // The preload drops the STORAGE_ variables, as a build without them would have none.
  it("says what's missing on first use when storage isn't configured, not before", async () => {
    const storage = new S3FileStorageService();
    await expect(
      storage.put("profile-photos", "a.jpg", new Uint8Array([1]), "image/jpeg"),
    ).rejects.toThrow("File storage isn't configured");
    expect(() => storage.publicUrl("catalog-images", "a.jpg")).toThrow(
      "STORAGE_AWS_ENDPOINT_URL_S3",
    );
  });

  // Production has Neon's own names; local development and the previews have STORAGE_ in front.
  it("reads each setting with STORAGE_ in front, or else without it, as production has them", () => {
    const names = {
      AWS_ENDPOINT_URL_S3: CONFIG.endpoint,
      AWS_REGION: CONFIG.region,
      AWS_ACCESS_KEY_ID: CONFIG.accessKeyId,
      AWS_SECRET_ACCESS_KEY: CONFIG.secretAccessKey,
    };
    Object.assign(process.env, names);
    try {
      expect(
        new S3FileStorageService().publicUrl("catalog-images", "a.jpg"),
      ).toBe(`${CONFIG.endpoint}/catalog-images/a.jpg`);
      process.env.STORAGE_AWS_ENDPOINT_URL_S3 = "https://storage.example";
      expect(
        new S3FileStorageService().publicUrl("catalog-images", "a.jpg"),
      ).toBe("https://storage.example/catalog-images/a.jpg");
    } finally {
      for (const name of [
        ...Object.keys(names),
        "STORAGE_AWS_ENDPOINT_URL_S3",
      ]) {
        delete process.env[name];
      }
    }
  });
});

import { describe, expect, it } from "bun:test";
import { BUCKETS } from "@/src/application/services/file-storage.service.interface";
import { MockFileStorageService } from "@/src/infrastructure/services/mock-file-storage.service";

const KEY = "00000000-0000-4000-8000-0000000000a1/photo.jpg";
const BYTES = new Uint8Array([255, 216, 255]);

describe("MockFileStorageService", () => {
  it.each(BUCKETS)(
    "keeps a file put in %s, and gives addresses with its key",
    async (bucket) => {
      const storage = new MockFileStorageService();
      await storage.put(bucket, KEY, BYTES, "image/jpeg");

      expect(storage.files.get(`${bucket}/${KEY}`)).toEqual({
        bytes: BYTES,
        contentType: "image/jpeg",
      });
      const signed = await storage.signedUrl(bucket, KEY, 3600);
      expect(signed).toContain(`/${bucket}/${KEY}`);
      expect(signed).toContain("3600");
      expect(storage.publicUrl(bucket, KEY)).toContain(`/${bucket}/${KEY}`);
    },
  );

  it("forgets a removed file, and removing one that isn't there is no error", async () => {
    const storage = new MockFileStorageService();
    await storage.put("profile-photos", KEY, BYTES, "image/jpeg");
    await storage.remove("profile-photos", KEY);
    await storage.remove("profile-photos", KEY);

    expect(storage.files.size).toBe(0);
  });

  it("keeps the buckets apart", async () => {
    const storage = new MockFileStorageService();
    await storage.put("catalog-images", KEY, BYTES, "image/jpeg");

    expect(storage.files.has(`profile-photos/${KEY}`)).toBe(false);
  });
});

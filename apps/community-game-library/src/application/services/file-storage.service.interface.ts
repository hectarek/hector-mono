// The Neon project's two buckets (docs/build-plan.md KTD11). `profile-photos` is private: a page
// shows a photo through a signed address, made only for someone who may see the person (KTD4),
// and the row keeps its key (`photo_key`, data-model rule 14). `catalog-images` is public-read:
// covers of games added by hand and box photos on suggestions, kept as their address
// (`image_url`).
export const BUCKETS = ["profile-photos", "catalog-images"] as const;

export type Bucket = (typeof BUCKETS)[number];

export interface IFileStorage {
  // Stores the bytes under the key, replacing any file already there.
  put(
    bucket: Bucket,
    key: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<void>;
  // Removes the file; a key with no file is no error.
  remove(bucket: Bucket, key: string): Promise<void>;
  // An address that opens the file for `seconds`, with no credential: a private file's way out.
  signedUrl(bucket: Bucket, key: string, seconds: number): Promise<string>;
  // The file's lasting address, which opens only in the public-read bucket.
  publicUrl(bucket: Bucket, key: string): string;
}

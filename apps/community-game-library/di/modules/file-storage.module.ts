import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { MockFileStorageService } from "@/src/infrastructure/services/mock-file-storage.service";
import { S3FileStorageService } from "@/src/infrastructure/services/s3-file-storage.service";

export function createFileStorageModule() {
  const fileStorageModule = createModule();

  if (process.env.NODE_ENV === "test") {
    fileStorageModule
      .bind(DI_SYMBOLS.IFileStorage)
      .toClass(MockFileStorageService);
  } else {
    fileStorageModule
      .bind(DI_SYMBOLS.IFileStorage)
      .toClass(S3FileStorageService);
  }

  return fileStorageModule;
}

import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { NoticesRepository } from "@/src/infrastructure/repositories/notices.repository";
import { MockNoticesRepository } from "@/src/infrastructure/repositories/notices.repository.mock";

export function createNoticesModule() {
  const noticesModule = createModule();

  if (process.env.NODE_ENV === "test") {
    noticesModule
      .bind(DI_SYMBOLS.INoticesRepository)
      .toClass(MockNoticesRepository);
  } else {
    noticesModule
      .bind(DI_SYMBOLS.INoticesRepository)
      .toClass(NoticesRepository, [DI_SYMBOLS.ILoggerService]);
  }

  return noticesModule;
}

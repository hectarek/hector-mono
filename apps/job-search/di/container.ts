import { createContainer } from "@evyweb/ioctopus";
import { createAccessModule } from "@/di/modules/access.module";
import { createActivityModule } from "@/di/modules/activity.module";
import { createAuthenticationModule } from "@/di/modules/authentication.module";
import { createCompaniesModule } from "@/di/modules/companies.module";
import { createInteractionsModule } from "@/di/modules/interactions.module";
import { createJobsModule } from "@/di/modules/jobs.module";
import { createLoggerModule } from "@/di/modules/logger.module";
import { createNotesModule } from "@/di/modules/notes.module";
import { createPeopleModule } from "@/di/modules/people.module";
import { createPracticeModule } from "@/di/modules/practice.module";
import { createSessionModule } from "@/di/modules/session.module";
import { createSettingsModule } from "@/di/modules/settings.module";
import { createSourcesModule } from "@/di/modules/sources.module";
import { createTransactionModule } from "@/di/modules/transaction.module";
import { createWeekModule } from "@/di/modules/week.module";
import { type DI_RETURN_TYPES, DI_SYMBOLS } from "@/di/types";

const ApplicationContainer = createContainer();

ApplicationContainer.load(Symbol("LoggerModule"), createLoggerModule());
ApplicationContainer.load(
  Symbol("AuthenticationModule"),
  createAuthenticationModule(),
);
ApplicationContainer.load(Symbol("AccessModule"), createAccessModule());
ApplicationContainer.load(
  Symbol("TransactionModule"),
  createTransactionModule(),
);
ApplicationContainer.load(Symbol("ActivityModule"), createActivityModule());
ApplicationContainer.load(Symbol("SessionModule"), createSessionModule());
ApplicationContainer.load(Symbol("CompaniesModule"), createCompaniesModule());
ApplicationContainer.load(Symbol("SourcesModule"), createSourcesModule());
ApplicationContainer.load(Symbol("SettingsModule"), createSettingsModule());
ApplicationContainer.load(Symbol("JobsModule"), createJobsModule());
ApplicationContainer.load(Symbol("NotesModule"), createNotesModule());
ApplicationContainer.load(Symbol("PeopleModule"), createPeopleModule());
ApplicationContainer.load(
  Symbol("InteractionsModule"),
  createInteractionsModule(),
);
ApplicationContainer.load(Symbol("PracticeModule"), createPracticeModule());
ApplicationContainer.load(Symbol("WeekModule"), createWeekModule());

export function getInjection<K extends keyof typeof DI_SYMBOLS>(
  symbol: K,
): DI_RETURN_TYPES[K] {
  return ApplicationContainer.get(DI_SYMBOLS[symbol]);
}

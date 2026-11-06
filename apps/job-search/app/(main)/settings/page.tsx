import { AddSourceForm } from "@/app/_components/add-source-form";
import { PageTitle, SectionTitle } from "@/app/_components/display";
import { RecordHistory } from "@/app/_components/record-history";
import { SettingsForm } from "@/app/_components/settings-form";
import { getPageActor } from "@/app/_lib/current-actor";
import { getInjection } from "@/di/container";

// Hector's settings (R12): the weekly targets and the queue cap, which only he changes (R21), the
// lead sources jobs come from (R5), which Claude adds to as well, and the settings' history (R19),
// Claude's refused tries included.
export default async function SettingsPage() {
  const actor = await getPageActor();
  const [settings, sources] = await Promise.all([
    getInjection("IGetSettingsController")({}, actor),
    getInjection("IListSourcesController")({}, actor),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageTitle>Settings</PageTitle>

      <section
        aria-labelledby="settings-targets"
        className="flex flex-col gap-4"
      >
        <SectionTitle id="settings-targets">Targets and the queue</SectionTitle>
        <SettingsForm settings={settings} humanOnly={actor.actor !== "owner"} />
      </section>

      <section
        aria-labelledby="settings-sources"
        className="flex flex-col gap-4"
      >
        <div>
          <SectionTitle id="settings-sources">Lead sources</SectionTitle>
          <p className="text-muted-foreground text-sm">
            Where jobs come from, each name listed once.
          </p>
        </div>
        {sources.length ? (
          <ul className="flex flex-col divide-y text-sm">
            {sources.map((source) => (
              <li key={source.id} className="py-2">
                {source.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">None yet.</p>
        )}
        <AddSourceForm />
      </section>

      <RecordHistory record={{ kind: "settings", id: actor.ownerId }} />
    </div>
  );
}

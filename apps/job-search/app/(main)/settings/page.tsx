import { AddSourceForm } from "@/app/_components/add-source-form";
import { SettingsForm } from "@/app/_components/settings-form";
import { getPageActor } from "@/app/_lib/current-actor";
import { getInjection } from "@/di/container";

// Hector's settings (R12): the weekly targets and the queue cap, which only he changes (R21), and
// the lead sources jobs come from (R5), which Claude adds to as well.
export default async function SettingsPage() {
  const actor = await getPageActor();
  const [settings, sources] = await Promise.all([
    getInjection("IGetSettingsController")(actor),
    getInjection("IListSourcesController")(actor),
  ]);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <section
        aria-labelledby="settings-targets"
        className="flex flex-col gap-4"
      >
        <h2 id="settings-targets" className="font-semibold">
          Targets and the queue
        </h2>
        <SettingsForm settings={settings} humanOnly={actor.actor !== "owner"} />
      </section>

      <section
        aria-labelledby="settings-sources"
        className="flex flex-col gap-4"
      >
        <div>
          <h2 id="settings-sources" className="font-semibold">
            Lead sources
          </h2>
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
    </div>
  );
}

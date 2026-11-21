// The steps before the app (A4, A5, A6, KTD3): the app's name across the top, then the step, with
// no tabs yet. Each step page runs the gate for its own landing (app/_lib/account.ts).
export default function StartLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-4 pb-6">
      <p className="pb-2.5 font-heading text-xl leading-none font-bold uppercase">
        Community Game Library
      </p>
      <main className="flex flex-1 flex-col gap-3 pt-3.5">{children}</main>
    </div>
  );
}

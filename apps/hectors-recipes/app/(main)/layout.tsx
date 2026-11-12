import { BottomNav } from "@/app/_components/bottom-nav";
import { Header } from "@/app/_components/header";
import { InstallHint } from "@/app/_components/install-hint";
import { SavedCopy } from "@/app/_components/saved-copy";

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SavedCopy />
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-4 pb-safe-20">
        <InstallHint />
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

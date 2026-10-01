import { ToolCard } from "@/app/_components/tool-card";
import { tools } from "@/app/_lib/tools";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Tools</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          A growing catalog of AI and general-purpose web utilities. Pick a tool
          to get started.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </main>
  );
}

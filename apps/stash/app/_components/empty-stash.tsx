import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";

export function EmptyStash({
  hasCompletedItems,
}: {
  hasCompletedItems: boolean;
}) {
  if (hasCompletedItems) {
    return (
      <Empty className="my-6">
        <EmptyHeader>
          <EmptyMedia>
            <span role="img" aria-label="celebration" className="text-4xl">
              &#127881;
            </span>
          </EmptyMedia>
          <EmptyTitle>You&apos;ve cleared your stash!</EmptyTitle>
          <EmptyDescription>
            Everything you saved has been consumed. Take a breather, or add
            something new when you&apos;re ready.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Empty className="my-6">
      <EmptyHeader>
        <EmptyMedia>
          <span role="img" aria-label="inbox" className="text-4xl">
            &#128229;
          </span>
        </EmptyMedia>
        <EmptyTitle>Your stash is empty</EmptyTitle>
        <EmptyDescription>
          Paste a link above to save content you want to watch, read, or listen
          to later.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

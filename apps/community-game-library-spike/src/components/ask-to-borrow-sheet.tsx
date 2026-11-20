import { Dialog } from "@kobalte/core/dialog";
import { createSignal, Show } from "solid-js";

// C1, cut down for the spike: a sheet on Kobalte's Solid 2 alpha. It sends nothing.
export function AskToBorrowSheet(props: { title: string }) {
  const [open, setOpen] = createSignal(false);
  const [sent, setSent] = createSignal(false);

  return (
    <>
      <Dialog open={open()} onOpenChange={setOpen}>
        <Dialog.Trigger class="button">Ask to borrow</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay class="sheet-overlay" />
          <Dialog.Content class="sheet">
            <Dialog.Title class="sheet-title">Ask to borrow</Dialog.Title>
            <Dialog.Description class="body">
              Ask for {props.title}. The owner says yes for a week, two weeks or
              a month, or no.
            </Dialog.Description>
            <label class="field-label" for="request-note">
              Note (optional)
            </label>
            <textarea
              class="field"
              id="request-note"
              rows={3}
              placeholder="Can I grab it Friday?"
            />
            <div class="sheet-actions">
              <Dialog.CloseButton class="button quiet">
                Cancel
              </Dialog.CloseButton>
              <button
                class="button"
                type="button"
                onClick={() => {
                  setSent(true);
                  setOpen(false);
                }}
              >
                Send request
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
      <Show when={sent()}>
        <p class="empty" role="status">
          Request sent. The spike stores nothing.
        </p>
      </Show>
    </>
  );
}

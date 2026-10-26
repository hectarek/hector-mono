"use client";

import { Button } from "@repo/ui/components/button";
import { Textarea } from "@repo/ui/components/textarea";
import { type FormEvent, useState, useTransition } from "react";
import { DeleteButton } from "@/app/_components/delete-button";
import { callAction } from "@/app/_lib/call-action";
import { ACTOR_LABELS } from "@/app/_lib/job-labels";
import { addNote, deleteNote, editNote } from "@/app/actions/notes";
import type { Note } from "@/src/entities/models/note.model";
import { PLAN_TIME_ZONE } from "@/src/entities/week";

// Eastern time, as everywhere in the app (docs/build-plan.md KTD18).
const WHEN = new Intl.DateTimeFormat("en-US", {
  timeZone: PLAN_TIME_ZONE,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// A job's dated notes, newest first, each signed, with a box to add one. Claude's notes only
// append (R21): editing and deleting are Hector's, and Claude's session sees neither.
export function JobNotes({
  jobId,
  notes,
  canEdit,
}: {
  jobId: string;
  notes: Note[];
  canEdit: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <AddNote jobId={jobId} />
      {notes.length ? (
        <ol className="flex flex-col divide-y">
          {notes.map((note) => (
            <NoteEntry key={note.id} note={note} canEdit={canEdit} />
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground text-sm">No notes yet.</p>
      )}
    </div>
  );
}

function AddNote({ jobId }: { jobId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await callAction(() =>
        addNote({ record: { kind: "job", id: jobId }, body }),
      );
      if (result.ok) {
        setBody("");
        setError(undefined);
        return;
      }
      setError(result.message);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        aria-label="New note"
        placeholder="Add a note"
        required
        maxLength={4000}
      />
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="secondary"
        size="lg"
        disabled={isPending}
        className="min-h-11 w-fit"
      >
        Add note
      </Button>
    </form>
  );
}

function NoteEntry({ note, canEdit }: { note: Note; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await callAction(() =>
        editNote({
          id: note.id,
          updatedAt: note.updatedAt.toISOString(),
          body,
        }),
      );
      if (result.ok) {
        setEditing(false);
        setError(undefined);
        return;
      }
      setError(result.message);
    });
  }

  return (
    <li className="flex flex-col gap-2 py-3 text-sm">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium">{ACTOR_LABELS[note.author]}</span>
        <time
          dateTime={note.createdAt.toISOString()}
          className="text-muted-foreground text-xs"
        >
          {WHEN.format(note.createdAt)}
        </time>
      </p>
      {editing ? (
        <form onSubmit={save} className="flex flex-col gap-2">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            aria-label="Note"
            required
            maxLength={4000}
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              size="lg"
              disabled={isPending}
              className="min-h-11"
            >
              Save
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setEditing(false)}
              className="min-h-11"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <p className="whitespace-pre-wrap">{note.body}</p>
      )}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      {canEdit && !editing ? (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setEditing(true)}
            className="min-h-11"
          >
            Edit
          </Button>
          <DeleteButton
            what="this note"
            action={() => deleteNote({ id: note.id })}
          />
        </div>
      ) : null}
    </li>
  );
}

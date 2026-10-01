"use client";

import { cn } from "@repo/ui/lib/utils";
import { FileText, Upload, X } from "lucide-react";
import * as React from "react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface FileDropZoneProps
  extends Omit<
    React.ComponentProps<"div">,
    "onDrop" | "onDragOver" | "onDragLeave"
  > {
  /** The currently selected file, or null. Controlled. */
  value: File | null;
  /** Called with the new file, or null when cleared/rejected. */
  onValueChange: (file: File | null) => void;
  /** Accepted MIME type(s), forwarded to the file input. Defaults to PDF. */
  accept?: string;
  /** Max file size in bytes. Files over this are rejected with an inline error. */
  maxSizeBytes?: number;
  /** Hint text shown under the prompt in the empty state. */
  hint?: string;
  disabled?: boolean;
}

function FileDropZone({
  value,
  onValueChange,
  accept = "application/pdf",
  maxSizeBytes,
  hint,
  disabled,
  className,
  ...props
}: FileDropZoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const acceptedTypes = React.useMemo(
    () =>
      accept
        .split(",")
        .map((type) => type.trim())
        .filter(Boolean),
    [accept],
  );

  const validateAndSet = React.useCallback(
    (file: File | undefined) => {
      if (!file) return;

      if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
        setError("Unsupported file type.");
        return;
      }
      if (maxSizeBytes && file.size > maxSizeBytes) {
        setError(`File is too large (max ${formatBytes(maxSizeBytes)}).`);
        return;
      }

      setError(null);
      onValueChange(file);
    },
    [acceptedTypes, maxSizeBytes, onValueChange],
  );

  const clear = React.useCallback(() => {
    setError(null);
    onValueChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [onValueChange]);

  const zoneClassName = cn(
    "flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
    "data-[dragging]:border-ring data-[dragging]:bg-muted/50",
    value ? "border-border bg-muted/30" : "border-input",
    disabled && "opacity-50",
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop requires drop handlers on a container; the keyboard/click path is the inner <button>.
    <div
      className={cn("flex flex-col gap-1.5", className)}
      onDragOver={(event) => {
        if (disabled || value) return;
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (disabled || value) return;
        validateAndSet(event.dataTransfer.files?.[0]);
      }}
      {...props}
    >
      {value ? (
        <div
          data-slot="file-drop-zone"
          className={cn(zoneClassName, "flex-row justify-center gap-3")}
        >
          <FileText className="text-muted-foreground size-5 shrink-0" />
          <div className="flex min-w-0 flex-col items-start">
            <span className="max-w-full truncate text-sm font-medium">
              {value.name}
            </span>
            <span className="text-muted-foreground text-xs">
              {formatBytes(value.size)}
            </span>
          </div>
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            aria-label="Remove file"
            className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          data-slot="file-drop-zone"
          data-dragging={isDragging || undefined}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            zoneClassName,
            "focus-visible:border-ring focus-visible:ring-ring/50 cursor-pointer outline-none hover:bg-muted/40 focus-visible:ring-3 disabled:cursor-not-allowed",
          )}
        >
          <Upload className="text-muted-foreground size-5" />
          <span className="text-sm font-medium">
            Drag &amp; drop or{" "}
            <span className="text-primary underline-offset-4">browse</span>
          </span>
          {hint ? (
            <span className="text-muted-foreground text-xs">{hint}</span>
          ) : null}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => validateAndSet(event.target.files?.[0])}
      />

      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}

export { FileDropZone };

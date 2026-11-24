/** Hands the browser a text file to save, the way a download link would. */
export function downloadText(fileName: string, text: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // The click starts the download synchronously; the URL can go once it has.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

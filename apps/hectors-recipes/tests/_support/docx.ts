import { strToU8, zipSync } from "fflate";

// A small Word document (.docx) for tests: each paragraph's runs, as Word writes them. Copied
// into its own buffer, so it can be a File's contents.
export function docx(paragraphs: string[][]): Uint8Array<ArrayBuffer> {
  const body = paragraphs
    .map(
      (runs) =>
        `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>${runs
          .map((run) => `<w:r><w:t xml:space="preserve">${run}</w:t></w:r>`)
          .join("")}</w:p>`,
    )
    .join("");
  return new Uint8Array(
    zipSync({
      "[Content_Types].xml": strToU8(
        '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
      ),
      "word/document.xml": strToU8(
        `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>`,
      ),
    }),
  );
}

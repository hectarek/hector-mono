import { describe, expect, it } from "bun:test";
import { strToU8, zipSync } from "fflate";
import { docxText } from "@/app/_lib/docx-text";
import { docx } from "@/tests/_support/docx";

// D74: a Word document is read as the text of its paragraphs.
describe("docxText", () => {
  it("reads each paragraph as a line, its runs joined", () => {
    expect(
      docxText(
        docx([
          ["Grandma's ", "Chili"],
          [],
          ["1 lb beans"],
          ["Simmer &amp; stir, 1&#189; hours &lt;covered&gt;."],
        ]),
      ),
    ).toBe("Grandma's Chili\n\n1 lb beans\nSimmer & stir, 1½ hours <covered>.");
  });

  it("keeps tabs and line breaks within a paragraph", () => {
    const bytes = zipSync({
      "word/document.xml": strToU8(
        "<w:document><w:body><w:p><w:r><w:t>1 cup</w:t><w:tab/><w:t>flour</w:t><w:br/><w:t>sifted</w:t></w:r></w:p></w:body></w:document>",
      ),
    });
    expect(docxText(bytes)).toBe("1 cup\tflour\nsifted");
  });

  it("finds nothing in a file that isn't a Word document", () => {
    expect(docxText(strToU8("Chili\n1 lb beans"))).toBe(null);
    expect(docxText(zipSync({ "notes.txt": strToU8("Chili") }))).toBe(null);
  });
});

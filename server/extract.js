import fs from "node:fs";

const CHUNK_SIZE = 1200;

export async function extractPdfPages(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    isEvalSupported: false,
    disableWorker: true,
  }).promise;

  const pages = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push({ pageNumber, text });
  }
  return pages;
}

export function chunkPages(pages, chunkSize = CHUNK_SIZE) {
  const chunks = [];
  for (const page of pages) {
    if (!page.text) continue;
    let chunkIndex = 0;
    for (let i = 0; i < page.text.length; i += chunkSize) {
      chunks.push({
        pageNumber: page.pageNumber,
        chunkIndex,
        content: page.text.slice(i, i + chunkSize),
      });
      chunkIndex += 1;
    }
  }
  return chunks;
}

export function isLikelyScanned(pages) {
  const totalChars = pages.reduce((sum, page) => sum + page.text.length, 0);
  return pages.length > 0 && totalChars < 40;
}

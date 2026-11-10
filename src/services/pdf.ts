import { DEFAULT_CHUNK_SIZE } from "@/lib/constants";

export type ExtractedPage = {
  pageNumber: number;
  text: string;
};

export type ExtractedChunk = {
  pageNumber: number;
  chunkIndex: number;
  content: string;
};

export async function extractPdfPages(file: File): Promise<ExtractedPage[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: ExtractedPage[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .trim();
    pages.push({ pageNumber, text });
  }

  return pages;
}

export function chunkPages(
  pages: ExtractedPage[],
  chunkSize = DEFAULT_CHUNK_SIZE,
): ExtractedChunk[] {
  const chunks: ExtractedChunk[] = [];

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

export function isLikelyScannedPdf(pages: ExtractedPage[]): boolean {
  const totalChars = pages.reduce((sum, page) => sum + page.text.length, 0);
  return pages.length > 0 && totalChars < 40;
}

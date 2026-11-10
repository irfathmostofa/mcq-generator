import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CHUNK_SIZE = 1200;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CMAP_URL = path.join(__dirname, "..", "node_modules", "pdfjs-dist", "cmaps") + path.sep;
const STANDARD_FONT_DATA_URL =
  path.join(__dirname, "..", "node_modules", "pdfjs-dist", "standard_fonts") + path.sep;

const BENGALI = /[\u0980-\u09FF]/;

export function repairBengaliSpacing(text) {
  return String(text || "")
    .replace(/([\u0980-\u09FF])(?:[\s\u00A0\u200B]+)(?=[\u0980-\u09FF])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldInsertSpace(prev, next, gap, lineBreak) {
  if (lineBreak) return true;
  if (!prev || !next) return false;
  if (BENGALI.test(prev) && BENGALI.test(next)) return gap > 3.2;
  if (gap > 1.6) return true;
  return false;
}

function itemsToText(items) {
  let text = "";
  let lastEnd = null;
  let lastY = null;
  let lastChar = "";

  for (const item of items) {
    if (!item || typeof item.str !== "string" || !item.str) continue;
    const transform = item.transform || [1, 0, 0, 1, 0, 0];
    const x = transform[4];
    const y = transform[5];
    const width = typeof item.width === "number" ? item.width : 0;
    const lineBreak = lastY !== null && Math.abs(y - lastY) > 2.4;
    const gap = lastEnd === null ? 0 : x - lastEnd;
    const firstChar = item.str[0];
    if (shouldInsertSpace(lastChar, firstChar, gap, lineBreak) && !text.endsWith(" ")) {
      text += " ";
    }
    text += item.str;
    lastChar = item.str[item.str.length - 1];
    lastEnd = x + width;
    lastY = y;
  }

  return repairBengaliSpacing(text);
}

export async function extractPdfPages(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    isEvalSupported: false,
    disableWorker: true,
    cMapUrl: CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  }).promise;

  const pages = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = itemsToText(content.items);
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
        content: repairBengaliSpacing(page.text.slice(i, i + chunkSize)),
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

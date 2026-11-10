import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CHUNK_SIZE = 1200;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CMAP_URL =
  path.join(__dirname, "..", "node_modules", "pdfjs-dist", "cmaps") + path.sep;
const STANDARD_FONT_DATA_URL =
  path.join(__dirname, "..", "node_modules", "pdfjs-dist", "standard_fonts") +
  path.sep;

const BENGALI_LETTER = /[\u0980-\u09FF]/;
const BENGALI_MARK =
  /[\u09BC\u09BE-\u09C4\u09C7-\u09C8\u09CB-\u09CD\u09D7\u09E2-\u09E3\u09FE]/;

export function repairBengaliSpacing(text) {
  let next = String(text || "")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B\uFEFF]/g, "");
  next = next.replace(
    /([\u0980-\u09FF])[ \t]+(?=[\u09BC\u09BE-\u09C4\u09C7-\u09C8\u09CB-\u09CD\u09D7\u09E2-\u09E3\u09FE])/g,
    "$1",
  );
  next = next.replace(/([\u09CD])[ \t]+(?=[\u0980-\u09FF])/g, "$1");
  next = next.replace(/([\u0980-\u09FF])[ \t]+(?=[\u09CD])/g, "$1");
  const tokens = next.match(/[\u0980-\u09FF]+/g) || [];
  const short = tokens.filter((token) => token.length <= 2).length;
  if (tokens.length >= 2 && short / tokens.length >= 0.5) {
    next = next.replace(/([\u0980-\u09FF])[ \t]+(?=[\u0980-\u09FF])/g, "$1");
  }
  return next
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function isBengaliChar(value) {
  return Boolean(value) && BENGALI_LETTER.test(value);
}

function shouldInsertSpace(prev, next, gap, fontSize, lineBreak, hasEOL) {
  if (!prev || !next) return false;
  if (hasEOL || lineBreak) return true;
  if (next === " " || prev === " ") return false;
  if (BENGALI_MARK.test(next) || next === "\u09CD" || prev === "\u09CD")
    return false;
  if (isBengaliChar(prev) && isBengaliChar(next)) {
    return gap > fontSize * 0.45;
  }
  return gap > fontSize * 0.16;
}

function itemsToText(items) {
  let text = "";
  let lastEnd = null;
  let lastY = null;
  let lastChar = "";
  let lastFontSize = 10;

  for (const item of items) {
    if (!item || typeof item.str !== "string" || !item.str) continue;
    const transform = Array.isArray(item.transform)
      ? item.transform
      : [1, 0, 0, 1, 0, 0];
    const x = transform[4];
    const y = transform[5];
    const fontSize =
      Math.abs(transform[0] || transform[3] || lastFontSize) || lastFontSize;
    const width =
      typeof item.width === "number" && item.width > 0
        ? item.width
        : item.str.length * fontSize * 0.55;
    const lineBreak = lastY !== null && Math.abs(y - lastY) > fontSize * 0.55;
    const gap = lastEnd === null ? 0 : x - lastEnd;
    const firstChar = item.str[0];
    if (
      shouldInsertSpace(
        lastChar,
        firstChar,
        gap,
        fontSize,
        lineBreak,
        Boolean(item.hasEOL),
      ) &&
      !text.endsWith(" ")
    ) {
      text += " ";
    }
    text += item.str;
    lastChar = item.str[item.str.length - 1];
    lastEnd = x + width;
    lastY = y;
    lastFontSize = fontSize;
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
    const content = await page.getTextContent({
      disableCombineTextItems: false,
    });
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

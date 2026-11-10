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
  next = next.replace(
    /([\u0985-\u09B9\u09CE\u09DC-\u09E1])[ \t]+(?=[\u09CD])/g,
    "$1",
  );
  return next
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim();
}

export function isReadableBengali(text) {
  const tokens = String(text || "").match(/[\u0980-\u09FF]+/g) || [];
  if (tokens.length === 0) return true;
  const total = tokens.reduce((sum, token) => sum + token.length, 0);
  if (total < 24) return true;
  const average = total / tokens.length;
  const singles = tokens.filter((token) => token.length === 1).length;
  if (tokens.length === 1) return false;
  if (tokens.length >= 6 && singles / tokens.length >= 0.45) return false;
  if (tokens.length >= 4 && average < 2.8) return false;
  return average <= 16;
}

function isBengaliChar(value) {
  return Boolean(value) && BENGALI_LETTER.test(value);
}

function shouldInsertSpace(prev, next, gap, fontSize) {
  if (!prev || !next) return false;
  if (next === " " || prev === " ") return false;
  if (BENGALI_MARK.test(next) || next === "\u09CD" || prev === "\u09CD") {
    return false;
  }
  const threshold = isBengaliChar(prev) && isBengaliChar(next)
    ? fontSize * 0.28
    : fontSize * 0.16;
  return gap > threshold;
}

function normalizeItem(item) {
  if (!item || typeof item.str !== "string" || !item.str) return null;
  const transform = Array.isArray(item.transform)
    ? item.transform
    : [1, 0, 0, 1, 0, 0];
  const fontSize = Math.abs(transform[0] || transform[3] || 10) || 10;
  const width =
    typeof item.width === "number" && item.width > 0
      ? item.width
      : item.str.length * fontSize * 0.4;
  return {
    str: item.str,
    x: transform[4],
    y: transform[5],
    fontSize,
    width,
  };
}

function itemsToText(items) {
  const usable = [];
  for (const item of items) {
    const normalized = normalizeItem(item);
    if (normalized) usable.push(normalized);
  }
  if (usable.length === 0) return "";

  const avgFont =
    usable.reduce((sum, item) => sum + item.fontSize, 0) / usable.length;
  const yThreshold = avgFont * 0.5;

  usable.sort((a, b) => {
    if (Math.abs(a.y - b.y) > yThreshold) return b.y - a.y;
    return a.x - b.x;
  });

  const lines = [];
  for (const item of usable) {
    const current = lines[lines.length - 1];
    if (!current || Math.abs(current[0].y - item.y) > yThreshold) {
      lines.push([item]);
    } else {
      current.push(item);
    }
  }

  const lineTexts = lines.map((line) => {
    line.sort((a, b) => a.x - b.x);
    let text = "";
    let lastEnd = null;
    let lastChar = "";
    for (const item of line) {
      const gap = lastEnd === null ? 0 : item.x - lastEnd;
      if (
        shouldInsertSpace(lastChar, item.str[0], gap, item.fontSize) &&
        !text.endsWith(" ")
      ) {
        text += " ";
      }
      text += item.str;
      lastChar = item.str[item.str.length - 1];
      lastEnd = item.x + item.width;
    }
    return text;
  });

  return repairBengaliSpacing(lineTexts.join(" "));
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

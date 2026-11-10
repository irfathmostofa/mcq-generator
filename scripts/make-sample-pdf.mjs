import fs from "node:fs";
import path from "node:path";

const lines = [
  "Bangladesh Affairs source material.",
  "The Language Movement of 1952 is a defining event in Bangladesh history.",
  "21 February is observed as International Mother Language Day.",
  "Bangladesh declared independence on 26 March 1971.",
  "Victory Day is observed on 16 December.",
  "Dhaka is the capital city of Bangladesh.",
  "The Constitution of Bangladesh was adopted in 1972.",
  "The Padma is one of the major rivers of Bangladesh.",
  "The Liberation War lasted from March to December 1971.",
  "Sheikh Mujibur Rahman is widely regarded as the Father of the Nation.",
  "The national anthem of Bangladesh is Amar Shonar Bangla.",
];

function pdfEscape(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

const content = [
  "BT",
  "/F1 12 Tf",
  "50 760 Td",
  "14 TL",
  ...lines.map((line) => `(${pdfEscape(line)}) Tj T*`),
  "ET",
].join("\n");

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
  `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
];

let body = "%PDF-1.4\n";
const offsets = [0];
objects.forEach((object, index) => {
  offsets.push(body.length);
  body += `${index + 1} 0 obj\n${object}\nendobj\n`;
});
const xrefStart = body.length;
body += `xref\n0 ${objects.length + 1}\n`;
body += "0000000000 65535 f \n";
for (let i = 1; i <= objects.length; i += 1) {
  body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}
body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

const out = path.join(process.cwd(), "public/samples/bangladesh-history.pdf");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, body);
console.log("wrote", out);

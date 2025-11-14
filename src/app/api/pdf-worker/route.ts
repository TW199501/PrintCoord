import { NextResponse } from "next/server";
import path from "path";
import { promises as fsp } from "fs";

const candidates = [
  path.join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    "build",
    "pdf.worker.min.js"
  ),
  path.join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    "legacy",
    "build",
    "pdf.worker.min.js"
  ),
  path.join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    "build",
    "pdf.worker.min.mjs"
  ),
];

export async function GET() {
  for (const p of candidates) {
    try {
      const buf = await fsp.readFile(p);
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/javascript",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (_) {
      // try next
    }
  }
  return NextResponse.json({ error: "PDF worker not found" }, { status: 404 });
}

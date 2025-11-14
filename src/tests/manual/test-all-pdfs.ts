// Test all PDFs with the new pdf2json service
import fs from "fs";
import path from "path";
import { PDF2JSONService } from "./src/services/pdf2jsonService";

async function testPDF(filename: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing: ${filename}`);
  console.log("=".repeat(60));

  const pdfPath = path.join(__dirname, "public", filename);

  if (!fs.existsSync(pdfPath)) {
    console.error(`File not found: ${pdfPath}`);
    return;
  }

  const pdfBuffer = fs.readFileSync(pdfPath);

  try {
    const fields = await PDF2JSONService.detectFieldsFromPDF(pdfBuffer);

    console.log(`\n✅ Successfully detected ${fields.length} fields\n`);

    if (fields.length > 0) {
      console.log("First 15 fields:");
      fields.slice(0, 15).forEach((field, idx) => {
        console.log(`${idx + 1}. [${field.name}] "${field.defaultValue}"`);
      });

      // Group by rows
      const rowMap = new Map<number, typeof fields>();
      fields.forEach((field) => {
        const rowMatch = field.id.match(/r(\d+)/);
        if (rowMatch) {
          const rowNum = parseInt(rowMatch[1]);
          if (!rowMap.has(rowNum)) {
            rowMap.set(rowNum, []);
          }
          rowMap.get(rowNum)!.push(field);
        }
      });

      console.log(`\n--- Fields by Row (first 5 rows) ---`);
      console.log(`Total rows: ${rowMap.size}\n`);

      Array.from(rowMap.entries())
        .sort((a, b) => a[0] - b[0])
        .slice(0, 5)
        .forEach(([rowNum, rowFields]) => {
          const sortedFields = rowFields.sort((a, b) => {
            const aCol = parseInt(a.id.match(/c(\d+)/)?.[1] || "0");
            const bCol = parseInt(b.id.match(/c(\d+)/)?.[1] || "0");
            return aCol - bCol;
          });

          console.log(`Row ${rowNum} (${rowFields.length} cells):`);
          console.log(
            `  ${sortedFields.map((f) => f.defaultValue).join(" | ")}\n`
          );
        });
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function runAllTests() {
  const pdfs = ["test-pdf01.pdf", "test-pdf02.pdf", "test-pdf03.pdf"];

  for (const pdf of pdfs) {
    await testPDF(pdf);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("All tests complete!");
  console.log("=".repeat(60));
}

runAllTests();

// Test script for pdf-parse library
// Run with: node test-pdf-parse.js

const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");

async function testPDFParse() {
  try {
    console.log("=== Testing pdf-parse library ===\n");

    const pdfPath = path.join(__dirname, "public", "test-pdf01.pdf");
    console.log(`Reading PDF: ${pdfPath}`);

    if (!fs.existsSync(pdfPath)) {
      console.error("PDF file not found!");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    console.log(`PDF buffer size: ${buffer.length} bytes\n`);

    // Test 1: Extract text
    console.log("--- Test 1: Extract Text ---");
    const parser1 = new PDFParse({ data: buffer });
    const textResult = await parser1.getText();
    await parser1.destroy();

    console.log(`Pages: ${textResult.pages.length}`);
    console.log(`Text length: ${textResult.text.length} characters`);
    console.log(`First 200 chars: ${textResult.text.substring(0, 200)}\n`);

    // Test 2: Extract tables
    console.log("--- Test 2: Extract Tables ---");
    const parser2 = new PDFParse({ data: buffer });
    const tableResult = await parser2.getTable();
    await parser2.destroy();

    console.log(`Pages processed: ${tableResult.pages.length}`);

    tableResult.pages.forEach((page, pageIndex) => {
      console.log(`\nPage ${pageIndex + 1}:`);

      if (!page.tables || page.tables.length === 0) {
        console.log("  No tables found");
        return;
      }

      console.log(`  Tables found: ${page.tables.length}`);

      page.tables.forEach((table, tableIndex) => {
        console.log(`\n  Table ${tableIndex + 1}:`);
        console.log(`    Rows: ${table.length}`);

        if (table.length > 0) {
          console.log(`    Columns: ${table[0].length}`);
          console.log("\n    First 3 rows:");

          table.slice(0, 3).forEach((row, rowIndex) => {
            console.log(`      Row ${rowIndex + 1}: ${JSON.stringify(row)}`);
          });
        }
      });
    });

    // Test 3: Extract metadata
    console.log("\n--- Test 3: Extract Metadata ---");
    const parser3 = new PDFParse({ data: buffer });
    const infoResult = await parser3.getInfo();
    await parser3.destroy();

    console.log("PDF Info:");
    console.log(JSON.stringify(infoResult.info, null, 2));

    console.log("\n=== Test Complete ===");
  } catch (error) {
    console.error("Error during testing:", error);
    console.error("Stack:", error.stack);
  }
}

testPDFParse();

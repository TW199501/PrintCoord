// Test script for pdf.js-extract library
// Run with: node test-pdfjs-extract.js

const { PDFExtract } = require("pdf.js-extract");
const path = require("path");

async function testPDFJSExtract() {
  try {
    console.log("=== Testing pdf.js-extract library ===\n");

    const pdfPath = path.join(__dirname, "public", "test-pdf01.pdf");
    console.log(`Reading PDF: ${pdfPath}\n`);

    const pdfExtract = new PDFExtract();
    const options = {};

    const data = await pdfExtract.extract(pdfPath, options);

    console.log(`Pages: ${data.pages.length}`);
    console.log(`PDF Info:`, data.pdfInfo);

    data.pages.forEach((page, pageIndex) => {
      console.log(`\n=== Page ${pageIndex + 1} ===`);
      console.log(
        `Page dimensions: ${page.pageInfo.width} x ${page.pageInfo.height}`
      );
      console.log(`Content items: ${page.content.length}`);

      // Group content by Y coordinate to detect rows
      const rowMap = new Map();
      const threshold = 5; // pixels tolerance for same row

      page.content.forEach((item) => {
        if (!item.str.trim()) return;

        // Find existing row or create new one
        let foundRow = false;
        for (const [y, items] of rowMap.entries()) {
          if (Math.abs(item.y - y) < threshold) {
            items.push(item);
            foundRow = true;
            break;
          }
        }

        if (!foundRow) {
          rowMap.set(item.y, [item]);
        }
      });

      console.log(`\nDetected rows: ${rowMap.size}`);

      // Sort rows by Y coordinate
      const sortedRows = Array.from(rowMap.entries()).sort(
        (a, b) => a[0] - b[0]
      );

      console.log("\nFirst 10 rows with coordinates:");
      sortedRows.slice(0, 10).forEach(([y, items], rowIndex) => {
        // Sort items in row by X coordinate
        const sortedItems = items.sort((a, b) => a.x - b.x);
        const rowText = sortedItems.map((item) => item.str).join(" | ");
        console.log(`Row ${rowIndex + 1} (y=${y.toFixed(1)}): ${rowText}`);
      });

      // Detect potential table structure
      console.log("\n--- Analyzing Table Structure ---");

      // Collect all X coordinates (potential column boundaries)
      const xCoords = new Set();
      page.content.forEach((item) => {
        if (item.str.trim()) {
          xCoords.add(Math.round(item.x));
        }
      });

      const sortedXCoords = Array.from(xCoords).sort((a, b) => a - b);
      console.log(`Unique X coordinates: ${sortedXCoords.length}`);
      console.log(`X coords: ${sortedXCoords.slice(0, 10).join(", ")}...`);

      // Detect potential cells
      console.log("\n--- Sample Content Items (first 20) ---");
      page.content.slice(0, 20).forEach((item, index) => {
        if (item.str.trim()) {
          console.log(
            `${index + 1}. "${item.str}" at (${item.x.toFixed(
              1
            )}, ${item.y.toFixed(1)}) w=${item.width.toFixed(
              1
            )} h=${item.height.toFixed(1)}`
          );
        }
      });
    });

    console.log("\n=== Test Complete ===");
  } catch (error) {
    console.error("Error during testing:", error);
    console.error("Stack:", error.stack);
  }
}

testPDFJSExtract();

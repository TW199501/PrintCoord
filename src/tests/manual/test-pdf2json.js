// Test script for pdf2json library
// Run with: node test-pdf2json.js

const PDFParser = require("pdf2json");
const path = require("path");
const fs = require("fs");

async function testPDF2JSON() {
  try {
    console.log("=== Testing pdf2json library ===\n");

    const pdfPath = path.join(__dirname, "public", "test-pdf01.pdf");
    console.log(`Reading PDF: ${pdfPath}\n`);

    const pdfParser = new PDFParser();

    // Set up event handlers
    pdfParser.on("pdfParser_dataError", (errData) => {
      console.error("Parse error:", errData.parserError);
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      console.log("=== PDF Data Ready ===\n");

      // Save raw JSON for inspection
      const jsonPath = path.join(__dirname, "pdf2json-output.json");
      fs.writeFileSync(jsonPath, JSON.stringify(pdfData, null, 2));
      console.log(`Raw JSON saved to: ${jsonPath}\n`);

      console.log(`Pages: ${pdfData.Pages.length}`);
      console.log(`PDF Meta:`, pdfData.Meta);

      pdfData.Pages.forEach((page, pageIndex) => {
        console.log(`\n=== Page ${pageIndex + 1} ===`);
        console.log(`Width: ${page.Width}, Height: ${page.Height}`);
        console.log(`Texts: ${page.Texts.length}`);
        console.log(`Fills: ${page.Fills.length}`);
        console.log(`HLines: ${page.HLines ? page.HLines.length : 0}`);
        console.log(`VLines: ${page.VLines ? page.VLines.length : 0}`);

        // Analyze text positions
        console.log("\n--- Text Content with Positions ---");
        console.log("(x, y coordinates are in PDF units)\n");

        // Group texts by Y coordinate (rows)
        const rowMap = new Map();
        const threshold = 0.5; // PDF units tolerance

        page.Texts.forEach((text, index) => {
          const decodedText = decodeURIComponent(text.R[0].T);
          if (!decodedText.trim()) return;

          // Find existing row or create new one
          let foundRow = false;
          for (const [y, items] of rowMap.entries()) {
            if (Math.abs(text.y - y) < threshold) {
              items.push({
                x: text.x,
                y: text.y,
                text: decodedText,
                width: text.w,
              });
              foundRow = true;
              break;
            }
          }

          if (!foundRow) {
            rowMap.set(text.y, [
              { x: text.x, y: text.y, text: decodedText, width: text.w },
            ]);
          }
        });

        console.log(`Detected rows: ${rowMap.size}\n`);

        // Sort rows by Y coordinate
        const sortedRows = Array.from(rowMap.entries()).sort(
          (a, b) => a[0] - b[0]
        );

        console.log("First 15 rows:");
        sortedRows.slice(0, 15).forEach(([y, items], rowIndex) => {
          // Sort items in row by X coordinate
          const sortedItems = items.sort((a, b) => a.x - b.x);
          const rowText = sortedItems.map((item) => item.text).join(" | ");
          console.log(`Row ${rowIndex + 1} (y=${y.toFixed(2)}): ${rowText}`);
        });

        // Analyze lines (table borders)
        if (page.HLines && page.HLines.length > 0) {
          console.log("\n--- Horizontal Lines (Table Borders) ---");
          console.log(`Total H-Lines: ${page.HLines.length}`);
          page.HLines.slice(0, 10).forEach((line, index) => {
            console.log(
              `  ${index + 1}. x=${line.x.toFixed(2)}, y=${line.y.toFixed(
                2
              )}, length=${line.l.toFixed(2)}, width=${line.w}`
            );
          });
        }

        if (page.VLines && page.VLines.length > 0) {
          console.log("\n--- Vertical Lines (Table Borders) ---");
          console.log(`Total V-Lines: ${page.VLines.length}`);
          page.VLines.slice(0, 10).forEach((line, index) => {
            console.log(
              `  ${index + 1}. x=${line.x.toFixed(2)}, y=${line.y.toFixed(
                2
              )}, length=${line.l.toFixed(2)}, width=${line.w}`
            );
          });
        }

        // Collect unique X and Y coordinates for grid detection
        const xCoords = new Set();
        const yCoords = new Set();

        page.Texts.forEach((text) => {
          xCoords.add(text.x.toFixed(2));
          yCoords.add(text.y.toFixed(2));
        });

        console.log(`\n--- Grid Analysis ---`);
        console.log(`Unique X positions: ${xCoords.size}`);
        console.log(`Unique Y positions: ${yCoords.size}`);

        // Show sample text items with full details
        console.log("\n--- Sample Text Items (first 10) ---");
        page.Texts.slice(0, 10).forEach((text, index) => {
          const decodedText = decodeURIComponent(text.R[0].T);
          if (decodedText.trim()) {
            console.log(
              `${index + 1}. "${decodedText}" at (x=${text.x.toFixed(
                2
              )}, y=${text.y.toFixed(2)}) w=${
                text.w ? text.w.toFixed(2) : "N/A"
              }`
            );
          }
        });
      });

      console.log("\n=== Test Complete ===");
      console.log("Check pdf2json-output.json for full data structure");
    });

    // Load and parse the PDF
    pdfParser.loadPDF(pdfPath);
  } catch (error) {
    console.error("Error during testing:", error);
    console.error("Stack:", error.stack);
  }
}

testPDF2JSON();

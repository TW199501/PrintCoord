// Test PDF02 with pdf2json
// Run with: node test-pdf02-analysis.js

const PDFParser = require("pdf2json");
const fs = require("fs");
const path = require("path");

// Merge close coordinates
function mergeCloseCoordinates(coords, threshold) {
  if (coords.length === 0) return [];
  const sorted = [...new Set(coords)].sort((a, b) => a - b);
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - merged[merged.length - 1] > threshold) {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

// Detect grid from text positions
function detectGridFromTextPositions(page) {
  const texts = page.Texts.filter((t) => {
    const decoded = decodeURIComponent(t.R[0].T);
    return decoded.trim().length > 0;
  });

  // Collect all X and Y coordinates
  const xCoords = texts.map((t) => t.x);
  const yCoords = texts.map((t) => t.y);

  // Merge close coordinates to find grid lines
  const threshold = 0.3; // PDF units
  const gridX = mergeCloseCoordinates(xCoords, threshold);
  const gridY = mergeCloseCoordinates(yCoords, threshold);

  return { gridX, gridY, texts };
}

// Group texts by row and merge horizontally adjacent texts
function groupTextsByRow(page) {
  const texts = page.Texts.filter((t) => {
    const decoded = decodeURIComponent(t.R[0].T);
    return decoded.trim().length > 0;
  });

  // Group by Y coordinate (rows)
  const rowMap = new Map();
  const yThreshold = 0.3;

  texts.forEach((text) => {
    const decoded = decodeURIComponent(text.R[0].T);
    let foundRow = false;

    for (const [y, items] of rowMap.entries()) {
      if (Math.abs(text.y - y) < yThreshold) {
        items.push({ ...text, decoded });
        foundRow = true;
        break;
      }
    }

    if (!foundRow) {
      rowMap.set(text.y, [{ ...text, decoded }]);
    }
  });

  // Sort rows by Y
  const sortedRows = Array.from(rowMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([y, items]) => {
      // Sort items in row by X
      const sortedItems = items.sort((a, b) => a.x - b.x);

      // Merge horizontally adjacent texts
      const merged = [];
      let currentGroup = [sortedItems[0]];

      for (let i = 1; i < sortedItems.length; i++) {
        const prev = currentGroup[currentGroup.length - 1];
        const curr = sortedItems[i];

        // If close horizontally (within 0.5 units), merge
        if (curr.x - (prev.x + (prev.w || 0.5)) < 0.5) {
          currentGroup.push(curr);
        } else {
          // Save current group and start new one
          merged.push({
            x: currentGroup[0].x,
            y: y,
            text: currentGroup.map((t) => t.decoded).join(""),
            items: currentGroup,
          });
          currentGroup = [curr];
        }
      }

      // Don't forget last group
      if (currentGroup.length > 0) {
        merged.push({
          x: currentGroup[0].x,
          y: y,
          text: currentGroup.map((t) => t.decoded).join(""),
          items: currentGroup,
        });
      }

      return { y, cells: merged };
    });

  return sortedRows;
}

async function testPDF02() {
  try {
    console.log("=== Testing test-pdf02.pdf ===\n");

    const pdfPath = path.join(__dirname, "public", "test-pdf02.pdf");
    console.log(`Reading PDF: ${pdfPath}\n`);

    if (!fs.existsSync(pdfPath)) {
      console.error("PDF file not found!");
      return;
    }

    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData) => {
      console.error("Parse error:", errData.parserError);
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      console.log("PDF parsed successfully!\n");

      // Save raw JSON
      const jsonPath = path.join(__dirname, "pdf02-output.json");
      fs.writeFileSync(jsonPath, JSON.stringify(pdfData, null, 2));
      console.log(`Raw JSON saved to: ${jsonPath}\n`);

      pdfData.Pages.forEach((page, pageIndex) => {
        console.log(`=== Page ${pageIndex + 1} ===`);
        console.log(`  Dimensions: ${page.Width} x ${page.Height}`);
        console.log(`  Total texts: ${page.Texts.length}`);
        console.log(`  HLines: ${page.HLines?.length || 0}`);
        console.log(`  VLines: ${page.VLines?.length || 0}`);
        console.log(`  Fills: ${page.Fills?.length || 0}\n`);

        // Analyze grid
        const { gridX, gridY } = detectGridFromTextPositions(page);
        console.log(`  Grid Analysis:`);
        console.log(`    Unique X positions: ${gridX.length}`);
        console.log(`    Unique Y positions: ${gridY.length}`);
        console.log(`    Potential columns: ${gridX.length}`);
        console.log(`    Potential rows: ${gridY.length}\n`);

        // Group texts by row with merging
        const rows = groupTextsByRow(page);
        console.log(`  Detected ${rows.length} rows with merged text\n`);

        // Show first 15 rows
        console.log("--- First 15 Rows (with merged text) ---\n");
        rows.slice(0, 15).forEach((row, idx) => {
          console.log(
            `Row ${idx + 1} (y=${row.y.toFixed(2)}) - ${
              row.cells.length
            } cells:`
          );
          row.cells.forEach((cell, cellIdx) => {
            console.log(`  Cell ${cellIdx + 1}: "${cell.text}"`);
          });
          console.log("");
        });

        // Show lines if any
        if (page.HLines && page.HLines.length > 0) {
          console.log("\n--- Horizontal Lines ---");
          page.HLines.slice(0, 10).forEach((line, idx) => {
            console.log(
              `  ${idx + 1}. x=${line.x.toFixed(2)}, y=${line.y.toFixed(
                2
              )}, length=${line.l.toFixed(2)}`
            );
          });
        }

        if (page.VLines && page.VLines.length > 0) {
          console.log("\n--- Vertical Lines ---");
          page.VLines.slice(0, 10).forEach((line, idx) => {
            console.log(
              `  ${idx + 1}. x=${line.x.toFixed(2)}, y=${line.y.toFixed(
                2
              )}, length=${line.l.toFixed(2)}`
            );
          });
        }
      });

      console.log("\n=== Test Complete ===");
    });

    pdfParser.loadPDF(pdfPath);
  } catch (error) {
    console.error("Error during testing:", error);
    console.error("Stack:", error.stack);
  }
}

testPDF02();

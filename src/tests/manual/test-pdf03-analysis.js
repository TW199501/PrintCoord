// Test PDF03 with pdf2json
// Run with: node test-pdf03-analysis.js

const PDFParser = require("pdf2json");
const fs = require("fs");
const path = require("path");

// Merge horizontally adjacent text items
function mergeAdjacentTexts(texts, threshold = 0.5) {
  if (texts.length === 0) return [];

  const sorted = texts.sort((a, b) => a.x - b.x);
  const merged = [];
  let currentGroup = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = currentGroup[currentGroup.length - 1];
    const curr = sorted[i];

    const prevEnd = prev.x + (prev.w || 0.5);

    if (curr.x - prevEnd < threshold) {
      currentGroup.push(curr);
    } else {
      merged.push({
        x: currentGroup[0].x,
        y: currentGroup[0].y,
        text: currentGroup.map((t) => decodeURIComponent(t.R[0].T)).join(""),
        width: curr.x - currentGroup[0].x,
        items: currentGroup,
      });
      currentGroup = [curr];
    }
  }

  if (currentGroup.length > 0) {
    const lastItem = currentGroup[currentGroup.length - 1];
    merged.push({
      x: currentGroup[0].x,
      y: currentGroup[0].y,
      text: currentGroup.map((t) => decodeURIComponent(t.R[0].T)).join(""),
      width: lastItem.x + (lastItem.w || 0.5) - currentGroup[0].x,
      items: currentGroup,
    });
  }

  return merged;
}

// Analyze Fills to detect lines
function analyzeFills(fills) {
  const horizontalLines = [];
  const verticalLines = [];
  const otherFills = [];

  fills.forEach((fill) => {
    // Horizontal line: very thin height
    if (fill.h < 0.2 && fill.w > 1) {
      horizontalLines.push(fill);
    }
    // Vertical line: very thin width
    else if (fill.w < 0.2 && fill.h > 1) {
      verticalLines.push(fill);
    }
    // Other fills (backgrounds, etc.)
    else {
      otherFills.push(fill);
    }
  });

  return { horizontalLines, verticalLines, otherFills };
}

async function testPDF03() {
  try {
    console.log("=== Testing test-pdf03.pdf ===\n");

    const pdfPath = path.join(__dirname, "public", "test-pdf03.pdf");
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
      const jsonPath = path.join(__dirname, "pdf03-output.json");
      fs.writeFileSync(jsonPath, JSON.stringify(pdfData, null, 2));
      console.log(`Raw JSON saved to: ${jsonPath}\n`);

      pdfData.Pages.forEach((page, pageIndex) => {
        console.log(`=== Page ${pageIndex + 1} ===`);
        console.log(
          `  Dimensions: ${page.Width.toFixed(2)} x ${page.Height.toFixed(2)}`
        );
        console.log(`  Total texts: ${page.Texts.length}`);
        console.log(`  HLines: ${page.HLines?.length || 0}`);
        console.log(`  VLines: ${page.VLines?.length || 0}`);
        console.log(`  Fills: ${page.Fills?.length || 0}\n`);

        // Analyze Fills
        if (page.Fills && page.Fills.length > 0) {
          const { horizontalLines, verticalLines, otherFills } = analyzeFills(
            page.Fills
          );
          console.log(`  Fills Analysis:`);
          console.log(
            `    Horizontal lines (h<0.2): ${horizontalLines.length}`
          );
          console.log(`    Vertical lines (w<0.2): ${verticalLines.length}`);
          console.log(`    Other fills: ${otherFills.length}\n`);

          if (horizontalLines.length > 0) {
            console.log("  First 10 horizontal lines:");
            horizontalLines.slice(0, 10).forEach((line, idx) => {
              console.log(
                `    ${idx + 1}. x=${line.x.toFixed(2)}, y=${line.y.toFixed(
                  2
                )}, w=${line.w.toFixed(2)}, h=${line.h.toFixed(3)}`
              );
            });
            console.log("");
          }

          if (verticalLines.length > 0) {
            console.log("  First 10 vertical lines:");
            verticalLines.slice(0, 10).forEach((line, idx) => {
              console.log(
                `    ${idx + 1}. x=${line.x.toFixed(2)}, y=${line.y.toFixed(
                  2
                )}, w=${line.w.toFixed(3)}, h=${line.h.toFixed(2)}`
              );
            });
            console.log("");
          }
        }

        // Group texts by row with merging
        const rowMap = new Map();
        const yThreshold = 0.3;

        page.Texts.forEach((text) => {
          const decoded = decodeURIComponent(text.R[0].T);
          if (!decoded.trim()) return;

          let foundRow = false;
          for (const [y, items] of rowMap.entries()) {
            if (Math.abs(text.y - y) < yThreshold) {
              items.push(text);
              foundRow = true;
              break;
            }
          }
          if (!foundRow) {
            rowMap.set(text.y, [text]);
          }
        });

        const rows = Array.from(rowMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([y, texts]) => {
            const merged = mergeAdjacentTexts(texts);
            return { y, cells: merged };
          });

        console.log(`  Detected ${rows.length} rows with merged text\n`);

        // Show first 20 rows
        console.log("--- First 20 Rows (with merged text) ---\n");
        rows.slice(0, 20).forEach((row, idx) => {
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

        // Show HLines and VLines if any
        if (page.HLines && page.HLines.length > 0) {
          console.log("\n--- HLines (first 10) ---");
          page.HLines.slice(0, 10).forEach((line, idx) => {
            console.log(
              `  ${idx + 1}. x=${line.x.toFixed(2)}, y=${line.y.toFixed(
                2
              )}, length=${line.l.toFixed(2)}`
            );
          });
        }

        if (page.VLines && page.VLines.length > 0) {
          console.log("\n--- VLines (first 10) ---");
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

testPDF03();

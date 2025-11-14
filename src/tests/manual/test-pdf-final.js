// Final improved PDF detection using pdf2json advanced features
// Run with: node test-pdf-final.js

const PDFParser = require("pdf2json");
const fs = require("fs");
const path = require("path");

// Use Fills to detect table cells
function detectCellsFromFills(page) {
  if (!page.Fills || page.Fills.length === 0) {
    return [];
  }

  // Filter fills that look like table cells (reasonable size, not full page background)
  const cells = page.Fills.filter((fill) => {
    // Skip full-page background fills
    if (fill.w > 30 || fill.h > 40) return false;
    // Skip tiny decorative fills
    if (fill.w < 0.5 || fill.h < 0.3) return false;
    return true;
  });

  console.log(`  Found ${cells.length} potential table cells from Fills`);
  return cells;
}

// Merge horizontally adjacent text items
function mergeAdjacentTexts(texts, threshold = 0.5) {
  if (texts.length === 0) return [];

  const sorted = texts.sort((a, b) => a.x - b.x);
  const merged = [];
  let currentGroup = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = currentGroup[currentGroup.length - 1];
    const curr = sorted[i];

    // Calculate expected end position of previous text
    const prevEnd = prev.x + (prev.w || 0.5);

    // If close horizontally, merge
    if (curr.x - prevEnd < threshold) {
      currentGroup.push(curr);
    } else {
      // Save current group
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

  // Don't forget last group
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

// Assign texts to cells based on position
function assignTextsToCells(cells, texts) {
  const cellsWithText = cells.map((cell) => {
    // Find texts that fall within this cell
    const cellTexts = texts.filter((text) => {
      return (
        text.x >= cell.x &&
        text.x <= cell.x + cell.w &&
        text.y >= cell.y &&
        text.y <= cell.y + cell.h
      );
    });

    return {
      ...cell,
      text: cellTexts
        .map((t) => t.text)
        .join(" ")
        .trim(),
    };
  });

  return cellsWithText.filter((cell) => cell.text.length > 0);
}

async function testPDFFinal(pdfFileName) {
  try {
    console.log(`\n=== Testing ${pdfFileName} with Advanced Detection ===\n`);

    const pdfPath = path.join(__dirname, "public", pdfFileName);
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

      pdfData.Pages.forEach((page, pageIndex) => {
        console.log(`=== Page ${pageIndex + 1} ===`);
        console.log(
          `  Dimensions: ${page.Width.toFixed(2)} x ${page.Height.toFixed(2)}`
        );
        console.log(`  Texts: ${page.Texts.length}`);
        console.log(`  Fills: ${page.Fills?.length || 0}`);
        console.log(`  HLines: ${page.HLines?.length || 0}`);
        console.log(`  VLines: ${page.VLines?.length || 0}\n`);

        // Strategy 1: Use Fills as table cells
        const cells = detectCellsFromFills(page);

        if (cells.length > 0) {
          console.log(`\n--- Strategy: Using Fills as Table Cells ---`);

          // Group texts by row (Y coordinate)
          const rowMap = new Map();
          const yThreshold = 0.3;

          page.Texts.forEach((text) => {
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

          // Merge texts within each row
          const mergedTexts = [];
          rowMap.forEach((texts, y) => {
            const merged = mergeAdjacentTexts(texts);
            mergedTexts.push(...merged);
          });

          console.log(`  Merged texts: ${mergedTexts.length}`);

          // Assign texts to cells
          const cellsWithText = assignTextsToCells(cells, mergedTexts);

          console.log(`  Cells with text: ${cellsWithText.length}\n`);

          // Show first 20 cells
          console.log("First 20 cells with content:");
          cellsWithText.slice(0, 20).forEach((cell, idx) => {
            console.log(
              `${idx + 1}. [${cell.x.toFixed(2)}, ${cell.y.toFixed(2)}] "${
                cell.text
              }"`
            );
          });

          // Group by rows
          const cellRowMap = new Map();
          cellsWithText.forEach((cell) => {
            const rowKey = cell.y.toFixed(1);
            if (!cellRowMap.has(rowKey)) {
              cellRowMap.set(rowKey, []);
            }
            cellRowMap.get(rowKey).push(cell);
          });

          console.log(`\n--- Cells by Row (first 10 rows) ---`);
          console.log(`Total rows: ${cellRowMap.size}\n`);

          Array.from(cellRowMap.entries())
            .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
            .slice(0, 10)
            .forEach(([y, cells], idx) => {
              const sortedCells = cells.sort((a, b) => a.x - b.x);
              console.log(`Row ${idx + 1} (y=${y}) - ${cells.length} cells:`);
              console.log(`  ${sortedCells.map((c) => c.text).join(" | ")}\n`);
            });
        } else {
          console.log("\n--- No Fills found, using text-based detection ---");

          // Fallback to text-based detection
          const rowMap = new Map();
          const yThreshold = 0.3;

          page.Texts.forEach((text) => {
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

          console.log(`  Detected ${rowMap.size} rows\n`);

          // Show first 10 rows
          console.log("First 10 rows:");
          Array.from(rowMap.entries())
            .sort((a, b) => a[0] - b[0])
            .slice(0, 10)
            .forEach(([y, texts], idx) => {
              const merged = mergeAdjacentTexts(texts);
              console.log(
                `Row ${idx + 1} (y=${y.toFixed(2)}): ${merged
                  .map((t) => t.text)
                  .join(" | ")}`
              );
            });
        }
      });

      console.log("\n=== Test Complete ===\n");
    });

    pdfParser.loadPDF(pdfPath);
  } catch (error) {
    console.error("Error during testing:", error);
    console.error("Stack:", error.stack);
  }
}

// Test both PDFs
async function runTests() {
  await testPDFFinal("test-pdf01.pdf");

  setTimeout(() => {
    testPDFFinal("test-pdf02.pdf");
  }, 2000);
}

runTests();

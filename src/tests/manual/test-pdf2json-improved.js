// Improved PDF2JSON test with text-based grid detection
// Run with: node test-pdf2json-improved.js

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

  console.log(`  Detected ${gridX.length} unique X positions`);
  console.log(`  Detected ${gridY.length} unique Y positions`);
  console.log(
    `  X coords (first 10): ${gridX
      .slice(0, 10)
      .map((x) => x.toFixed(2))
      .join(", ")}`
  );
  console.log(
    `  Y coords (first 10): ${gridY
      .slice(0, 10)
      .map((y) => y.toFixed(2))
      .join(", ")}`
  );

  return { gridX, gridY };
}

// Detect fields using text-based grid
function detectFieldsFromTextGrid(page, pageIndex) {
  const { gridX, gridY } = detectGridFromTextPositions(page);
  const fields = [];

  // Create cells based on text positions
  for (let rowIdx = 0; rowIdx < gridY.length; rowIdx++) {
    for (let colIdx = 0; colIdx < gridX.length; colIdx++) {
      const cellX = gridX[colIdx];
      const cellY = gridY[rowIdx];

      // Define cell boundaries
      const cellWidth =
        colIdx < gridX.length - 1 ? gridX[colIdx + 1] - cellX : 2.0;
      const cellHeight =
        rowIdx < gridY.length - 1 ? gridY[rowIdx + 1] - cellY : 1.0;

      // Find texts within this cell (with small tolerance)
      const tolerance = 0.2;
      const cellTexts = page.Texts.filter((text) => {
        const textX = text.x;
        const textY = text.y;
        return (
          Math.abs(textX - cellX) < tolerance &&
          Math.abs(textY - cellY) < tolerance
        );
      });

      if (cellTexts.length > 0) {
        const cellText = cellTexts
          .map((text) => decodeURIComponent(text.R[0].T))
          .filter((t) => t.trim())
          .join(" ");

        if (cellText.trim()) {
          fields.push({
            id: `field-p${pageIndex}-r${rowIdx}-c${colIdx}`,
            name: `Cell [${rowIdx},${colIdx}]`,
            position: {
              x: cellX * 20,
              y: cellY * 20,
            },
            size: {
              width: cellWidth * 20,
              height: cellHeight * 20,
            },
            defaultValue: cellText,
          });
        }
      }
    }
  }

  return fields;
}

async function testPDF2JSON() {
  try {
    console.log("=== Testing PDF2JSON with Improved Grid Detection ===\n");

    const pdfPath = path.join(__dirname, "public", "test-pdf01.pdf");
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

      const allFields = [];

      pdfData.Pages.forEach((page, pageIndex) => {
        console.log(`=== Processing Page ${pageIndex + 1} ===`);
        console.log(`  Total texts: ${page.Texts.length}`);
        console.log(`  HLines: ${page.HLines?.length || 0}`);
        console.log(`  VLines: ${page.VLines?.length || 0}\n`);

        console.log("  Using text-based grid detection...");
        const fields = detectFieldsFromTextGrid(page, pageIndex);
        allFields.push(...fields);
      });

      console.log(`\n=== Results ===`);
      console.log(`Total fields detected: ${allFields.length}\n`);

      if (allFields.length > 0) {
        console.log("First 30 fields:");
        allFields.slice(0, 30).forEach((field, index) => {
          console.log(`${index + 1}. [${field.name}] "${field.defaultValue}"`);
        });

        // Group by rows
        const rowMap = new Map();
        allFields.forEach((field) => {
          const rowMatch = field.id.match(/r(\d+)/);
          if (rowMatch) {
            const rowNum = parseInt(rowMatch[1]);
            if (!rowMap.has(rowNum)) {
              rowMap.set(rowNum, []);
            }
            rowMap.get(rowNum).push(field);
          }
        });

        console.log(`\n--- Fields by Row (first 10 rows) ---`);
        console.log(`Total rows detected: ${rowMap.size}\n`);

        Array.from(rowMap.entries())
          .sort((a, b) => a[0] - b[0])
          .slice(0, 10)
          .forEach(([rowNum, rowFields]) => {
            console.log(`Row ${rowNum} (${rowFields.length} cells):`);
            const sortedFields = rowFields.sort((a, b) => {
              const aCol = parseInt(a.id.match(/c(\d+)/)?.[1] || "0");
              const bCol = parseInt(b.id.match(/c(\d+)/)?.[1] || "0");
              return aCol - bCol;
            });

            const rowText = sortedFields.map((f) => f.defaultValue).join(" | ");
            console.log(`  ${rowText}\n`);
          });
      }

      console.log("=== Test Complete ===");
    });

    pdfParser.loadPDF(pdfPath);
  } catch (error) {
    console.error("Error during testing:", error);
    console.error("Stack:", error.stack);
  }
}

testPDF2JSON();

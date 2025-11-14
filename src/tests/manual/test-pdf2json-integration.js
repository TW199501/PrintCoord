// Test script for PDF2JSON integration
// Run with: node test-pdf2json-integration.js

const PDFParser = require("pdf2json");
const fs = require("fs");
const path = require("path");

// Simulate the FieldType enum
const FieldType = {
  TEXT: "text",
  NUMBER: "number",
  DATE: "date",
  SELECT: "select",
  CHECKBOX: "checkbox",
};

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

// Detect fields from lines
function detectFieldsFromLines(page, pageIndex, hLines, vLines) {
  const fields = [];
  const mergedHLines = mergeCloseCoordinates(hLines, 0.5);
  const mergedVLines = mergeCloseCoordinates(vLines, 0.5);

  console.log(`  Merged H-Lines: ${mergedHLines.length}`);
  console.log(`  Merged V-Lines: ${mergedVLines.length}`);

  // Create cells from grid
  for (let row = 0; row < mergedHLines.length - 1; row++) {
    for (let col = 0; col < mergedVLines.length - 1; col++) {
      const cellX = mergedVLines[col];
      const cellY = mergedHLines[row];
      const cellWidth = mergedVLines[col + 1] - cellX;
      const cellHeight = mergedHLines[row + 1] - cellY;

      // Find texts within this cell
      const cellTexts = page.Texts.filter((text) => {
        const textX = text.x;
        const textY = text.y;
        return (
          textX >= cellX &&
          textX <= cellX + cellWidth &&
          textY >= cellY &&
          textY <= cellY + cellHeight
        );
      });

      // Combine text from all items in cell
      const cellText = cellTexts
        .map((text) => decodeURIComponent(text.R[0].T))
        .filter((t) => t.trim())
        .join(" ");

      if (cellText.trim()) {
        fields.push({
          id: `field-p${pageIndex}-r${row}-c${col}`,
          name: `Cell [${row},${col}]`,
          position: {
            x: cellX * 20,
            y: cellY * 20,
          },
          size: {
            width: cellWidth * 20,
            height: cellHeight * 20,
          },
          fieldType: FieldType.TEXT,
          defaultValue: cellText,
        });
      }
    }
  }

  return fields;
}

async function testPDF2JSON() {
  try {
    console.log("=== Testing PDF2JSON Integration ===\n");

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
        console.log(`  Texts: ${page.Texts.length}`);
        console.log(`  HLines: ${page.HLines?.length || 0}`);
        console.log(`  VLines: ${page.VLines?.length || 0}`);

        // Extract horizontal and vertical line coordinates
        const hLines = (page.HLines || [])
          .map((line) => line.y)
          .sort((a, b) => a - b);
        const vLines = (page.VLines || [])
          .map((line) => line.x)
          .sort((a, b) => a - b);

        if (hLines.length > 0 && vLines.length > 0) {
          console.log("  Using line-based grid detection\n");
          const fields = detectFieldsFromLines(page, pageIndex, hLines, vLines);
          allFields.push(...fields);
        } else {
          console.log("  No lines detected for grid\n");
        }
      });

      console.log(`\n=== Results ===`);
      console.log(`Total fields detected: ${allFields.length}\n`);

      if (allFields.length > 0) {
        console.log("First 15 fields:");
        allFields.slice(0, 15).forEach((field, index) => {
          console.log(`${index + 1}. ${field.name}: "${field.defaultValue}"`);
          console.log(
            `   Position: (${field.position.x.toFixed(
              1
            )}, ${field.position.y.toFixed(1)})`
          );
          console.log(
            `   Size: ${field.size.width.toFixed(
              1
            )} x ${field.size.height.toFixed(1)}`
          );
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

        console.log(`\n--- Fields by Row (first 5 rows) ---`);
        Array.from(rowMap.entries())
          .sort((a, b) => a[0] - b[0])
          .slice(0, 5)
          .forEach(([rowNum, rowFields]) => {
            console.log(`\nRow ${rowNum} (${rowFields.length} cells):`);
            rowFields
              .sort((a, b) => {
                const aCol = parseInt(a.id.match(/c(\d+)/)?.[1] || "0");
                const bCol = parseInt(b.id.match(/c(\d+)/)?.[1] || "0");
                return aCol - bCol;
              })
              .forEach((field) => {
                console.log(`  - ${field.defaultValue}`);
              });
          });
      }

      console.log("\n=== Test Complete ===");
    });

    pdfParser.loadPDF(pdfPath);
  } catch (error) {
    console.error("Error during testing:", error);
    console.error("Stack:", error.stack);
  }
}

testPDF2JSON();

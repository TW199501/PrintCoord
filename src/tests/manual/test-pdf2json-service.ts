// Test script for PDF2JSONService
// Run with: npx ts-node test-pdf2json-service.ts

import * as fs from "fs";
import * as path from "path";
import { PDF2JSONService } from "./src/services/pdf2jsonService";

async function testPDF2JSONService() {
  try {
    console.log("=== Testing PDF2JSONService ===\n");

    const pdfPath = path.join(__dirname, "public", "test-pdf01.pdf");
    console.log(`Reading PDF: ${pdfPath}\n`);

    if (!fs.existsSync(pdfPath)) {
      console.error("PDF file not found!");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    console.log(`PDF buffer size: ${buffer.length} bytes\n`);

    // Test field detection
    console.log("--- Detecting Fields ---");
    const fields = await PDF2JSONService.detectFieldsFromPDF(buffer);

    console.log(`\nTotal fields detected: ${fields.length}\n`);

    // Show first 20 fields
    console.log("First 20 fields:");
    fields.slice(0, 20).forEach((field, index) => {
      console.log(`${index + 1}. ${field.name}`);
      console.log(`   ID: ${field.id}`);
      console.log(`   Value: ${field.defaultValue}`);
      console.log(
        `   Position: (${field.position.x.toFixed(
          1
        )}, ${field.position.y.toFixed(1)})`
      );
      console.log(
        `   Size: ${field.size.width.toFixed(1)} x ${field.size.height.toFixed(
          1
        )}`
      );
      console.log("");
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

    console.log(`\n--- Fields by Row ---`);
    console.log(`Total rows: ${rowMap.size}\n`);

    Array.from(rowMap.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(0, 10)
      .forEach(([rowNum, rowFields]) => {
        console.log(`Row ${rowNum} (${rowFields.length} cells):`);
        rowFields
          .sort((a, b) => {
            const aCol = parseInt(a.id.match(/c(\d+)/)?.[1] || "0");
            const bCol = parseInt(b.id.match(/c(\d+)/)?.[1] || "0");
            return aCol - bCol;
          })
          .forEach((field) => {
            console.log(`  - ${field.defaultValue}`);
          });
        console.log("");
      });

    console.log("=== Test Complete ===");
  } catch (error) {
    console.error("Error during testing:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
  }
}

testPDF2JSONService();

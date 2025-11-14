// PDF2JSON 使用示例
// 展示如何使用 PDF2JSONService 和 PDFDatabaseService

import fs from "fs";
import path from "path";
import { PDF2JSONService } from "@/services/pdf2jsonService";
import { PDFDatabaseService } from "@/services/pdfDatabaseService";

async function processPDF(filename: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing: ${filename}`);
  console.log("=".repeat(60));

  // 1. 讀取 PDF 文件
  const pdfPath = path.join(__dirname, "../../../public", filename);
  const pdfBuffer = fs.readFileSync(pdfPath);

  // 2. 解析 PDF
  console.log("\n📄 Parsing PDF...");
  const pdfData = await PDF2JSONService.parsePDF(pdfBuffer);
  console.log(`  ✓ Pages: ${pdfData.Pages.length}`);
  console.log(`  ✓ Title: ${pdfData.Meta.Title || "N/A"}`);
  console.log(`  ✓ Author: ${pdfData.Meta.Author || "N/A"}`);

  // 3. 檢測欄位
  console.log("\n🔍 Detecting fields...");
  const fields = await PDF2JSONService.detectFieldsFromPDF(pdfBuffer);
  console.log(`  ✓ Detected ${fields.length} fields`);

  // 4. 保存到數據庫（模擬）
  console.log("\n💾 Saving to database...");
  const documentId = await PDFDatabaseService.savePDFDocument(
    filename,
    pdfData,
    fields
  );
  console.log(`  ✓ Document ID: ${documentId}`);

  // 5. 導出為 JSON
  console.log("\n📦 Exporting to JSON...");
  const exportJson = PDFDatabaseService.exportToJSON(filename, pdfData, fields);
  const outputPath = path.join(__dirname, "output", `${filename}.export.json`);
  fs.writeFileSync(outputPath, exportJson);
  console.log(`  ✓ Exported to: ${outputPath}`);

  // 6. 顯示檢測結果摘要
  console.log("\n📊 Detection Summary:");

  pdfData.Pages.forEach((page, pageIndex) => {
    const pageFields = fields.filter((f) => {
      const match = f.id.match(/field-p(\d+)-/);
      return match && parseInt(match[1]) === pageIndex;
    });

    console.log(`\n  Page ${pageIndex + 1}:`);
    console.log(
      `    Dimensions: ${page.Width.toFixed(2)} x ${page.Height.toFixed(2)}`
    );
    console.log(`    Fills: ${page.Fills?.length || 0}`);
    console.log(`    HLines: ${page.HLines?.length || 0}`);
    console.log(`    VLines: ${page.VLines?.length || 0}`);
    console.log(`    Texts: ${page.Texts.length}`);
    console.log(`    Detected Fields: ${pageFields.length}`);

    if (pageFields.length > 0) {
      console.log(`\n    First 5 fields:`);
      pageFields.slice(0, 5).forEach((field, idx) => {
        console.log(`      ${idx + 1}. ${field.name}: "${field.defaultValue}"`);
      });
    }
  });

  console.log(`\n${"=".repeat(60)}\n`);
}

async function main() {
  console.log("PDF2JSON Service - Usage Example");
  console.log("=".repeat(60));

  const pdfs = ["test-pdf01.pdf", "test-pdf02.pdf", "test-pdf03.pdf"];

  for (const pdf of pdfs) {
    try {
      await processPDF(pdf);
    } catch (error: any) {
      console.error(`\n❌ Error processing ${pdf}:`, error.message);
    }
  }

  console.log("\n✅ All PDFs processed successfully!");
}

// 運行示例
if (require.main === module) {
  main().catch(console.error);
}

export { processPDF };

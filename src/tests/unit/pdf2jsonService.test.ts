// PDF2JSONService 單元測試

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { PDF2JSONService } from "@/services/pdf2jsonService";
import { FieldType } from "@/types";

// Mock pdf2json
jest.mock("pdf2json", () => {
  return jest.fn().mockImplementation(() => {
    const EventEmitter = require("events");
    const emitter = new EventEmitter();

    return {
      on: (event: string, callback: (...args: unknown[]) => void) => {
        emitter.on(event, callback);
      },
      parseBuffer: (_buffer: Buffer) => {
        // Simulate successful parsing with mock data
        setTimeout(() => {
          const mockPDFData = {
            Pages: [
              {
                Width: 37.245,
                Height: 52.62,
                HLines: [
                  { x: 2.25, y: 15.961, w: 1.125, l: 32.766 },
                  { x: 2.25, y: 18.727, w: 1.125, l: 32.766 },
                ],
                VLines: [
                  { x: 1.898, y: 16.312, w: 1.125, l: 2.062 },
                  { x: 35.367, y: 16.312, w: 1.125, l: 2.062 },
                ],
                Texts: [
                  {
                    x: 2.5,
                    y: 16.0,
                    w: 5.0,
                    R: [{ T: encodeURIComponent("ITEM") }],
                  },
                  {
                    x: 10.0,
                    y: 16.0,
                    w: 5.0,
                    R: [{ T: encodeURIComponent("QTY") }],
                  },
                  {
                    x: 20.0,
                    y: 16.0,
                    w: 5.0,
                    R: [{ T: encodeURIComponent("RATE") }],
                  },
                  {
                    x: 30.0,
                    y: 16.0,
                    w: 5.0,
                    R: [{ T: encodeURIComponent("AMOUNT") }],
                  },
                  {
                    x: 2.5,
                    y: 17.5,
                    w: 5.0,
                    R: [{ T: encodeURIComponent("運費") }],
                  },
                  {
                    x: 10.0,
                    y: 17.5,
                    w: 5.0,
                    R: [{ T: encodeURIComponent("1") }],
                  },
                  {
                    x: 20.0,
                    y: 17.5,
                    w: 5.0,
                    R: [{ T: encodeURIComponent("200 USD") }],
                  },
                  {
                    x: 30.0,
                    y: 17.5,
                    w: 5.0,
                    R: [{ T: encodeURIComponent("200 USD") }],
                  },
                ],
                Fills: [],
              },
            ],
            Meta: {
              PDFFormatVersion: "1.4",
            },
          };

          emitter.emit("pdfParser_dataReady", mockPDFData);
        }, 0);
      },
    };
  });
});

describe("PDF2JSONService", () => {
  describe("parsePDF", () => {
    it("應該成功解析 PDF 並返回結構化數據", async () => {
      const mockBuffer = Buffer.from("mock pdf data");

      const result = await PDF2JSONService.parsePDF(mockBuffer);

      expect(result).toHaveProperty("Pages");
      expect(result).toHaveProperty("Meta");
      expect(result.Pages).toHaveLength(1);
      expect(result.Pages[0]).toHaveProperty("Texts");
      expect(result.Pages[0]).toHaveProperty("HLines");
      expect(result.Pages[0]).toHaveProperty("VLines");
    });

    it("應該在解析失敗時拋出錯誤", async () => {
      // Override the mock for this test
      const PDFParser = require("pdf2json");
      PDFParser.mockImplementationOnce(() => {
        const EventEmitter = require("events");
        const emitter = new EventEmitter();

        return {
          on: (event: string, callback: (...args: unknown[]) => void) => {
            emitter.on(event, callback);
          },
          parseBuffer: () => {
            setTimeout(() => {
              emitter.emit("pdfParser_dataError", {
                parserError: "Invalid PDF",
              });
            }, 0);
          },
        };
      });

      const mockBuffer = Buffer.from("invalid pdf");

      await expect(PDF2JSONService.parsePDF(mockBuffer)).rejects.toThrow(
        "Invalid PDF"
      );
    });
  });

  describe("detectFieldsFromPDF", () => {
    it("應該從 PDF 中檢測表格欄位", async () => {
      const mockBuffer = Buffer.from("mock pdf data");

      const fields = await PDF2JSONService.detectFieldsFromPDF(mockBuffer);

      // 應該檢測到多個欄位
      expect(fields.length).toBeGreaterThan(0);

      // 驗證欄位結構
      fields.forEach((field) => {
        expect(field).toHaveProperty("id");
        expect(field).toHaveProperty("name");
        expect(field).toHaveProperty("position");
        expect(field).toHaveProperty("size");
        expect(field).toHaveProperty("fieldType");
        expect(field).toHaveProperty("defaultValue");

        // 驗證位置和大小
        expect(field.position).toHaveProperty("x");
        expect(field.position).toHaveProperty("y");
        expect(field.size).toHaveProperty("width");
        expect(field.size).toHaveProperty("height");

        // 驗證類型
        expect(field.fieldType).toBe(FieldType.TEXT);
      });
    });

    it("應該正確檢測包含中文的欄位", async () => {
      const mockBuffer = Buffer.from("mock pdf data");

      const fields = await PDF2JSONService.detectFieldsFromPDF(mockBuffer);

      // 應該包含中文文字
      const chineseField = fields.find((f) => f.defaultValue?.includes("運費"));
      expect(chineseField).toBeDefined();
      expect(chineseField?.defaultValue).toContain("運費");
    });

    it("應該為每個欄位生成唯一的 ID", async () => {
      const mockBuffer = Buffer.from("mock pdf data");

      const fields = await PDF2JSONService.detectFieldsFromPDF(mockBuffer);

      const ids = fields.map((f) => f.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it("應該正確設置欄位位置（基於 PDF 單位轉換）", async () => {
      const mockBuffer = Buffer.from("mock pdf data");

      const fields = await PDF2JSONService.detectFieldsFromPDF(mockBuffer);

      // 所有欄位應該有正的座標
      fields.forEach((field) => {
        expect(field.position.x).toBeGreaterThanOrEqual(0);
        expect(field.position.y).toBeGreaterThanOrEqual(0);
        expect(field.size.width).toBeGreaterThan(0);
        expect(field.size.height).toBeGreaterThan(0);
      });
    });
  });

  describe("mergeCloseCoordinates", () => {
    it("應該合併相近的座標", () => {
      // Access private method through any type assertion for testing
      const service = PDF2JSONService as any;

      const coords = [10.0, 10.1, 10.2, 20.0, 20.3, 30.0];
      const merged = service.mergeCloseCoordinates(coords, 0.5);

      // 應該合併 10.0, 10.1, 10.2 為一個
      // 應該合併 20.0, 20.3 為一個
      // 30.0 獨立
      expect(merged).toHaveLength(3);
      expect(merged).toContain(10.0);
      expect(merged).toContain(20.0);
      expect(merged).toContain(30.0);
    });

    it("應該處理空陣列", () => {
      const service = PDF2JSONService as any;

      const merged = service.mergeCloseCoordinates([], 0.5);

      expect(merged).toHaveLength(0);
    });

    it("應該移除重複的座標", () => {
      const service = PDF2JSONService as any;

      const coords = [10.0, 10.0, 10.0, 20.0, 20.0];
      const merged = service.mergeCloseCoordinates(coords, 0.5);

      expect(merged).toHaveLength(2);
    });
  });
});

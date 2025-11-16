import { FileProcessingService } from "@/services/fileProcessing";
import { FileType } from "@/types";

// Mock dependencies
jest.mock("mammoth", () => ({
  convertToHtml: jest.fn(),
}));

jest.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {
    workerSrc: "",
    workerPort: null,
  },
  getDocument: jest.fn(),
}));

// Mock DOM APIs
Object.defineProperty(document, "createElement", {
  writable: true,
  value: jest.fn().mockImplementation((tagName: string) => {
    if (tagName === "canvas") {
      const canvas = {
        width: 0,
        height: 0,
        style: {},
        getContext: jest.fn().mockReturnValue({
          fillStyle: "",
          fillRect: jest.fn(),
        }),
        toDataURL: jest.fn().mockReturnValue("data:image/png;base64,test"),
      };
      return canvas;
    }
    return {};
  }),
});

// Mock console methods
const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

describe("FileProcessingService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window mocks
    delete (window as any).__pdfjsLibPromise__;
    delete (window as any).pdfjsLib;
  });

  afterEach(() => {
    consoleLogSpy.mockClear();
    consoleErrorSpy.mockClear();
    consoleWarnSpy.mockClear();
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe("processUploadedFile", () => {
    it("should return error for null file", async () => {
      const result = await FileProcessingService.processUploadedFile(
        null as any
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("沒有提供文件");
    });

    it("should return error for unsupported file type", async () => {
      const mockFile = new File(["test"], "test.txt", { type: "text/plain" });

      const result = await FileProcessingService.processUploadedFile(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe("不支持的檔案格式");
    });

    it("should process DOCX files", async () => {
      const mockFile = new File(["test"], "test.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // Mock mammoth
      const mockMammoth = require("mammoth");
      mockMammoth.convertToHtml.mockResolvedValue({
        value: "<p>Test content</p>",
        messages: [],
      });

      const result = await FileProcessingService.processUploadedFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.file).toBe(mockFile);
      expect(result.html).toBe("<p>Test content</p>");
    });

    it("should process PDF files", async () => {
      const mockFile = new File(["test"], "test.pdf", {
        type: "application/pdf",
      });

      // Mock PDF.js
      const mockPdfJs = {
        GlobalWorkerOptions: { workerSrc: "", workerPort: null },
        getDocument: jest.fn().mockReturnValue({
          promise: Promise.resolve({
            numPages: 1,
            getPage: jest.fn().mockResolvedValue({
              getViewport: jest
                .fn()
                .mockReturnValue({ width: 800, height: 600 }),
              render: jest.fn().mockReturnValue({
                promise: Promise.resolve(),
              }),
            }),
          }),
        }),
      };

      // Mock the import
      jest.doMock("pdfjs-dist/build/pdf.mjs", () => mockPdfJs);

      const result = await FileProcessingService.processUploadedFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.file).toBe(mockFile);
      expect(result.pdfPages).toBeDefined();
    });

    it("should reject DOC files", async () => {
      const mockFile = new File(["test"], "test.doc", {
        type: "application/msword",
      });

      const result = await FileProcessingService.processUploadedFile(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe("DOC 格式需要先轉換為 DOCX 格式才能處理");
    });

    it("should handle processing errors", async () => {
      const mockFile = new File(["test"], "test.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const mockMammoth = require("mammoth");
      mockMammoth.convertToHtml.mockRejectedValue(
        new Error("Processing failed")
      );

      const result = await FileProcessingService.processUploadedFile(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe("文件處理失敗");
    });
  });

  describe("getFileType", () => {
    it("should identify PDF files by extension", () => {
      const mockFile = new File(["test"], "test.pdf", {
        type: "application/pdf",
      });

      const result = (FileProcessingService as any).getFileType(mockFile);

      expect(result).toBe(FileType.PDF);
    });

    it("should identify DOCX files by extension", () => {
      const mockFile = new File(["test"], "test.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const result = (FileProcessingService as any).getFileType(mockFile);

      expect(result).toBe(FileType.DOCX);
    });

    it("should identify DOC files by extension", () => {
      const mockFile = new File(["test"], "test.doc", {
        type: "application/msword",
      });

      const result = (FileProcessingService as any).getFileType(mockFile);

      expect(result).toBe(FileType.DOC);
    });

    it("should identify files by MIME type when extension is unclear", () => {
      const mockFile = new File(["test"], "test.unknown", {
        type: "application/pdf",
      });

      const result = (FileProcessingService as any).getFileType(mockFile);

      expect(result).toBe(FileType.PDF);
    });

    it("should return null for unsupported file types", () => {
      const mockFile = new File(["test"], "test.txt", { type: "text/plain" });

      const result = (FileProcessingService as any).getFileType(mockFile);

      expect(result).toBeNull();
    });
  });

  describe("htmlToCanvas", () => {
    it("should create a canvas with specified dimensions", async () => {
      const width = 800;
      const height = 600;

      const canvas = await FileProcessingService.htmlToCanvas(
        "<p>Test</p>",
        width,
        height
      );

      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(width);
      expect(canvas.height).toBe(height);
    });

    it("should fill canvas with white background", async () => {
      const canvas = await FileProcessingService.htmlToCanvas(
        "<p>Test</p>",
        100,
        100
      );
      const ctx = canvas.getContext("2d");

      expect(ctx!.fillStyle).toBe("#ffffff");
      expect(ctx!.fillRect).toHaveBeenCalledWith(0, 0, 100, 100);
    });

    it("should throw error if canvas context is not available", async () => {
      // Mock getContext to return null
      const mockCanvas = {
        width: 100,
        height: 100,
        getContext: jest.fn().mockReturnValue(null),
      };

      (document.createElement as jest.Mock).mockReturnValueOnce(mockCanvas);

      await expect(
        FileProcessingService.htmlToCanvas("<p>Test</p>", 100, 100)
      ).rejects.toThrow("無法獲取 Canvas 上下文");
    });
  });

  describe("processDocxFile", () => {
    it("should successfully process DOCX files", async () => {
      const mockFile = new File(["test"], "test.docx");

      const mockMammoth = require("mammoth");
      mockMammoth.convertToHtml.mockResolvedValue({
        value: "<p>Processed content</p>",
        messages: ["Warning message"],
      });

      const result = await (FileProcessingService as any).processDocxFile(
        mockFile
      );

      expect(result.success).toBe(true);
      expect(result.file).toBe(mockFile);
      expect(result.html).toBe("<p>Processed content</p>");
      expect(result.messages).toEqual(["Warning message"]);
    });

    it("should handle DOCX processing errors", async () => {
      const mockFile = new File(["test"], "test.docx");

      const mockMammoth = require("mammoth");
      mockMammoth.convertToHtml.mockRejectedValue(
        new Error("Conversion failed")
      );

      const result = await (FileProcessingService as any).processDocxFile(
        mockFile
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("DOCX 文件處理失敗");
    });
  });

  describe("processPdfFile", () => {
    beforeEach(() => {
      // Mock PDF.js for each test
      const mockPdfJs = {
        GlobalWorkerOptions: {
          workerSrc: "/pdfjs/pdf.worker.mjs",
          workerPort: null,
        },
        getDocument: jest.fn().mockReturnValue({
          promise: Promise.resolve({
            numPages: 2,
            getPage: jest.fn().mockImplementation((pageNum) =>
              Promise.resolve({
                getViewport: jest
                  .fn()
                  .mockReturnValue({ width: 800, height: 600 }),
                render: jest.fn().mockReturnValue({
                  promise: Promise.resolve(),
                }),
              })
            ),
          }),
        }),
      };

      // Mock the dynamic import
      jest.doMock("pdfjs-dist/build/pdf.mjs", () => mockPdfJs, {
        virtual: true,
      });
    });

    it("should return error for null file", async () => {
      const result = await (FileProcessingService as any).processPdfFile(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe("沒有提供文件");
    });

    it("should return error for empty file", async () => {
      const mockFile = new File([], "empty.pdf", { type: "application/pdf" });

      const result = await (FileProcessingService as any).processPdfFile(
        mockFile
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("文件大小不能為零");
    });

    it("should return error for invalid PDF file type", async () => {
      const mockFile = new File(["test"], "test.txt", { type: "text/plain" });

      const result = await (FileProcessingService as any).processPdfFile(
        mockFile
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("文件不是有效的 PDF 格式");
    });

    it("should successfully process valid PDF files", async () => {
      const mockFile = new File(["test"], "test.pdf", {
        type: "application/pdf",
      });

      const result = await (FileProcessingService as any).processPdfFile(
        mockFile
      );

      expect(result.success).toBe(true);
      expect(result.file).toBe(mockFile);
      expect(result.pdfPages).toHaveLength(2);
      expect(result.pdfPages?.[0].pageNumber).toBe(1);
      expect(result.pdfPages?.[1].pageNumber).toBe(2);
    });

    it("should handle PDF processing errors with specific error messages", async () => {
      const mockFile = new File(["test"], "test.pdf", {
        type: "application/pdf",
      });

      // Mock PDF.js to throw an error
      const mockPdfJs = require("pdfjs-dist");
      mockPdfJs.getDocument.mockReturnValue({
        promise: Promise.reject(new Error("Invalid PDF structure")),
      });

      const result = await (FileProcessingService as any).processPdfFile(
        mockFile
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("PDF 處理錯誤");
    });
  });

  describe("processDocFile", () => {
    it("should return appropriate error for DOC files", async () => {
      const mockFile = new File(["test"], "test.doc");

      const result = await (FileProcessingService as any).processDocFile(
        mockFile
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("DOC 格式需要先轉換為 DOCX 格式才能處理");
    });
  });
});

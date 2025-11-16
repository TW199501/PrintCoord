import { PDFDatabaseService } from "@/services/pdfDatabaseService";
import { FieldType } from "@/types";
import { PDF2JSONOutput } from "@/types/pdf2json";

// Mock console methods
const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

describe("PDFDatabaseService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockClear();
    consoleWarnSpy.mockClear();
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe("savePDFDocument", () => {
    it("should save PDF document and return document ID", async () => {
      const filename = "test.pdf";
      const mockPdfData: PDF2JSONOutput = {
        Meta: {
          PDFFormatVersion: "1.7",
          IsAcroFormPresent: false,
          IsXFAPresent: false,
          Title: "Test Document",
          Author: "Test Author",
        },
        Pages: [
          {
            Width: 800,
            Height: 600,
            Texts: [],
            HLines: [],
            VLines: [],
            Fills: [],
          },
          {
            Width: 800,
            Height: 600,
            Texts: [],
            HLines: [],
            VLines: [],
            Fills: [],
          },
        ],
      };
      const mockFields = [
        {
          id: "field-p0-r0-c0",
          name: "testField",
          position: { x: 100, y: 100 },
          size: { width: 200, height: 30 },
          fieldType: FieldType.TEXT,
        },
      ];

      const documentId = await PDFDatabaseService.savePDFDocument(
        filename,
        mockPdfData,
        mockFields
      );

      expect(typeof documentId).toBe("string");
      expect(documentId.length).toBeGreaterThan(0);
      expect(consoleLogSpy).toHaveBeenCalledWith("Saving PDF document:", {
        id: documentId,
        filename,
        pageCount: 2,
        fieldsCount: 1,
      });
    });

    it("should handle documents without metadata", async () => {
      const filename = "test.pdf";
      const mockPdfData: PDF2JSONOutput = {
        Pages: [
          {
            Width: 800,
            Height: 600,
            Texts: [],
            HLines: [],
            VLines: [],
            Fills: [],
          },
        ],
      };
      const mockFields: any[] = [];

      const documentId = await PDFDatabaseService.savePDFDocument(
        filename,
        mockPdfData,
        mockFields
      );

      expect(typeof documentId).toBe("string");
      expect(consoleLogSpy).toHaveBeenCalledWith("Saving PDF document:", {
        id: documentId,
        filename,
        pageCount: 1,
        fieldsCount: 0,
      });
    });
  });

  describe("saveDetectedFields", () => {
    it("should save detected fields correctly", async () => {
      const documentId = "test-doc-123";
      const mockFields = [
        {
          id: "field-p0-r0-c0",
          name: "field1",
          position: { x: 100, y: 100 },
          size: { width: 200, height: 30 },
          fieldType: FieldType.TEXT,
          defaultValue: "test value",
        },
        {
          id: "field-p1-r2-c3",
          name: "field2",
          position: { x: 200, y: 200 },
          size: { width: 150, height: 25 },
          fieldType: FieldType.NUMBER,
        },
      ];

      await PDFDatabaseService.saveDetectedFields(documentId, mockFields);

      expect(consoleLogSpy).toHaveBeenCalledWith("Saving 2 detected fields");
    });

    it("should handle fields with invalid ID format", async () => {
      const documentId = "test-doc-123";
      const mockFields = [
        {
          id: "invalid-id",
          name: "field1",
          position: { x: 100, y: 100 },
          size: { width: 200, height: 30 },
          fieldType: FieldType.TEXT,
        },
      ];

      await PDFDatabaseService.saveDetectedFields(documentId, mockFields);

      expect(consoleLogSpy).toHaveBeenCalledWith("Saving 1 detected fields");
    });
  });

  describe("saveTableStructure", () => {
    it("should save table structure and return structure ID", async () => {
      const documentId = "test-doc-123";
      const pageIndex = 0;
      const structure = {
        rows: 5,
        columns: 3,
        strategy: "fills" as const,
        horizontalLines: 6,
        verticalLines: 4,
        columnBoundaries: [0, 200, 400, 600],
        rowBoundaries: [0, 100, 200, 300, 400, 500],
      };

      const structureId = await PDFDatabaseService.saveTableStructure(
        documentId,
        pageIndex,
        structure
      );

      expect(typeof structureId).toBe("string");
      expect(structureId.length).toBeGreaterThan(0);
      expect(consoleLogSpy).toHaveBeenCalledWith("Saving table structure:", {
        id: structureId,
        pageIndex,
        rows: 5,
        columns: 3,
        strategy: "fills",
      });
    });
  });

  describe("getDocumentFields", () => {
    it("should return empty array (mock implementation)", async () => {
      const documentId = "test-doc-123";

      const fields = await PDFDatabaseService.getDocumentFields(documentId);

      expect(fields).toEqual([]);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `Fetching fields for document: ${documentId}`
      );
    });
  });

  describe("getDocument", () => {
    it("should return null (mock implementation)", async () => {
      const documentId = "test-doc-123";

      const document = await PDFDatabaseService.getDocument(documentId);

      expect(document).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `Fetching document: ${documentId}`
      );
    });
  });

  describe("exportToJSON", () => {
    it("should export PDF data to JSON format", () => {
      const filename = "test.pdf";
      const mockPdfData: PDF2JSONOutput = {
        Meta: {
          PDFFormatVersion: "1.7",
          IsAcroFormPresent: false,
          IsXFAPresent: false,
          Title: "Test Document",
          Author: "Test Author",
        },
        Pages: [
          {
            Width: 800,
            Height: 600,
            Texts: [
              {
                x: 100,
                y: 100,
                w: 50,
                clr: 0,
                A: "left",
                R: [{ T: "Hello", S: 12, TS: [0, 0, 0, 0] }],
              },
            ],
            HLines: [{ x: 0, y: 100, w: 800, l: 1 }],
            VLines: [{ x: 200, y: 0, w: 1, l: 600 }],
            Fills: [{ x: 0, y: 0, w: 200, h: 100, clr: 0 }],
          },
        ],
      };
      const mockFields = [
        {
          id: "field-p0-r0-c0",
          name: "testField",
          defaultValue: "test value",
          position: { x: 100, y: 100 },
          size: { width: 200, height: 30 },
          fieldType: FieldType.TEXT,
        },
      ];

      const jsonString = PDFDatabaseService.exportToJSON(
        filename,
        mockPdfData,
        mockFields
      );
      const parsedData = JSON.parse(jsonString);

      expect(parsedData.metadata.filename).toBe(filename);
      expect(parsedData.metadata.version).toBe("1.0");
      expect(parsedData.pdfInfo.title).toBe("Test Document");
      expect(parsedData.pdfInfo.author).toBe("Test Author");
      expect(parsedData.pdfInfo.pageCount).toBe(1);
      expect(parsedData.pages).toHaveLength(1);
      expect(parsedData.pages[0].fields).toHaveLength(1);
      expect(parsedData.pages[0].fields[0].name).toBe("testField");
      expect(parsedData.rawData).toBe(mockPdfData);
    });

    it("should handle documents without metadata", () => {
      const filename = "test.pdf";
      const mockPdfData: PDF2JSONOutput = {
        Pages: [
          {
            Width: 800,
            Height: 600,
            Texts: [],
            HLines: [],
            VLines: [],
            Fills: [],
          },
        ],
      };
      const mockFields: any[] = [];

      const jsonString = PDFDatabaseService.exportToJSON(
        filename,
        mockPdfData,
        mockFields
      );
      const parsedData = JSON.parse(jsonString);

      expect(parsedData.pdfInfo.title).toBeUndefined();
      expect(parsedData.pdfInfo.author).toBeUndefined();
      expect(parsedData.pdfInfo.pageCount).toBe(1);
    });

    it("should filter fields by page index correctly", () => {
      const filename = "test.pdf";
      const mockPdfData: PDF2JSONOutput = {
        Pages: [
          {
            Width: 800,
            Height: 600,
            Texts: [],
            HLines: [],
            VLines: [],
            Fills: [],
          },
          {
            Width: 800,
            Height: 600,
            Texts: [],
            HLines: [],
            VLines: [],
            Fills: [],
          },
        ],
      };
      const mockFields = [
        {
          id: "field-p0-r0-c0",
          name: "field1",
          position: { x: 100, y: 100 },
          size: { width: 200, height: 30 },
          fieldType: FieldType.TEXT,
        },
        {
          id: "field-p1-r0-c0",
          name: "field2",
          position: { x: 100, y: 100 },
          size: { width: 200, height: 30 },
          fieldType: FieldType.TEXT,
        },
      ];

      const jsonString = PDFDatabaseService.exportToJSON(
        filename,
        mockPdfData,
        mockFields
      );
      const parsedData = JSON.parse(jsonString);

      expect(parsedData.pages[0].fields).toHaveLength(1);
      expect(parsedData.pages[0].fields[0].name).toBe("field1");
      expect(parsedData.pages[1].fields).toHaveLength(1);
      expect(parsedData.pages[1].fields[0].name).toBe("field2");
    });
  });

  describe("generateId (private method)", () => {
    it("should generate unique IDs", () => {
      // Access private method through type assertion
      const id1 = (PDFDatabaseService as any).generateId();
      const id2 = (PDFDatabaseService as any).generateId();

      expect(typeof id1).toBe("string");
      expect(typeof id2).toBe("string");
      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(0);
      expect(id2.length).toBeGreaterThan(0);
    });

    it("should generate IDs with timestamp and random parts", () => {
      const id = (PDFDatabaseService as any).generateId();

      // Should contain a timestamp part and random part separated by dash
      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });
});

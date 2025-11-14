// PrintCoord - FileUpload 組件測試
import React from "react";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import "@testing-library/jest-dom";
import FileUpload from "@/components/FileUpload";

// Mock react-dropzone
jest.mock("react-dropzone", () => ({
  useDropzone: jest.fn(),
}));

// Mock FileProcessingService
jest.mock("@/services/fileProcessing", () => ({
  FileProcessingService: {
    processUploadedFile: jest.fn(),
  },
}));

describe("FileUpload", () => {
  const mockOnFileProcessed = jest.fn();
  const { useDropzone: mockUseDropzone } = jest.requireMock("react-dropzone");
  const { FileProcessingService } = jest.requireMock("@/services/fileProcessing");

  beforeEach(() => {
    mockOnFileProcessed.mockClear();
    mockUseDropzone.mockClear();
    FileProcessingService.processUploadedFile.mockClear();
  });

  it("應該正確渲染上傳區域", () => {
    mockUseDropzone.mockReturnValue({
      getRootProps: () => ({ "data-testid": "dropzone" }),
      getInputProps: () => ({ "data-testid": "file-input" }),
      isDragActive: false,
    });

    render(<FileUpload onFileProcessed={mockOnFileProcessed} />);

    expect(screen.getByText(/拖拽文件到這裡/)).toBeInTheDocument();
    expect(screen.getByText(/支持格式/)).toBeInTheDocument();
  });

  it("應該接受有效的文件類型", async () => {
    const mockOnDrop = jest.fn();

    mockUseDropzone.mockReturnValue({
      getRootProps: () => ({ "data-testid": "dropzone" }),
      getInputProps: () => ({ "data-testid": "file-input" }),
      isDragActive: false,
    });

    // 模擬 useDropzone 調用 onDrop
    mockUseDropzone.mockImplementation(({ onDrop }: any) => {
      mockOnDrop.mockImplementation(onDrop);
      return {
        getRootProps: () => ({ "data-testid": "dropzone" }),
        getInputProps: () => ({ "data-testid": "file-input" }),
        isDragActive: false,
      };
    });

    // Mock 成功的文件處理結果
    FileProcessingService.processUploadedFile.mockResolvedValue({
      success: true,
      file: new File(["test"], "test.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    });

    render(<FileUpload onFileProcessed={mockOnFileProcessed} />);

    // 創建模擬文件
    const file = new File(["test content"], "test.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    
    // 添加 arrayBuffer 方法模擬
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => Promise.resolve(new ArrayBuffer(100)),
      writable: true,
      configurable: true,
    });

    await act(async () => {
      await mockOnDrop([file]);
    });

    // 等待異步操作完成
    await waitFor(() => {
      expect(FileProcessingService.processUploadedFile).toHaveBeenCalledWith(file);
    });
    
    // 驗證回調被正確調用
    await waitFor(() => {
      expect(mockOnFileProcessed).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          file: file,
        })
      );
    });
  });

  it("應該處理無效的文件類型", async () => {
    const mockOnDropRejected = jest.fn();

    mockUseDropzone.mockImplementation(({ onDropRejected }: any) => {
      mockOnDropRejected.mockImplementation(onDropRejected);
      return {
        getRootProps: () => ({ "data-testid": "dropzone" }),
        getInputProps: () => ({ "data-testid": "file-input" }),
        isDragActive: false,
      };
    });

    render(<FileUpload onFileProcessed={mockOnFileProcessed} />);

    const rejectedFile = {
      file: new File(["test"], "test.exe", {
        type: "application/x-msdownload",
      }),
      errors: [{ message: "不支持的文件類型" }],
    };

    await act(async () => {
      mockOnDropRejected([rejectedFile]);
    });

    expect(mockOnFileProcessed).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining("不支持"),
      }),
    );
  });

  it("應該處理文件處理失敗", async () => {
    const mockOnDrop = jest.fn();

    mockUseDropzone.mockImplementation(({ onDrop }: any) => {
      mockOnDrop.mockImplementation(onDrop);
      return {
        getRootProps: () => ({ "data-testid": "dropzone" }),
        getInputProps: () => ({ "data-testid": "file-input" }),
        isDragActive: false,
      };
    });

    // Mock 文件處理失敗
    FileProcessingService.processUploadedFile.mockResolvedValue({
      success: false,
      error: "DOCX 文件處理失敗",
    });

    render(<FileUpload onFileProcessed={mockOnFileProcessed} />);

    const file = new File(["test content"], "test.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    
    // 添加 arrayBuffer 方法模擬
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => Promise.resolve(new ArrayBuffer(100)),
      writable: true,
      configurable: true,
    });

    await act(async () => {
      await mockOnDrop([file]);
    });

    expect(mockOnFileProcessed).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "DOCX 文件處理失敗",
      }),
    );
  });
});
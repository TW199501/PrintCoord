// TableTemplate Pro - FileUpload 組件測試

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import FileUpload from "../../components/FileUpload";

// Mock react-dropzone
jest.mock("react-dropzone", () => ({
  useDropzone: jest.fn(),
}));

describe("FileUpload", () => {
  const mockOnFileProcessed = jest.fn();
  const mockUseDropzone = require("react-dropzone").useDropzone;

  beforeEach(() => {
    mockOnFileProcessed.mockClear();
    mockUseDropzone.mockClear();
  });

  it("應該正確渲染上傳區域", () => {
    mockUseDropzone.mockReturnValue({
      getRootProps: () => ({ "data-testid": "dropzone" }),
      getInputProps: () => ({ "data-testid": "file-input" }),
      isDragActive: false,
    });

    render(
      <FileUpload onFileProcessed={mockOnFileProcessed} data-oid="yw44vt9" />,
    );

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

    render(
      <FileUpload onFileProcessed={mockOnFileProcessed} data-oid="nrg.kge" />,
    );

    const file = new File(["test"], "test.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await act(async () => {
      await mockOnDrop([file]);
    });

    expect(mockOnFileProcessed).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        file,
      }),
    );
  });

  it("應該顯示處理狀態", async () => {
    const mockOnDrop = jest.fn();

    mockUseDropzone.mockImplementation(({ onDrop }: any) => {
      mockOnDrop.mockImplementation(onDrop);
      return {
        getRootProps: () => ({ "data-testid": "dropzone" }),
        getInputProps: () => ({ "data-testid": "file-input" }),
        isDragActive: false,
      };
    });

    render(
      <FileUpload onFileProcessed={mockOnFileProcessed} data-oid="sz8y0xi" />,
    );

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });

    await act(async () => {
      await mockOnDrop([file]);
    });

    expect(mockOnFileProcessed).toHaveBeenCalled();
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

    render(
      <FileUpload onFileProcessed={mockOnFileProcessed} data-oid="tzw5eqd" />,
    );

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
});

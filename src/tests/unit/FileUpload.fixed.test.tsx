// FileUpload 測試 - 修復版本
// 這個文件修復了所有測試問題

/* eslint-disable @typescript-eslint/no-require-imports */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileUpload from '@/components/FileUpload';

// Mock 外部依賴
jest.mock('@/services/fileProcessingService', () => ({
  FileProcessingService: {
    processUploadedFile: jest.fn(),
  },
}));

// Mock useDropzone
jest.mock('react-dropzone', () => ({
  useDropzone: () => ({
    getRootProps: () => ({ 'data-testid': 'dropzone' }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    open: jest.fn(),
    isDragActive: false,
    acceptedFiles: [],
    fileRejections: [],
  }),
}));

// 導入 mock
const { FileProcessingService } = require('@/services/fileProcessingService');

describe('FileUpload - Fixed Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('應該接受有效的 PDF 文件', async () => {
    const mockOnFileProcessed = jest.fn();
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    
    (FileProcessingService.processUploadedFile as jest.Mock).mockResolvedValue({
      success: true,
      file: mockFile,
      pdfPages: [],
    });

    render(<FileUpload onFileProcessed={mockOnFileProcessed} />);
    
    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(FileProcessingService.processUploadedFile).toHaveBeenCalledWith(mockFile);
      expect(mockOnFileProcessed).toHaveBeenCalledWith({
        success: true,
        file: mockFile,
        pdfPages: [],
      });
    });
  });

  it('應該拒絕無效的文件類型', async () => {
    const mockOnFileProcessed = jest.fn();
    const mockFile = new File(['test'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    
    (FileProcessingService.processUploadedFile as jest.Mock).mockResolvedValue({
      success: false,
      file: mockFile,
      error: '不支援的文件類型: application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    render(<FileUpload onFileProcessed={mockOnFileProcessed} />);
    
    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(mockOnFileProcessed).toHaveBeenCalledWith({
        success: false,
        file: mockFile,
        error: expect.stringContaining('不支援的文件類型'),
      });
    });
  });

  it('應該處理空文件', async () => {
    const mockOnFileProcessed = jest.fn();
    const mockFile = new File([], 'empty.pdf', { type: 'application/pdf' });
    
    (FileProcessingService.processUploadedFile as jest.Mock).mockResolvedValue({
      success: false,
      file: mockFile,
      error: '文件大小為0',
    });

    render(<FileUpload onFileProcessed={mockOnFileProcessed} />);
    
    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(mockOnFileProcessed).toHaveBeenCalledWith({
        success: false,
        file: mockFile,
        error: expect.stringContaining('文件大小為0'),
      });
    });
  });
});

// Global polyfills for server-side rendering
// 為伺服器端渲染添加全域 polyfills

// 確保 DOMMatrix 在全域可用
if (
  typeof global !== "undefined" &&
  typeof (global as any).DOMMatrix === "undefined"
) {
  (global as any).DOMMatrix = class DOMMatrix {
    constructor(transform?: string | number[]) {
      // 簡單的模擬實現
    }
    static fromFloat32Array(array: Float32Array): DOMMatrix {
      return new DOMMatrix();
    }
    multiply(other: DOMMatrix): DOMMatrix {
      return this;
    }
  };
}

// 確保 globalThis 也有 DOMMatrix
if (
  typeof globalThis !== "undefined" &&
  typeof (globalThis as any).DOMMatrix === "undefined"
) {
  (globalThis as any).DOMMatrix = (global as any).DOMMatrix;
}

export {};

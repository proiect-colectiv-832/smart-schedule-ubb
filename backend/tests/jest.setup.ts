if (typeof (globalThis as any).File === "undefined") {
  (globalThis as any).File = class File {};
}
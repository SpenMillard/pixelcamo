import type { PcmDocument, ExportOpts } from '../types';

interface PywebviewApi {
  open_document(): Promise<PcmDocument | null>;
  save_document(doc: PcmDocument): Promise<string>;
  export_pattern(doc: PcmDocument, opts: ExportOpts): Promise<string>;
  get_recent(): Promise<string[]>;
  reveal_in_finder(path: string): Promise<void>;
}

declare global {
  interface Window {
    pywebview?: { api: PywebviewApi };
  }
}

const devMock: PywebviewApi = {
  open_document: async () => null,
  save_document: async () => '/tmp/Untitled.pcm',
  export_pattern: async () => '/tmp/export.png',
  get_recent: async () => [],
  reveal_in_finder: async () => {},
};

export function getApi(): PywebviewApi {
  return window.pywebview?.api ?? devMock;
}

export function isPywebview(): boolean {
  return !!window.pywebview;
}

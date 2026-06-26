declare global {
  interface WorkerGlobalScope {
    __SW_MANIFEST: Array<{ url: string; revision: string | null }>;
  }
}

export {};

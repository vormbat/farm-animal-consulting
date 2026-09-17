/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE?: string;
  readonly VITE_DATA_REPO?: string;
  readonly VITE_DATA_BRANCH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

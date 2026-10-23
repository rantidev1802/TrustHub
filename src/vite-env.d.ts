/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  // Add any env vars here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
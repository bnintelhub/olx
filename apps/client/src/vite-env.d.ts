/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UPI_VPA?: string;
  readonly VITE_UPI_MERCHANT_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


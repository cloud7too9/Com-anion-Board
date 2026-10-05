/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Adresse der API beim Bauen (Umbau Phase 2), z. B. https://api.deinedomain.de; leer = eigener Ursprung */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

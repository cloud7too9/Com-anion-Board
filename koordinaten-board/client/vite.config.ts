import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Im Dev-Modus läuft der Server separat auf :3000 – Vite leitet API und WebSocket weiter.
// Alternativ VITE_API_URL=http://localhost:3000 setzen (Umbau Phase 2), dann redet die Seite direkt mit der API (CORS).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': { target: 'ws://localhost:3000', ws: true },
    },
  },
});

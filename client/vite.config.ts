import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') }
    ]
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0')
  },
  server: {
    port: 3001,
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react';
          if (id.includes('EditorPanel')) return 'panel-editor';
          if (id.includes('BackupsPanel')) return 'panel-backups';
          if (id.includes('ModsPanel')) return 'panel-mods';
          if (id.includes('ConsolePanel')) return 'panel-console';
          return undefined;
        }
      }
    }
  }
});


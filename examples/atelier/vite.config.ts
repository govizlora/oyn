import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: new URL('./index.html', import.meta.url).pathname,
        surface: new URL('./surface.html', import.meta.url).pathname,
      },
    },
  },
});

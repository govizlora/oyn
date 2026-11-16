import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
const local = (path: string) => new URL(path, import.meta.url).pathname;
export default defineConfig({
  plugins: [tailwindcss()],
  resolve: { alias: [
    { find: '@/registry/new-york-v4', replacement: local('./original/registry/new-york-v4') },
    { find: '@original', replacement: local('./original/registry/new-york-v4') },
    { find: 'cn', replacement: local('./src/lib/utils.ts') },
    { find: 'next-themes', replacement: local('./src/app/upstream-theme.ts') },
    { find: '@', replacement: local('./src') },
  ] },
});

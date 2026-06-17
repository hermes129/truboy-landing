import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/truboy-landing/',
  plugins: [
    tailwindcss(),
  ],
});

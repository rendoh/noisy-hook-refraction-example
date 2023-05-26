import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  base: '/noisy-hook-refraction-example/',
  plugins: [glsl()],
});

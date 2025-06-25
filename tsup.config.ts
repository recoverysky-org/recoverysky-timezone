import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server/**/*.ts'],
  outDir: 'dist',
  format: ['esm'], // 👈 ESM output
  target: 'node22',
  sourcemap: true,
  clean: true,
  dts: false, // or true if you want `.d.ts`
  splitting: false,
  treeshake: false,
  external: ['luxon', 'timezonecomplete', 'express', 'lodash', 'dotenv', 'ts-rust-result'],
  outExtension({ format }) {
    return {
      js: '.js',
    }
  },
})

import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server/server.ts'],
  outDir: 'dist',
  format: ['cjs'], // 👈 CommonJS output
  target: 'node22',
  sourcemap: true,
  clean: true,
  dts: false, // or true if you want `.d.ts`
})

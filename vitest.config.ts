import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
	test: {
		environment: 'node',
		include: ['tests/**/*.test.ts'],
		exclude: ['node_modules', 'dist'],
		globals: true,
		setupFiles: ['tests/setup.ts']
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, './src')
		}
	}
}); 
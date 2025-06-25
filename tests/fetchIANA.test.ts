import { fetchDataOnlyDistributionUrl, updateTimezoneData } from '../src/server/functions/fetchIANA';
import { promises as fs } from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Response } from 'undici';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('fetchIANA', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockReset();
	});

	describe('fetchDataOnlyDistributionUrl', () => {
		it('should successfully fetch and parse IANA data URL from test HTML', async () => {
			const testHtml = await fs.readFile(path.join(__dirname, 'data/time-zones.html'), 'utf-8');
			mockFetch.mockResolvedValueOnce(new Response(testHtml, { status: 200, headers: { 'Content-Type': 'text/html' } }));
			const result = await fetchDataOnlyDistributionUrl();
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe('https://data.iana.org/time-zones/releases/tzdata2025b.tar.gz');
			}
			expect(mockFetch).toHaveBeenCalledWith('https://www.iana.org/time-zones');
		});

		it('should return error when fetch fails', async () => {
			mockFetch.mockResolvedValueOnce(new Response('', { status: 404, statusText: 'Not Found' }));
			const result = await fetchDataOnlyDistributionUrl();
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.message).toContain('Failed to fetch IANA page');
			}
		});

		it('should return error when iana-table is not found', async () => {
			const mockHtml = '<html><body>No table here</body></html>';
			mockFetch.mockResolvedValueOnce(new Response(mockHtml, { status: 200, headers: { 'Content-Type': 'text/html' } }));
			const result = await fetchDataOnlyDistributionUrl();
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.message).toContain('Could not find iana-table in the HTML');
			}
		});

		it('should return error when Data Only Distribution row is not found', async () => {
			const mockHtml = `
				<html>
					<table class="iana-table">
						<tr>
							<td><a href="https://data.iana.org/time-zones/releases/tzdb-2025b.tar.lz">tzdb-2025b.tar.lz</a> (537.0kb)</td>
							<td>Complete Distribution (Data, Code and Extras)</td>
						</tr>
					</table>
				</html>
			`;
			mockFetch.mockResolvedValueOnce(new Response(mockHtml, { status: 200, headers: { 'Content-Type': 'text/html' } }));
			const result = await fetchDataOnlyDistributionUrl();
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.message).toContain('Could not find "Data Only Distribution" row in the table');
			}
		});
	});

	describe('updateTimezoneData', () => {
		it('should handle URL fetch failure', async () => {
			mockFetch.mockResolvedValueOnce(new Response('', { status: 500, statusText: 'Internal Server Error' }));
			const result = await updateTimezoneData('./test-dest', undefined, true);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.message).toContain('Failed to fetch IANA data URL');
			}
		});

		it('should skip download when current version matches fetched version', async () => {
			const testHtml = await fs.readFile(path.join(__dirname, 'data/time-zones.html'), 'utf-8');
			mockFetch.mockResolvedValueOnce(new Response(testHtml, { status: 200, headers: { 'Content-Type': 'text/html' } }));
			const result = await updateTimezoneData('./test-dest', '2025b', true);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.updated).toBe(false);
				expect(result.value.version).toBe('2025b');
			}
		});

		it('should proceed with download when current version is different', async () => {
			const testHtml = await fs.readFile(path.join(__dirname, 'data/time-zones.html'), 'utf-8');
			mockFetch.mockResolvedValueOnce(new Response(testHtml, { status: 200, headers: { 'Content-Type': 'text/html' } }));
			const result = await updateTimezoneData('./test-dest', '2024a', true);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.updated).toBe(true);
				expect(result.value.version).toBe('2025b');
			}
		});
	});
}); 
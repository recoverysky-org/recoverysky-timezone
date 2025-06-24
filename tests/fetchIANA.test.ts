import { fetchDataOnlyDistributionUrl, updateTimezoneData } from '../src/server/functions/fetchIANA';
import { promises as fs } from 'fs';
import path from 'path';

// Mock fetch globally
global.fetch = jest.fn();

describe('fetchIANA', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(global.fetch as jest.Mock).mockReset();
	});

	describe('fetchDataOnlyDistributionUrl', () => {
		it('should successfully fetch and parse IANA data URL from test HTML', async () => {
			// Read the test HTML file
			const testHtml = await fs.readFile(path.join(__dirname, 'data/time-zones.html'), 'utf-8');

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				text: () => Promise.resolve(testHtml)
			});

			const result = await fetchDataOnlyDistributionUrl();

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe('https://data.iana.org/time-zones/releases/tzdata2025b.tar.gz');
			}
			expect(global.fetch).toHaveBeenCalledWith('https://www.iana.org/time-zones');
		});

		it('should return error when fetch fails', async () => {
			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: 'Not Found'
			});

			const result = await fetchDataOnlyDistributionUrl();

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.message).toContain('Failed to fetch IANA page');
			}
		});

		it('should return error when iana-table is not found', async () => {
			const mockHtml = '<html><body>No table here</body></html>';

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				text: () => Promise.resolve(mockHtml)
			});

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

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				text: () => Promise.resolve(mockHtml)
			});

			const result = await fetchDataOnlyDistributionUrl();

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.message).toContain('Could not find "Data Only Distribution" row in the table');
			}
		});
	});

	describe('updateTimezoneData', () => {
		it('should handle URL fetch failure', async () => {
			// Mock fetch to fail
			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error'
			});

			const result = await updateTimezoneData('./test-dest', undefined, true);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.message).toContain('Failed to fetch IANA data URL');
			}
		});

		it('should skip download when current version matches fetched version', async () => {
			// Read the test HTML file
			const testHtml = await fs.readFile(path.join(__dirname, 'data/time-zones.html'), 'utf-8');

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				text: () => Promise.resolve(testHtml)
			});

			const result = await updateTimezoneData('./test-dest', '2025b', true);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.updated).toBe(false);
				expect(result.value.version).toBe('2025b');
			}
		});

		it('should proceed with download when current version is different', async () => {
			// Read the test HTML file
			const testHtml = await fs.readFile(path.join(__dirname, 'data/time-zones.html'), 'utf-8');

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				text: () => Promise.resolve(testHtml)
			});

			const result = await updateTimezoneData('./test-dest', '2024a', true);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value.updated).toBe(true);
				expect(result.value.version).toBe('2025b');
			}
		});
	});
}); 
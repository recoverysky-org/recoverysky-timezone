import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { Result, ok, err, tryResult, map, mapErr, assert, assertNotNil } from '../../common/utils/RustResult';

/**
 * Fetches the IANA timezone page and extracts the URL for the "Data Only Distribution"
 * @returns Promise<Result<string>> - The URL for the data-only distribution or an error
 */
export async function fetchDataOnlyDistributionUrl(): Promise<Result<string>> {
	return tryResult(async () => {
		// Fetch the IANA timezone page
		const response = await fetch('https://www.iana.org/time-zones');
		
		if (!response.ok) {
			throw new Error(`Failed to fetch IANA page: ${response.status} ${response.statusText}`);
		}
		
		const html = await response.text();
		
		// Parse the HTML to find the table with class "iana-table"
		const tableMatch = html.match(/<table class="iana-table">([\s\S]*?)<\/table>/);
		if (!tableMatch) {
			throw new Error('Could not find iana-table in the HTML');
		}
		const tableContent = tableMatch[1];

		// Find all rows
		const rowMatches = tableContent.match(/<tr>[\s\S]*?<\/tr>/g);
		if (!rowMatches) {
			throw new Error('Could not find any rows in the iana-table');
		}

		// Find the row containing "Data Only Distribution"
		const dataOnlyRow = rowMatches.find(row => row.includes('Data Only Distribution'));
		if (!dataOnlyRow) {
			throw new Error('Could not find "Data Only Distribution" row in the table');
		}

		// Extract the URL from the anchor tag in that row
		const urlMatch = dataOnlyRow.match(/href="([^"]+)"/);
		if (!urlMatch) {
			throw new Error('Could not find URL in the "Data Only Distribution" row');
		}
		const url = urlMatch[1];

		// Ensure it's a complete URL (add protocol if missing)
		if (url.startsWith('//')) {
			return `https:${url}`;
		} else if (url.startsWith('/')) {
			return `https://data.iana.org${url}`;
		}
		return url;
	});
}

/**
 * Downloads a tarball from URL, extracts it, and copies contents to destination folder
 * @param url - The URL of the tarball to download
 * @param destinationFolder - The folder to copy the extracted contents to
 * @param dryRun - If true, pass --dry-run flag to the shell script
 * @returns Promise<Result<void>> - Success or error result
 */
export async function downloadAndExtractTarball(url: string, destinationFolder: string, dryRun: boolean = false): Promise<Result<void>> {
	return tryResult(async () => {
		// Validate inputs using RustResult utilities
		assertNotNil(url, 'URL is required');
		assertNotNil(destinationFolder, 'Destination folder is required');
		assert(typeof url === 'string', new Error('URL must be a string'));
		assert(typeof destinationFolder === 'string', new Error('Destination folder must be a string'));
		
		// Validate URL format
		const urlCheck = await tryResult(async () => {
			new URL(url);
		});
		if (!urlCheck.ok) {
			throw new Error(`Invalid URL format: ${url}`);
		}
		
		// Get correct script path based on runtime location
		const isRunningFromDist = __dirname.includes('dist');
		// Always reference from source since scripts aren't copied to dist/
		const scriptPath = path.join(process.cwd(), 'src', 'scripts', 'downloadAndExtractTarball.zsh');
		const tmpDir = './tmp';
		
		// Check if script exists
		const scriptCheck = await tryResult(async () => {
			await fs.access(scriptPath);
		});
		if (!scriptCheck.ok) {
			throw new Error(`Download script not found: ${scriptPath}`);
		}
		
		console.log(`📥 Downloading tarball from: ${url}`);
		
		// Build command with optional --dry-run flag
		const dryRunFlag = dryRun ? ' --dry-run' : '';
		const command = `"${scriptPath}" "${url}" "${destinationFolder}" "${tmpDir}"${dryRunFlag}`;
		
		// Execute the shell script with timeout
		const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error('Script execution timed out after 1 minute'));
			}, 60 * 1000);
			
			const child = exec(command, {
				maxBuffer: 1024 * 1024,
				timeout: 60 * 1000
			}, (error, stdout, stderr) => {
				clearTimeout(timeout);
				
				if (error) {
					const errorMessage = typeof error.code === 'string' ? 
						(error.code === 'ENOENT' ? `Script not found: ${scriptPath}` :
						error.code === 'EACCES' ? `Permission denied: ${scriptPath}` :
						`System error: ${error.code}`) :
						error.signal ? `Terminated by signal: ${error.signal}` :
						`Script error: ${error.message}`;
					reject(new Error(errorMessage));
				} else {
					resolve({
						stdout: stdout || '',
						stderr: stderr || '',
						code: 0
					});
				}
			});
			
			child.on('error', (error) => {
				clearTimeout(timeout);
				reject(new Error(`Process error: ${error.message}`));
			});
		});
		
		// Handle script output
		if (result.stdout) console.log(result.stdout);
		if (result.stderr) console.error(result.stderr);
		
		// Map exit codes to errors
		if (result.code !== 0) {
			const errorMessages: { [key: number]: string } = {
				1: 'Invalid arguments provided to download script',
				2: 'Failed to create directories during download/extraction',
				3: 'Failed to download tarball from URL',
				4: 'Failed to extract tarball (corrupted or invalid format)',
				5: 'No contents found in extracted tarball',
				6: 'Failed to copy files to destination directory',
				7: 'Failed to cleanup temporary files'
			};
			
			const errorMessage = errorMessages[result.code] || `Script failed with exit code ${result.code}`;
			throw new Error(`Download and extraction failed: ${errorMessage}`);
		}
		
		console.log(`✅ Successfully downloaded and extracted to: ${destinationFolder}`);
	});
}

/**
 * Complete workflow: Fetch IANA data URL and download/extract to destination
 * @param destinationFolder - The folder to copy the extracted contents to
 * @param dryRun - If true, pass --dry-run flag to the shell script
 * @returns Promise<Result<void>> - Success or error result
 */
export async function updateTimezoneData(destinationFolder: string, dryRun: boolean = false): Promise<Result<void>> {
	// Step 1: Fetch the data URL
	const urlResult = await fetchDataOnlyDistributionUrl();
	if (!urlResult.ok) {
		return mapErr(urlResult, error => 
			new Error(`Failed to fetch IANA data URL: ${error.message}`)
		);
	}
	
	// Step 2: Download and extract the tarball
	const downloadResult = await downloadAndExtractTarball(urlResult.value, destinationFolder, dryRun);
	if (!downloadResult.ok) {
		return mapErr(downloadResult, error => 
			new Error(`Failed to download and extract tarball: ${error.message}`)
		);
	}
	
	return ok(undefined);
} 
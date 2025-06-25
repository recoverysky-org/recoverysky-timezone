import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { Err, Result, assert, assertNotNil, err, mapErr, ok, tryResult } from 'ts-rust-result';

/**
 * Fetches the IANA timezone page and extracts the URL for the "Data Only Distribution"
 * @returns Promise<Result<string>> - The URL for the data-only distribution or an error
 */
export async function fetchDataOnlyDistributionUrl(): Promise<Result<string>> {
	// Fetch the IANA timezone page
	const result: Result<Response> = await tryResult(async () => await fetch('https://www.iana.org/time-zones'));

	if (!result.ok || !result.value) {
		return err(new Error(`Failed to fetch IANA page: ${result.ok ? 'No response X' : result.error.toString()}`));
	}

	const response = result.value;
	
	// Check if the response is ok
	if (!response.ok) {
		return err(new Error(`Failed to fetch IANA page: ${response.status} ${response.statusText}`));
	}

	const html = await response.text();

	// Parse the HTML to find the table with class "iana-table"
	const tableMatch = html.match(/<table class="iana-table">([\s\S]*?)<\/table>/);
	if (!tableMatch) {
		return err(new Error('Could not find iana-table in the HTML'));
	}
	const tableContent = tableMatch[1];

	// Find all rows
	const rowMatches = tableContent.match(/<tr>[\s\S]*?<\/tr>/g);
	if (!rowMatches) {
		return err(new Error('Could not find any rows in the iana-table'));
	}

	// Find the row containing "Data Only Distribution"
	const dataOnlyRow = rowMatches.find((row: string) => row.includes('Data Only Distribution'));
	if (!dataOnlyRow) {
		return err(new Error('Could not find "Data Only Distribution" row in the table'));
	}

	// Extract the URL from the anchor tag in that row
	const urlMatch = dataOnlyRow.match(/href="([^"]+)"/);
	if (!urlMatch) {
		return err(new Error('Could not find URL in the "Data Only Distribution" row'));
	}
	
	const url = urlMatch[1];
	return ok(url);
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

		console.dir({ url, destinationFolder, dryRun });

		// Validate URL format
		const urlCheck = await tryResult(async () => {
			new URL(url);
		});
		if (!urlCheck.ok) {
			throw new Error(`Invalid URL format: ${url}`);
		}

		// Get correct script path based on environment
		const scriptPath = process.env.NODE_ENV === 'production'
			? path.join(process.cwd(), 'dist', 'scripts', 'downloadAndExtractTarball.sh')
			: path.join(process.cwd(), 'src', 'server', 'scripts', 'downloadAndExtractTarball.sh');
		const tmpDir = './tmp';

		console.log(`🔍 NODE_ENV: ${process.env.NODE_ENV}`);
		console.log(`🔍 Script path: ${scriptPath}`);

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
		const command = `"/bin/sh" "${scriptPath}" "${url}" "${destinationFolder}" "${tmpDir}"${dryRunFlag}`;

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
 * @param currentVersion - Current timezone data version (optional, for version checking)
 * @param dryRun - If true, pass --dry-run flag to the shell script
 * @returns Promise<Result<{ updated: boolean; version: string }>> - Success with update status and version
 */
export async function updateTimezoneData(destinationFolder: string, currentVersion?: string, dryRun: boolean = false): Promise<Result<{ updated: boolean; version: string }>> {
	// Step 1: Fetch the data URL
	const urlResult = await fetchDataOnlyDistributionUrl();
	if (!urlResult.ok) {
		return mapErr(urlResult, error =>
			new Error(`Failed to fetch IANA data URL: ${error.message}`)
		);
	}

	// Extract version from URL (e.g., "tzdata2025b.tar.gz" -> "2025b")
	const versionMatch = urlResult.value.match(/tzdata(\d{4}[a-z])\.tar\.gz$/);
	if (!versionMatch) {
		return err(new Error(`Could not extract version from URL: ${urlResult.value}`));
	}
	const newVersion = versionMatch[1];

	// Check if we already have the latest version
	if (currentVersion && currentVersion === newVersion) {
		console.log(`📅 Timezone data is already up to date (version ${currentVersion})`);
		return ok({ updated: false, version: newVersion });
	}

	// Step 2: Download and extract the tarball
	const downloadResult = await downloadAndExtractTarball(urlResult.value, destinationFolder, dryRun);
	if (!downloadResult.ok) {
		return mapErr(downloadResult, error =>
			new Error(`Failed to download and extract tarball: ${error.message}`)
		);
	}

	console.log(`📅 Updated timezone data from ${currentVersion || 'unknown'} to ${newVersion}`);
	return ok({ updated: true, version: newVersion });
} 
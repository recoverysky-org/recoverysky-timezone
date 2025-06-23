import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Fetches the IANA timezone page and extracts the URL for the "Data Only Distribution"
 * @returns Promise<string> - The URL for the data-only distribution
 */
export async function fetchDataOnlyDistributionUrl(): Promise<string> {
	try {
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
		
		// Find the row containing "Data Only Distribution"
		const dataOnlyRowMatch = tableContent.match(/<tr>[\s\S]*?Data Only Distribution[\s\S]*?<\/tr>/);
		
		if (!dataOnlyRowMatch) {
			throw new Error('Could not find "Data Only Distribution" row in the table');
		}
		
		const dataOnlyRow = dataOnlyRowMatch[0];
		
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
		
	} catch (error) {
		console.error('Error fetching IANA data distribution URL:', error);
		throw error;
	}
}

/**
 * Downloads a tarball from URL, extracts it, and copies contents to destination folder
 * @param url - The URL of the tarball to download
 * @param destinationFolder - The folder to copy the extracted contents to
 * @returns Promise<void>
 */
export async function downloadAndExtractTarball(url: string, destinationFolder: string): Promise<void> {
	const tmpDir = './tmp';
	const tmpDownloadPath = path.join(tmpDir, 'download.tar.gz');
	const tmpExtractPath = path.join(tmpDir, 'extracted');
	
	try {
		// Create tmp directory if it doesn't exist
		await fs.mkdir(tmpDir, { recursive: true });
		
		console.log(`📥 Downloading tarball from: ${url}`);
		
		// Download the tarball
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to download tarball: ${response.status} ${response.statusText}`);
		}
		
		const buffer = await response.arrayBuffer();
		await fs.writeFile(tmpDownloadPath, Buffer.from(buffer));
		
		console.log(`📦 Extracting tarball to: ${tmpExtractPath}`);
		
		// Create extraction directory
		await fs.mkdir(tmpExtractPath, { recursive: true });
		
		// Extract the tarball
		await execAsync(`tar -xzf "${tmpDownloadPath}" -C "${tmpExtractPath}"`);
		
		// Get the extracted directory name (usually the first subdirectory)
		const extractedContents = await fs.readdir(tmpExtractPath);
		if (extractedContents.length === 0) {
			throw new Error('No contents found in extracted tarball');
		}
		
		// If there's only one item and it's a directory, use that
		const extractedDir = path.join(tmpExtractPath, extractedContents[0]);
		const stats = await fs.stat(extractedDir);
		
		if (!stats.isDirectory()) {
			// If the first item is not a directory, use the extract path directly
			await copyDirectory(tmpExtractPath, destinationFolder);
		} else {
			// Copy the contents of the extracted directory
			await copyDirectory(extractedDir, destinationFolder);
		}
		
		console.log(`✅ Successfully copied contents to: ${destinationFolder}`);
		
	} catch (error) {
		console.error('Error downloading and extracting tarball:', error);
		throw error;
	} finally {
		// Clean up tmp files
		try {
			await fs.rm(tmpDir, { recursive: true, force: true });
		} catch (cleanupError) {
			console.warn('Warning: Could not clean up tmp directory:', cleanupError);
		}
	}
}

/**
 * Helper function to copy a directory recursively
 * @param source - Source directory path
 * @param destination - Destination directory path
 */
async function copyDirectory(source: string, destination: string): Promise<void> {
	// Create destination directory
	await fs.mkdir(destination, { recursive: true });
	
	const items = await fs.readdir(source);
	
	for (const item of items) {
		const sourcePath = path.join(source, item);
		const destPath = path.join(destination, item);
		
		const stats = await fs.stat(sourcePath);
		
		if (stats.isDirectory()) {
			await copyDirectory(sourcePath, destPath);
		} else {
			await fs.copyFile(sourcePath, destPath);
		}
	}
} 
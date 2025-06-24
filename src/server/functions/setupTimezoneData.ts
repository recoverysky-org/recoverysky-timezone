import { promises as fs } from 'fs';
import path from 'path';
import { Result, err, ok } from 'ts-rust-result';
import { updateTimezoneData } from './fetchIANA';
import { initializeTimezoneComplete } from './timezonecomplete-setup';

/**
 * Gets the correct tzdata path for the current environment
 * @returns string - Path to tzdata directory
 */
function getTzdataPath(): string {
	// Use NODE_ENV to determine the correct path
	const baseDir = process.env.NODE_ENV === 'production' ? 'dist' : 'src';
	return path.join(process.cwd(), baseDir, 'server', 'tzdata');
}

/**
 * Updates timezone data and initializes timezonecomplete
 * @returns Promise<Result<void>> - Success or error result
 */
export async function setupTimezoneData(): Promise<Result<void>> {
	const tzdataPath = getTzdataPath();
	console.log(`🌍 Using tzdata path: ${tzdataPath}`);

	// Get current version if available
	let currentVersion: string | undefined;
	try {
		const versionPath = path.join(tzdataPath, 'version');
		currentVersion = await fs.readFile(versionPath, 'utf-8');
		currentVersion = currentVersion.trim();
		console.log(`📅 Current timezone data version: ${currentVersion}`);
	} catch (error) {
		console.log('📅 No existing timezone data found, will download fresh copy');
	}

	// Update timezone data
	const updateResult = await updateTimezoneData(tzdataPath, currentVersion);
	if (!updateResult.ok) {
		return err(new Error(`Failed to update timezone data: ${updateResult.error.message}`));
	}

	// Only initialize timezonecomplete if data was updated or if we don't have a current version
	if (updateResult.value.updated || !currentVersion) {
		console.log('✅ Timezone data updated successfully');

		// Initialize timezonecomplete
		const initResult = await initializeTimezoneComplete();
		if (!initResult.ok) {
			return err(new Error(`Failed to initialize TimezoneComplete: ${initResult.error.message}`));
		}
		console.log('✅ TimezoneComplete initialized successfully');
	} else {
		console.log('✅ Timezone data is current, skipping timezonecomplete initialization');
	}

	return ok(undefined);
}

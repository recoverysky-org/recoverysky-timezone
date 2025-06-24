import { promises as fs } from 'fs';
import path from 'path';
import { Result, err, ok } from 'ts-rust-result';

/**
 * Configuration for timezonecomplete to use local tzdata
 */
interface TimezoneConfig {
	tzdir: string;
	zoneinfo: string;
	zone1970: string;
	zonenow: string;
	regions: {
		africa: string;
		antarctica: string;
		asia: string;
		australasia: string;
		europe: string;
		northamerica: string;
		southamerica: string;
		etcetera: string;
		backward: string;
		backzone: string;
		factory: string;
	};
	leapseconds: string;
	iso3166: string;
	version: string;
}

/**
 * Loads timezone configuration from the config file
 * @returns Promise<Result<TimezoneConfig>> - Configuration or error
 */
export async function loadTimezoneConfig(): Promise<Result<TimezoneConfig>> {
	try {
		// Determine which config file to use based on environment
		const configFileName = process.env.NODE_ENV === 'production' ? 'config.prod.tz' : 'config.dev.tz';
		const configPath = path.join(__dirname, configFileName);
		
		// Read config file
		const configContent = await fs.readFile(configPath, 'utf-8');
		
		// Parse TZDIR from config
		const tzdirMatch = configContent.match(/TZDIR=@(.+)/);
		if (!tzdirMatch) {
			return err(new Error(`TZDIR not found in config file: ${configFileName}`));
		}
		
		// Resolve the tzdata directory path
		const configTzdir = tzdirMatch[1];
		const baseDir = process.env.NODE_ENV === 'production' ? 'dist' : 'src';
		const tzdataDir = path.join(process.cwd(), baseDir, 'server', 'tzdata');

		// Verify tzdata directory exists
		await fs.access(tzdataDir);

		const config: TimezoneConfig = {
			tzdir: tzdataDir,
			zoneinfo: path.join(tzdataDir, 'zone.tab'),
			zone1970: path.join(tzdataDir, 'zone1970.tab'),
			zonenow: path.join(tzdataDir, 'zonenow.tab'),
			regions: {
				africa: path.join(tzdataDir, 'africa'),
				antarctica: path.join(tzdataDir, 'antarctica'),
				asia: path.join(tzdataDir, 'asia'),
				australasia: path.join(tzdataDir, 'australasia'),
				europe: path.join(tzdataDir, 'europe'),
				northamerica: path.join(tzdataDir, 'northamerica'),
				southamerica: path.join(tzdataDir, 'southamerica'),
				etcetera: path.join(tzdataDir, 'etcetera'),
				backward: path.join(tzdataDir, 'backward'),
				backzone: path.join(tzdataDir, 'backzone'),
				factory: path.join(tzdataDir, 'factory')
			},
			leapseconds: path.join(tzdataDir, 'leap-seconds.list'),
			iso3166: path.join(tzdataDir, 'iso3166.tab'),
			version: path.join(tzdataDir, 'version')
		};

		// Verify key files exist
		await fs.access(config.zoneinfo);
		await fs.access(config.zone1970);
		await fs.access(config.leapseconds);

		return ok(config);
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
}

/**
 * Initializes timezonecomplete with local tzdata configuration
 * @returns Promise<Result<void>> - Success or error
 */
export async function initializeTimezoneComplete(): Promise<Result<void>> {
	try {
		const configResult = await loadTimezoneConfig();
		if (!configResult.ok) {
			return configResult;
		}

		const config = configResult.value;

		// Set environment variables for timezonecomplete
		process.env.TZDIR = config.tzdir;
		process.env.LOCALTZ = '1';

		console.log(`🌍 TimezoneComplete initialized with local tzdata: ${config.tzdir}`);
		console.log(`📅 Using timezone data version: ${await fs.readFile(config.version, 'utf-8')}`);

		return ok(undefined);
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
}

/**
 * Gets the current timezone data version
 * @returns Promise<Result<string>> - Version string or error
 */
export async function getTimezoneVersion(): Promise<Result<string>> {
	try {
		const configResult = await loadTimezoneConfig();
		if (!configResult.ok) {
			return configResult;
		}

		const version = await fs.readFile(configResult.value.version, 'utf-8');
		return ok(version.trim());
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
}

/**
 * Validates that all required timezone files are present
 * @returns Promise<Result<boolean>> - True if all files exist, false or error otherwise
 */
export async function validateTimezoneFiles(): Promise<Result<boolean>> {
	try {
		const configResult = await loadTimezoneConfig();
		if (!configResult.ok) {
			return configResult;
		}

		const config = configResult.value;
		const requiredFiles = [
			config.zoneinfo,
			config.zone1970,
			config.leapseconds,
			config.iso3166,
			...Object.values(config.regions)
		];

		for (const file of requiredFiles) {
			try {
				await fs.access(file);
			} catch (error) {
				return err(new Error(`Missing required timezone file: ${file}`));
			}
		}

		return ok(true);
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
} 
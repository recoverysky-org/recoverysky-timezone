import { DateTime, zone } from "timezonecomplete";
import { assertNotNil, err, ok, Result } from "ts-rust-result";

/**
 * Determine whether a DateTime is currently in DST.
 * 
 * Algorithm:
 * 1. Get the current offset for the DateTime in its timezone
 * 2. Create a DateTime 6 months later (opposite season) in the same timezone
 * 3. Compare the offsets - if they differ, the current time is in DST
 * 
 * This works because:
 * - DST typically switches twice per year (spring forward, fall back)
 * - By checking 6 months apart, we're likely in opposite DST states
 * - If offsets differ, one must be in DST and one not
 * - We assume the current time is more likely to be in DST if it has a larger offset
 * 
 * @param dt - The DateTime to check for DST status
 * @returns Result<boolean> - true if the DateTime is in DST, false otherwise
 */
export function isDst(dt: DateTime): Result<boolean> {
	try {
		assertNotNil(dt, 'dt is required');
		
		// Get the current offset in minutes
		const currentOffset = dt.offset();
		
		// Create a DateTime 6 months later in the same timezone
		// This should be in the opposite DST state
		const utcMillis = dt.unixUtcMillis();
		const sixMonthsLaterMillis = utcMillis + (6 * 30 * 24 * 60 * 60 * 1000); // Approximate 6 months
		const sixMonthsLater = new DateTime(new Date(sixMonthsLaterMillis).toISOString(), dt.zone());
		const futureOffset = sixMonthsLater.offset();
		
		// If the offsets are different, we're in DST
		// We assume the larger offset is the DST offset
		return ok(currentOffset !== futureOffset && currentOffset > futureOffset);
	} catch (error) {
		return err(error as Error);
	}
}
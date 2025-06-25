import { DateTime, zone } from 'timezonecomplete';
import { assertNotNil, ok, err, Result, tryResult } from 'ts-rust-result';

/**
 * Gets the current UTC offset between two timezones
 * 
 * This function calculates the difference in milliseconds between the current time
 * in the source timezone and the current time in the target timezone (defaults to UTC).
 * The offset represents how many milliseconds ahead or behind the target timezone
 * the source timezone currently is, accounting for daylight saving time changes.
 * 
 * Algorithm:
 * 1. Create a DateTime object representing the current time in the source timezone
 * 2. Convert that DateTime to the target timezone (default UTC)
 * 3. Calculate the difference in milliseconds between the two representations
 * 4. Return both the ISO string representation and the millisecond offset
 * 
 * @param sourceTimeZone - The IANA timezone identifier (e.g., 'America/New_York', 'Europe/London')
 * @param targetTimeZone - The target timezone to calculate offset against (defaults to 'UTC')
 * @returns Promise<Result<{ iso: string; signedStr: string; millis: number }>> - Object containing:
 *   - iso: ISO string representation of the current time in source timezone
 *   - signedStr: Offset as signed string (e.g., "+05:30", "-08:00", "+00:00")
 *   - millis: Offset in milliseconds (positive = ahead, negative = behind target timezone)
 * 
 * @example
 * // Get offset from New York to UTC
 * const result = await getTzToTzOffset('America/New_York');
 * if (result.ok) {
 *   console.log(`Current time: ${result.value.iso}`);
 *   console.log(`Offset from UTC: ${result.value.signedStr}`);
 *   console.log(`Offset in ms: ${result.value.millis}ms`);
 * }
 * 
 * @example
 * // Get offset from Tokyo to London
 * const result = await getTzToTzOffset('Asia/Tokyo', 'Europe/London');
 * if (result.ok) {
 *   console.log(`Tokyo is ${result.value.signedStr} ahead of London`);
 * }
 * 
 * @throws {Error} If timezone identifiers are invalid or timezonecomplete is not initialized
 */
export async function getTzToTzOffset(
  sourceTimeZone: string,
  targetTimeZone: string = 'UTC'
): Promise<Result<{ iso: string; signedStr: string; millis: number }>> {
  // Validate required parameters using ts-rust-result assertions
  let result = assertNotNil(sourceTimeZone, 'sourceTimeZone is required', false);
  if (!result.ok) return result;

  result = assertNotNil(targetTimeZone, 'targetTimeZone is required', false);
  if (!result.ok) return result;

  // Use tryResult to wrap timezonecomplete operations that might throw
  try {
    // Create timezone objects - these can throw if timezone is invalid
    const sourceTz = zone(sourceTimeZone);
    const targetTz = zone(targetTimeZone);

    // Get current time in source timezone
    const now = new DateTime();
    const currentTimeInSource = now.toZone(sourceTz);

    // Get the timezone offset from UTC for the source timezone
    // timezonecomplete's offset() returns the offset in MINUTES, not milliseconds!
    // To convert to milliseconds, multiply by 60,000 (60 seconds * 1000 ms)
    const sourceOffsetMillis = currentTimeInSource.offset() * 60000;

    // Get the timezone offset from UTC for the target timezone
    // Same conversion applies here
    const currentTimeInTarget = now.toZone(targetTz);
    const targetOffsetMillis = currentTimeInTarget.offset() * 60000;

    // Calculate the difference between the two timezone offsets
    // Positive result: source timezone is ahead of target timezone
    // Negative result: source timezone is behind target timezone
    // This is robust for DST and all IANA timezones
    const offsetMillis = sourceOffsetMillis - targetOffsetMillis;

    // Convert offsetMillis into a signed string like "+05:30" or "-08:00"
    const isNegative = offsetMillis < 0;
    const absOffsetMillis = Math.abs(offsetMillis);
    const hours = Math.floor(absOffsetMillis / 3600000);
    const minutes = Math.floor((absOffsetMillis % 3600000) / 60000);
    
    // Format with proper sign and zero-padding
    const sign = isNegative ? '-' : '+';
    const hoursStr = hours.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');
    const signedStr = `${sign}${hoursStr}:${minutesStr}`;

    // The offset is always relative to the current instant (now),
    // so it will reflect DST and any current rules for the zones.
    return ok({
      iso: currentTimeInSource.toIsoString(), // ISO string in source timezone
      signedStr,
      millis: offsetMillis // Offset in milliseconds
    });
  } catch (error) {
    return err(new Error(`Failed to calculate UTC offset: ${error}`));
  }
}
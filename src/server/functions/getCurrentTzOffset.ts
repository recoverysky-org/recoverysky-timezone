import { DateTime, zone } from 'timezonecomplete';
import { assertNotNil, ok, err, Result } from 'ts-rust-result';

/**
 * Gets the current UTC offset for a timezone
 * 
 * This function calculates the difference in milliseconds between the current time
 * in the source timezone and UTC. The offset represents how many milliseconds ahead 
 * or behind UTC the source timezone currently is, accounting for daylight saving time changes.
 * 
 * Algorithm:
 * 1. Create a DateTime object representing the current time in the source timezone
 * 2. Calculate the offset from UTC in milliseconds
 * 3. Return both the ISO string representation and the millisecond offset
 * 
 * @param sourceTimeZone - The IANA timezone identifier (e.g., 'America/New_York', 'Europe/London')
 * @returns Promise<Result<{ iso: string; signedStr: string; millis: number }>> - Object containing:
 *   - iso: ISO string representation of the current time in source timezone
 *   - signedStr: Offset as signed string (e.g., "+05:30", "-08:00", "+00:00")
 *   - millis: Offset in milliseconds (positive = ahead of UTC, negative = behind UTC)
 * 
 * @example
 * // Get offset from New York to UTC
 * const result = await getCurrentTzOffset('America/New_York');
 * if (result.ok) {
 *   console.log(`Current time: ${result.value.iso}`);
 *   console.log(`Offset from UTC: ${result.value.signedStr}`);
 *   console.log(`Offset in ms: ${result.value.millis}ms`);
 * }
 * 
 * @throws {Error} If timezone identifier is invalid or timezonecomplete is not initialized
 */

export async function getCurrentTzOffset(
  sourceTimeZone: string,
): Promise<Result<{ iso: string; signedStr: string; millis: number }>> {

  try {
    // Validate required parameters using ts-rust-result assertions
    assertNotNil(sourceTimeZone, 'sourceTimeZone is required', false);

    // Create timezone object - this can throw if timezone is invalid
    const sourceTz = zone(sourceTimeZone);

    // Get current time in source timezone
    const now = new DateTime();
    const currentTimeInSource = now.toZone(sourceTz);

    // Get the timezone offset from UTC for the source timezone
    // timezonecomplete's offset() returns the offset in MINUTES, not milliseconds!
    // To convert to milliseconds, multiply by 60,000 (60 seconds * 1000 ms)
    const offsetMillis = currentTimeInSource.offset() * 60000;

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

    return ok({
      iso: currentTimeInSource.toIsoString(), // current source ISO DateTime string
      signedStr,                              // signed string like "+05:30" or "-08:00"
      millis: offsetMillis                    // signed offset in milliseconds to UTC
    });
  } catch (error) {
    return err(new Error(`Failed to calculate UTC offset: ${error}`));
  }
}
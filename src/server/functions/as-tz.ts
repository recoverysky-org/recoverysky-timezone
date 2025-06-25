import { DateTime, zone } from 'timezonecomplete';
import { assertNotNil, err, ok, Result } from 'ts-rust-result';

/**
 * Converts a UTC milliseconds to a timezone string
 * @param mills - The UTC milliseconds
 * @param targetTimeZone - The IANA timezone to return as a string
 * @returns Promise<Result<{ iso: string }>> - ISO string in target timezone or error
 */
export async function asTz(mills: string, targetTimeZone: string): Promise<Result<{ iso: string }>> {
  try {
    // Validate required parameters
    assertNotNil(mills, 'mills is required');
    assertNotNil(targetTimeZone, 'targetTimeZone is required');

    // Parse the input milliseconds as a number
    const milliseconds = parseInt(mills, 10);
    if (isNaN(milliseconds)) {
      throw new Error('Invalid milliseconds value');
    }

    // Create a DateTime from UTC milliseconds as an absolute instant
    const utcDateTime = new DateTime(new Date(milliseconds).toISOString(), zone('UTC'));

    // Convert to target timezone
    const targetTz = zone(targetTimeZone);
    const targetDateTime = utcDateTime.toZone(targetTz);

    return ok({
      iso: targetDateTime.toIsoString() // ISO string in target timezone
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
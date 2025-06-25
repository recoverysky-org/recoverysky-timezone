import { DateTime, zone } from 'timezonecomplete';
import { assertNotNil, err, ok, Result } from 'ts-rust-result';

/**
 * Converts an ISO datetime string to UTC
 * @param isoString - The ISO datetime string (with timezone info)
 * @returns Promise<Result<{ utc: string; milliseconds: number }>> - UTC string and milliseconds or error
 */
export async function convertToTimeZone(isoString: string, sourceTimeZone?: string, toTimeZone?: string ): Promise<Result<{ iso: string; millis: number }>> {
  try {
    let result = assertNotNil(isoString, 'isoString is required'); 
    result = assertNotNil(sourceTimeZone, 'sourceTimeZone is required'); 

    // Set defaults
    toTimeZone = toTimeZone || 'UTC';

    // Parse the input ISO string in the source time zone
    let sourceTz = zone(sourceTimeZone!)
    const source = new DateTime(isoString, sourceTz)

    // Convert to target time zone
    let destTz = zone(toTimeZone!)
    const target = source.toZone(destTz)

    return ok({
      iso: target.toIsoString(), // Full ISO string with offset
      millis: target.unixUtcMillis()
    });
  } catch (error) {
      return err(error as Error);
  }
}
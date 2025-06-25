import { DateTime, zone } from 'timezonecomplete';
import { assertNotNil, err, ok, Result } from 'ts-rust-result';

/**
 * Converts an ISO datetime string to UTC
 * @param isoString - The ISO datetime string (with timezone info)
 * @returns Promise<Result<{ utc: string; milliseconds: number }>> - UTC string and milliseconds or error
 */
export async function convertToTimeZone(isoString: string, fromTimeZone?: string, toTimeZone?: string ): Promise<Result<{ iso: string; millis: number }>> {
  try {
    let result = assertNotNil(isoString, 'isoString is required'); 
    result = assertNotNil(fromTimeZone, 'fromTimeZone is required'); 
    result = assertNotNil(toTimeZone, 'toTimeZone is required'); 

    // Parse the input ISO string in the source time zone
    let sourceTz = zone(fromTimeZone!)
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
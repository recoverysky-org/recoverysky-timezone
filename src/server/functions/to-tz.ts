import { DateTime, zone } from 'timezonecomplete';
import { assertNotNil, err, ok, Result, unwrap } from 'ts-rust-result';
import { isDst } from './is-dst';

/**
 * Converts an ISO datetime string to UTC
 * @param isoString - The ISO datetime string (timezone is ignored)
 * @param sourceTimeZone - The IANA timezone to convert to convert from
 * @param targetTimeZone - The IANA timezone to convert to (defaults to UTC)
 * @returns Promise<Result<{ iso: string; millis: number }>> - ISO string and milliseconds or error
 */
export async function toTz(isoString: string, sourceTimeZone?: string, targetTimeZone?: string ): Promise<Result<{ iso: string; millis: number }>> {
  try {
    assertNotNil(isoString, 'isoString is required'); 
    assertNotNil(sourceTimeZone, 'sourceTimeZone is required'); 

    // Set defaults
    targetTimeZone = targetTimeZone || 'UTC';

    // Parse the input ISO string in the source time zone
    let sourceTz = zone(sourceTimeZone!);
    const source = new DateTime(isoString, sourceTz);

    // Convert to target time zone
    let destTz = zone(targetTimeZone!);
    const target = source.toZone(destTz)

    return ok({
      iso: target.toIsoString(), // Full ISO string with offset
      dst: unwrap(isDst(target)),
      millis: target.unixUtcMillis()
    });
  } catch (error) {
      return err(error as Error);
  }
}
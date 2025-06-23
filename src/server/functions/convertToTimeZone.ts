import { assert, assertNotNil, ok, Result, tryResult } from "@/utils/RustResult";
import { isNil } from "lodash";
import { DateTime, TimeZone, zone } from 'timezonecomplete';

/**
 * Converts an ISO datetime string to UTC
 * @param isoString - The ISO datetime string (with timezone info)
 * @returns Promise<Result<{ utc: string; milliseconds: number }>> - UTC string and milliseconds or error
 */
export async function convertToTimeZone(isoString: string, fromTimeZone?: string, toTimeZone?: string ): Promise<Result<{ iso: string; millis: number }>> {
    let result = assertNotNil(isoString, 'isoString is required', false); if (!result.ok) return result;
    result = assertNotNil(fromTimeZone, 'fromTimeZone is required', false); if (!result.ok) return result;
    result = assertNotNil(toTimeZone, 'toTimeZone is required', false); if (!result.ok) return result;

    // Parse the input ISO string in the source time zone
    const source = new DateTime(isoString, zone(fromTimeZone!))

    // Convert to target time zone
    const target = source.toZone(zone(toTimeZone!))

    return ok({
      iso: target.toIsoString(), // Full ISO string with offset
      millis: target.unixUtcMillis()
    });
}
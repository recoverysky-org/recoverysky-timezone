import { getCurrentUtcOffset } from '../dist/server/functions/getCurrentUtcOffset.js';
import { isOk, isErr, Result } from 'ts-rust-result';

describe('getCurrentUtcOffset', () => {
    it('returns correct offset from New York to UTC', async () => {
        const result: Result<{ iso: string; millis: number }> = await getCurrentUtcOffset('America/New_York');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // New York is UTC-4 (summer) or UTC-5 (winter)
            const offsetHours = result.value.millis / (60 * 60 * 1000);
            expect(offsetHours).toBeGreaterThanOrEqual(-5);
            expect(offsetHours).toBeLessThanOrEqual(-4);
            expect(result.value.iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        }
    });

    it('returns correct offset from Tokyo to London', async () => {
        const result: Result<{ iso: string; millis: number }> = await getCurrentUtcOffset('Asia/Tokyo', 'Europe/London');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // Tokyo is UTC+9, London is UTC+0/+1, so offset is 8-9 hours
            const offsetHours = result.value.millis / (60 * 60 * 1000);
            expect(offsetHours).toBeGreaterThanOrEqual(8);
            expect(offsetHours).toBeLessThanOrEqual(9);
        }
    });

    it('returns zero offset for same timezone', async () => {
        const result: Result<{ iso: string; millis: number }> = await getCurrentUtcOffset('UTC', 'UTC');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            expect(result.value.millis).toBe(0);
        }
    });

    it('returns error for invalid timezone', async () => {
        const result: Result<{ iso: string; millis: number }> = await getCurrentUtcOffset('Invalid/Timezone');
        
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error.message).toMatch(/non-existing time zone name|Failed to calculate UTC offset/i);
        }
    });

    it('returns error for missing source timezone', async () => {
        const result = await getCurrentUtcOffset();
        
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
            expect(result.error.message).toMatch(/sourceTimeZone is required/i);
        }
    });
}); 
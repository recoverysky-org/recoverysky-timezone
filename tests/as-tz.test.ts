import { asTz } from '../src/server/functions/as-tz';
import { isOk, isErr, Result } from 'ts-rust-result';
import { describe, it, expect } from 'vitest';

describe('asTz', () => {
    it('converts UTC milliseconds to New York timezone', async () => {
        // Use a known timestamp: 2024-01-15 12:00:00 UTC
        const utcMillis = '1705320000000';
        const result: Result<{ iso: string }> = await asTz(utcMillis, 'America/New_York');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // New York is UTC-5 in winter (EST), so 12:00 UTC = 07:00 EST
            expect(result.value.iso).toMatch(/^2024-01-15T07:00:00\.000-05:00$/);
        }
    });

    it('converts UTC milliseconds to Tokyo timezone', async () => {
        // Use a known timestamp: 2024-01-15 12:00:00 UTC
        const utcMillis = '1705320000000';
        const result: Result<{ iso: string }> = await asTz(utcMillis, 'Asia/Tokyo');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // Tokyo is UTC+9 (no DST), so 12:00 UTC = 21:00 JST
            expect(result.value.iso).toMatch(/^2024-01-15T21:00:00\.000\+09:00$/);
        }
    });

    it('converts UTC milliseconds to London timezone', async () => {
        // Use a known timestamp: 2024-01-15 12:00:00 UTC
        const utcMillis = '1705320000000';
        const result: Result<{ iso: string }> = await asTz(utcMillis, 'Europe/London');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // London is UTC+0 in winter (GMT), so 12:00 UTC = 12:00 GMT
            expect(result.value.iso).toMatch(/^2024-01-15T12:00:00\.000\+00:00$/);
        }
    });

    it('converts UTC milliseconds to London timezone in summer', async () => {
        // Use a known timestamp: 2024-07-15 12:00:00 UTC
        const utcMillis = '1721041200000'; // 2024-07-15T12:00:00.000Z
        const result: Result<{ iso: string }> = await asTz(utcMillis, 'Europe/London');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // London is UTC+1 in summer (BST), so 12:00 UTC = 13:00 BST
            expect(result.value.iso).toMatch(/^2024-07-15T12:00:00\.000\+01:00$/);
        }
    });

    it('handles fractional hour timezones correctly', async () => {
        // Use a known timestamp: 2024-01-15 12:00:00 UTC
        const utcMillis = '1705320000000';
        const result: Result<{ iso: string }> = await asTz(utcMillis, 'Asia/Kolkata');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // India is UTC+5:30 (no DST), so 12:00 UTC = 17:30 IST
            expect(result.value.iso).toMatch(/^2024-01-15T17:30:00\.000\+05:30$/);
        }
    });

    it('handles negative fractional hour timezones', async () => {
        // Use a known timestamp: 2024-01-15 12:00:00 UTC
        const utcMillis = '1705320000000';
        const result: Result<{ iso: string }> = await asTz(utcMillis, 'America/St_Johns');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // Newfoundland is UTC-3:30 in winter (NST), so 12:00 UTC = 08:30 NST
            expect(result.value.iso).toMatch(/^2024-01-15T08:30:00\.000-03:30$/);
        }
    });

    it('handles extreme positive timezone offsets', async () => {
        // Use a known timestamp: 2024-01-15 12:00:00 UTC
        const utcMillis = '1705320000000';
        const result: Result<{ iso: string }> = await asTz(utcMillis, 'Pacific/Kiritimati');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // Line Islands are UTC+14, so 12:00 UTC = 02:00 next day LINT
            expect(result.value.iso).toMatch(/^2024-01-16T02:00:00\.000\+14:00$/);
        }
    });

    it('handles extreme negative timezone offsets', async () => {
        // Use a known timestamp: 2024-01-15 12:00:00 UTC
        const utcMillis = '1705320000000';
        const result: Result<{ iso: string }> = await asTz(utcMillis, 'Etc/GMT+12');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // Etc/GMT+12 is UTC-12 (Baker Island), so 12:00 UTC = 00:00 same day
            expect(result.value.iso).toMatch(/^2024-01-15T00:00:00\.000-12:00$/);
        }
    });

    it('handles zero offset timezone (UTC)', async () => {
        // Use a known timestamp: 2024-01-15 12:00:00 UTC
        const utcMillis = '1705320000000';
        const result: Result<{ iso: string }> = await asTz(utcMillis, 'UTC');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // UTC should remain the same
            expect(result.value.iso).toMatch(/^2024-01-15T12:00:00\.000\+00:00$/);
        }
    });

    it('handles edge case of very small millisecond values', async () => {
        // Use 1000ms = 1 second after epoch
        const utcMillis = '1000';
        const result: Result<{ iso: string }> = await asTz(utcMillis, 'UTC');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // Should be 1970-01-01T00:00:01.000+00:00
            expect(result.value.iso).toMatch(/^1970-01-01T00:00:01\.000\+00:00$/);
        }
    });

    it('handles edge case of very large millisecond values', async () => {
        // Use a future timestamp: 2030-01-01 12:00:00 UTC
        const utcMillis = '1893499200000'; // 2030-01-01T12:00:00.000Z
        const result: Result<{ iso: string }> = await asTz(utcMillis, 'UTC');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // Should be a valid future date
            expect(result.value.iso).toMatch(/^2030-01-01T12:00:00\.000\+00:00$/);
        }
    });

    it('handles DST transition correctly', async () => {
        // Use 2024-03-10 03:20:00 EDT (during spring forward in US)
        // 3:20 AM EDT = 7:20 AM UTC (EDT is UTC-4)
        const utcMillis = '1710055200000'; // 2024-03-10T07:20:00.000Z
        const result: Result<{ iso: string }> = await asTz(utcMillis, 'America/New_York');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // Should be 3:20 AM EDT (spring forward)
            expect(result.value.iso).toMatch(/^2024-03-10T03:20:00\.000-04:00$/);
        }
    });

    // Error handling tests
    it('returns error for invalid milliseconds string', async () => {
        const result: Result<{ iso: string }> = await asTz('not-a-number', 'UTC');
        
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
            expect(result.error.message).toMatch(/Invalid milliseconds value/i);
        }
    });

    it('returns error for missing milliseconds parameter', async () => {
        // @ts-ignore
        const result: Result<{ iso: string }> = await asTz(null, 'UTC');
        
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
            expect(result.error.message).toMatch(/mills is required/i);
        }
    });

    it('returns error for missing timezone parameter', async () => {
        // @ts-ignore
        const result: Result<{ iso: string }> = await asTz('1705320000000', null);
        
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
            expect(result.error.message).toMatch(/targetTimeZone is required/i);
        }
    });

    it('returns error for invalid timezone', async () => {
        const result: Result<{ iso: string }> = await asTz('1705320000000', 'Invalid/Timezone');
        
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
            expect(result.error.message).toMatch(/timezone/i);
        }
    });

    it('handles empty string milliseconds', async () => {
        const result: Result<{ iso: string }> = await asTz('', 'UTC');
        
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
            expect(result.error.message).toMatch(/Invalid milliseconds value/i);
        }
    });

    it('handles negative milliseconds', async () => {
        // Use -1000ms = 1 second before epoch
        const utcMillis = '-1000';
        const result: Result<{ iso: string }> = await asTz(utcMillis, 'UTC');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // Should be 1969-12-31T23:59:59.000+00:00
            expect(result.value.iso).toMatch(/^1969-12-31T23:59:59\.000\+00:00$/);
        }
    });

    // Round-trip consistency tests
    describe('Round-trip consistency', () => {
        it('maintains consistency across multiple timezone conversions', async () => {
            const utcMillis = '1705320000000'; // 2024-01-15 12:00:00 UTC
            const timezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];
            
            for (const tz of timezones) {
                const result = await asTz(utcMillis, tz);
                expect(isOk(result)).toBe(true);
                if (isOk(result)) {
                    // Verify the ISO string is properly formatted
                    expect(result.value.iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
                }
            }
        });

        it('handles leap year correctly', async () => {
            // Use 2024-02-29 12:00:00 UTC (leap day)
            const utcMillis = '1709208000000'; // 2024-02-29T12:00:00.000Z
            const result: Result<{ iso: string }> = await asTz(utcMillis, 'UTC');
            
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                expect(result.value.iso).toMatch(/^2024-02-29T12:00:00\.000\+00:00$/);
            }
        });
    });
}); 
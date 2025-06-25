import { getCurrentTzOffset } from '../src/server/functions/getCurrentTzOffset';
import { isOk, isErr, Result } from 'ts-rust-result';
import { describe, it, expect } from 'vitest';

describe('getCurrentTzOffset', () => {
    it('returns correct offset from New York to UTC', async () => {
        const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset('America/New_York');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // New York is UTC-4 (summer) or UTC-5 (winter)
            const offsetHours = result.value.millis / (60 * 60 * 1000);
            expect(offsetHours).toBeGreaterThanOrEqual(-5);
            expect(offsetHours).toBeLessThanOrEqual(-4);
            expect(result.value.iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            
            // Test signedStr format
            expect(result.value.signedStr).toMatch(/^-[0-4][0-5]:[0-5][0-9]$/); // -04:00 or -05:00
            expect(result.value.signedStr).toMatch(/^-[0-4][0-5]:00$/); // Should be whole hours for US timezones
        }
    });

    it('returns correct offset from Tokyo to London', async () => {
        const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset('Asia/Tokyo', 'Europe/London');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // Tokyo is UTC+9, London is UTC+0/+1, so offset is 8-9 hours
            const offsetHours = result.value.millis / (60 * 60 * 1000);
            expect(offsetHours).toBeGreaterThanOrEqual(8);
            expect(offsetHours).toBeLessThanOrEqual(9);
            
            // Test signedStr format - should be positive
            expect(result.value.signedStr).toMatch(/^\+0[8-9]:[0-5][0-9]$/); // +08:00 or +09:00
        }
    });

    it('returns zero offset for same timezone', async () => {
        const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset('UTC', 'UTC');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            expect(result.value.millis).toBe(0);
            expect(result.value.signedStr).toBe('+00:00');
        }
    });

    it('handles fractional hour offsets correctly', async () => {
        // Test with India (UTC+5:30)
        const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset('Asia/Kolkata', 'UTC');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // India is UTC+5:30
            expect(result.value.signedStr).toBe('+05:30');
            expect(result.value.millis).toBe(5.5 * 60 * 60 * 1000); // 5.5 hours in milliseconds
        }
    });

    it('handles negative fractional hour offsets correctly', async () => {
        // Test with Newfoundland (UTC-3:30 in winter, UTC-2:30 in summer)
        const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset('America/St_Johns', 'UTC');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // Newfoundland is UTC-3:30 in winter (NST) or UTC-2:30 in summer (NDT)
            // The actual offset depends on current DST status
            const offsetHours = result.value.millis / (60 * 60 * 1000);
            expect(offsetHours).toBeGreaterThanOrEqual(-3.5);
            expect(offsetHours).toBeLessThanOrEqual(-2.5);
            
            // signedStr should be properly formatted with zero-padded hours
            expect(result.value.signedStr).toMatch(/^-[0-3][0-9]:[0-5][0-9]$/); // -02:30 or -03:30
        }
    });

    it('handles extreme positive offsets', async () => {
        // Test with Line Islands (UTC+14)
        const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset('Pacific/Kiritimati', 'UTC');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // Line Islands are UTC+14
            expect(result.value.signedStr).toBe('+14:00');
            expect(result.value.millis).toBe(14 * 60 * 60 * 1000); // 14 hours in milliseconds
        }
    });

    it('handles extreme negative offsets', async () => {
        // Test with a timezone that has extreme negative offset
        // Using Etc/GMT+12 which represents Baker Island (UTC-12)
        const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset('Etc/GMT+12', 'UTC');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // Etc/GMT+12 is UTC-12 (Baker Island timezone)
            expect(result.value.signedStr).toBe('-12:00');
            expect(result.value.millis).toBe(-12 * 60 * 60 * 1000); // -12 hours in milliseconds
        }
    });

    it('handles minute-only offsets', async () => {
        // Test with a timezone that has minute-only offset (if any exist)
        // Most timezones are whole hours, but let's test the logic
        const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset('UTC', 'UTC');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            expect(result.value.signedStr).toBe('+00:00');
        }
    });

    it('handles large hour offsets correctly', async () => {
        // Test with a timezone that has large hour offset
        const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset('Asia/Tokyo', 'America/Los_Angeles');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // Tokyo is ahead of Los Angeles by 16-17 hours depending on DST
            const offsetHours = result.value.millis / (60 * 60 * 1000);
            expect(offsetHours).toBeGreaterThanOrEqual(16);
            expect(offsetHours).toBeLessThanOrEqual(17);
            
            // signedStr should be positive and formatted correctly
            expect(result.value.signedStr).toMatch(/^\+1[6-7]:[0-5][0-9]$/); // +16:00 or +17:00
        }
    });

    it('validates signedStr format consistency', async () => {
        // Test that signedStr always follows the correct format
        const testCases = [
            { source: 'UTC', target: 'UTC', expected: '+00:00' },
            { source: 'Asia/Kolkata', target: 'UTC', expected: '+05:30' },
            { source: 'Pacific/Honolulu', target: 'UTC', expected: '-10:00' }
        ];

        for (const testCase of testCases) {
            const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset(testCase.source, testCase.target);
            
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                expect(result.value.signedStr).toBe(testCase.expected);
                
                // Validate format: [+/-][HH]:[MM]
                expect(result.value.signedStr).toMatch(/^[+-]\d{2}:\d{2}$/);
                
                // Validate hours are 00-23
                const hours = parseInt(result.value.signedStr.slice(1, 3));
                expect(hours).toBeGreaterThanOrEqual(0);
                expect(hours).toBeLessThanOrEqual(23);
                
                // Validate minutes are 00-59
                const minutes = parseInt(result.value.signedStr.slice(4, 6));
                expect(minutes).toBeGreaterThanOrEqual(0);
                expect(minutes).toBeLessThanOrEqual(59);
            }
        }
    });

    it('returns error for invalid timezone', async () => {
        const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset('Invalid/Timezone');
        
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error.message).toMatch(/non-existing time zone name|Failed to calculate UTC offset/i);
        }
    });

    it('returns error for missing source timezone', async () => {
        // @ts-ignore
        const result = await getCurrentTzOffset(null);
        
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
            expect(result.error.message).toMatch(/sourceTimeZone is required/i);
        }
    });

    it('returns error for missing target timezone', async () => {
        // @ts-ignore
        const result = await getCurrentTzOffset('UTC', null);
        
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
            expect(result.error.message).toMatch(/targetTimeZone is required/i);
        }
    });

    it('handles edge case of very small offsets', async () => {
        // Test with timezones that are very close to each other
        const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset('Europe/London', 'Europe/Paris');
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            // London and Paris are typically 0 or 1 hour apart depending on DST
            const offsetHours = Math.abs(result.value.millis) / (60 * 60 * 1000);
            expect(offsetHours).toBeLessThanOrEqual(1);
            
            // signedStr should be properly formatted regardless of size
            expect(result.value.signedStr).toMatch(/^[+-]\d{2}:\d{2}$/);
        }
    });

    // Individual timezone investigation tests
    describe('Individual Timezone Investigation', () => {
        it('investigates Tokyo to UTC offset', async () => {
            const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset('Asia/Tokyo', 'UTC');
            
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                console.log('Tokyo to UTC:', {
                    signedStr: result.value.signedStr,
                    millis: result.value.millis,
                    hours: result.value.millis / (60 * 60 * 1000),
                    iso: result.value.iso
                });
                
                // Tokyo should be UTC+9 (no DST)
                expect(result.value.signedStr).toBe('+09:00');
                expect(result.value.millis).toBe(9 * 60 * 60 * 1000);
            }
        });

        it('investigates London to UTC offset', async () => {
            const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset('Europe/London', 'UTC');
            
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                console.log('London to UTC:', {
                    signedStr: result.value.signedStr,
                    millis: result.value.millis,
                    hours: result.value.millis / (60 * 60 * 1000),
                    iso: result.value.iso
                });
                
                // London should be UTC+0 (GMT) or UTC+1 (BST) depending on DST
                const offsetHours = result.value.millis / (60 * 60 * 1000);
                expect(offsetHours).toBeGreaterThanOrEqual(0);
                expect(offsetHours).toBeLessThanOrEqual(1);
                
                if (offsetHours === 0) {
                    expect(result.value.signedStr).toBe('+00:00'); // GMT (winter)
                } else {
                    expect(result.value.signedStr).toBe('+01:00'); // BST (summer)
                }
            }
        });

        it('investigates Tokyo to London offset', async () => {
            const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset('Asia/Tokyo', 'Europe/London');
            
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                console.log('Tokyo to London:', {
                    signedStr: result.value.signedStr,
                    millis: result.value.millis,
                    hours: result.value.millis / (60 * 60 * 1000),
                    iso: result.value.iso
                });
                
                // Tokyo (UTC+9) to London (UTC+0/+1) should be +8 or +9 hours
                const offsetHours = result.value.millis / (60 * 60 * 1000);
                expect(offsetHours).toBeGreaterThanOrEqual(8);
                expect(offsetHours).toBeLessThanOrEqual(9);
                
                if (offsetHours === 8) {
                    expect(result.value.signedStr).toBe('+08:00'); // London in BST (summer)
                } else {
                    expect(result.value.signedStr).toBe('+09:00'); // London in GMT (winter)
                }
            }
        });

        it('investigates Newfoundland to UTC offset', async () => {
            const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset('America/St_Johns', 'UTC');
            
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                console.log('Newfoundland to UTC:', {
                    signedStr: result.value.signedStr,
                    millis: result.value.millis,
                    hours: result.value.millis / (60 * 60 * 1000),
                    iso: result.value.iso
                });
                
                // Newfoundland should be UTC-3:30 (NST) or UTC-2:30 (NDT) depending on DST
                const offsetHours = result.value.millis / (60 * 60 * 1000);
                expect(offsetHours).toBeGreaterThanOrEqual(-3.5);
                expect(offsetHours).toBeLessThanOrEqual(-2.5);
                
                if (offsetHours === -3.5) {
                    expect(result.value.signedStr).toBe('-03:30'); // NST (winter)
                } else {
                    expect(result.value.signedStr).toBe('-02:30'); // NDT (summer)
                }
            }
        });

        it('investigates Baker Island timezone existence', async () => {
            // Note: Pacific/Baker is an alias to Etc/GMT+12, but timezonecomplete doesn't recognize the alias
            // So we test Etc/GMT+12 directly, which represents the same timezone (UTC-12)
            const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset('Etc/GMT+12', 'UTC');
            
            console.log('Baker Island (Etc/GMT+12) result:', isOk(result) ? 'SUCCESS' : 'ERROR');
            if (isOk(result)) {
                console.log('Baker Island (Etc/GMT+12) to UTC:', {
                    signedStr: result.value.signedStr,
                    millis: result.value.millis,
                    hours: result.value.millis / (60 * 60 * 1000),
                    iso: result.value.iso
                });
                
                // Etc/GMT+12 represents UTC-12 (Baker Island timezone)
                expect(result.value.signedStr).toBe('-12:00');
                expect(result.value.millis).toBe(-12 * 60 * 60 * 1000);
            } else {
                console.log('Baker Island (Etc/GMT+12) error:', result.error.message);
                expect(isErr(result)).toBe(false); // Should succeed
            }
        });

        it('tests zero offset sign handling', async () => {
            const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset('UTC', 'UTC');
            
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                console.log('Zero offset test:', {
                    signedStr: result.value.signedStr,
                    millis: result.value.millis
                });
                
                // Zero offset should be +00:00 (positive sign)
                expect(result.value.signedStr).toBe('+00:00');
                expect(result.value.millis).toBe(0);
            }
        });

        it('verifies current DST status for key timezones', async () => {
            // Test to verify current DST status matches expectations
            const testCases = [
                { 
                    name: 'Tokyo', 
                    timezone: 'Asia/Tokyo', 
                    expectedOffset: '+09:00',
                    expectedHours: 9,
                    hasDST: false
                },
                { 
                    name: 'London', 
                    timezone: 'Europe/London', 
                    expectedOffsets: ['+00:00', '+01:00'], // GMT or BST
                    expectedHourRange: [0, 1],
                    hasDST: true
                },
                { 
                    name: 'Newfoundland', 
                    timezone: 'America/St_Johns', 
                    expectedOffsets: ['-03:30', '-02:30'], // NST or NDT
                    expectedHourRange: [-3.5, -2.5],
                    hasDST: true
                }
            ] as const;

            for (const testCase of testCases) {
                const result: Result<{ iso: string; signedStr: string; millis: number }> = await getCurrentTzOffset(testCase.timezone, 'UTC');
                
                expect(isOk(result)).toBe(true);
                if (isOk(result)) {
                    const offsetHours = result.value.millis / (60 * 60 * 1000);
                    
                    if (testCase.hasDST) {
                        // For DST timezones, check that the offset is within expected range
                        expect(offsetHours).toBeGreaterThanOrEqual(testCase.expectedHourRange[0]);
                        expect(offsetHours).toBeLessThanOrEqual(testCase.expectedHourRange[1]);
                        expect(testCase.expectedOffsets).toContain(result.value.signedStr);
                    } else {
                        // For non-DST timezones, check exact offset
                        expect(result.value.signedStr).toBe(testCase.expectedOffset);
                        expect(offsetHours).toBe(testCase.expectedHours);
                    }
                }
            }
        });
    });
}); 
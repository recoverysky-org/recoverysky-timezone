import { asTz } from '../src/server/functions/as-tz';
import { isOk, isErr, Result } from 'ts-rust-result';
import { describe, it, expect } from 'vitest';

describe('asTz Debug', () => {
    it('debug simple case', async () => {
        const utcMillis = '1705312800000';
        const result: Result<{ iso: string }> = await asTz(utcMillis, 'UTC');
        
        // Show the actual result and error
        if (isErr(result)) {
            console.log('Error occurred:', result.error.message);
            expect(result.error.message).toContain('some error'); // This will show the actual error
        } else {
            console.log('Success:', result.value);
            expect(result.value.iso).toBeDefined();
        }
        
        expect(isOk(result)).toBe(true);
    });
}); 
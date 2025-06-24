// 📁 /src/server/index.ts
// CLI entrypoint for the timezone conversion API server

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { logger } from './logger';
import { startServer } from './server';

// CLI setup with yargs
async function main() {
    const argv = await yargs(hideBin(process.argv))
        .command('start', 'Start the timezone conversion API server', {
            debug: {
                type: 'boolean',
                default: false,
                describe: 'Enable debug logging'
            }
        })
        .demandCommand(1, 'You must specify a command')
        .help()
        .argv;

    // Set debug mode based on CLI flag
    logger.setDebugMode((argv as any).debug as boolean);

    // CLI command handler
    if ((argv as any)._[0] === 'start') {
        await startServer();
    }
}

// Initialize CLI
main().catch((error) => {
    logger.error(`CLI startup failed: ${error.message}`);
    process.exit(1);
});

import os from 'os';
import process from 'process';

import { createServer } from './server.js';

export { createServer };

// --------------------------------------------------
// FRAMEWORK INFO
// --------------------------------------------------

export const version = '1.0.0';

export const framework = 'CForge';

// --------------------------------------------------
// MAIN FILE DETECTION
// --------------------------------------------------

const isMain =
  process.argv[1] ===
  new URL(import.meta.url).pathname;

// --------------------------------------------------
// AUTO START
// --------------------------------------------------

if (isMain) {

  const start = Date.now();

  const app = createServer();

  const PORT =
    process.env.PORT || 3000;

  const HOST =
    process.env.HOST || '0.0.0.0';

  const ENV =
    process.env.NODE_ENV || 'development';

  // ----------------------------------------------
  // DEFAULT ROOT ROUTE
  // ----------------------------------------------

  app.get('/', (req, res) => {

    res.json({
      framework,
      version,
      status: 'running',
      environment: ENV
    });

  });

  // ----------------------------------------------
  // START SERVER
  // ----------------------------------------------

  app.listen(PORT, HOST, () => {

    const time =
      Date.now() - start;

    console.log('');
    console.log('╔══════════════════════════════╗');
    console.log('║         CForge              ║');
    console.log('║   Lightweight Node Server   ║');
    console.log('╚══════════════════════════════╝');
    console.log('');

    console.log(`🚀 Server Started`);
    console.log('');

    console.log(`Framework : ${framework}`);
    console.log(`Version   : ${version}`);
    console.log(`Mode      : ${ENV}`);
    console.log(`Platform  : ${os.platform()}`);
    console.log(`Node      : ${process.version}`);
    console.log(`PID       : ${process.pid}`);
    console.log(`Startup   : ${time}ms`);

    console.log('');

    console.log(`Local     : http://localhost:${PORT}`);

    console.log('');

  });

  // ----------------------------------------------
  // SHUTDOWN HANDLER
  // ----------------------------------------------

  const shutdown = (signal) => {

    console.log('');
    console.log(`⚠ Received ${signal}`);
    console.log('Closing server...');
    console.log('');

    process.exit(0);

  };

  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });

}

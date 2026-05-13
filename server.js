import http from 'http';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { Router } from './router.js';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain'
};

/**
 * Returns all local IPv4 addresses
 */
export function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const iface of Object.values(interfaces)) {
    for (const config of iface || []) {
      if (config.family === 'IPv4' && !config.internal) {
        ips.push(config.address);
      }
    }
  }

  return ips;
}

/**
 * Create custom server
 */
export function createServer(options = {}) {
  const router = new Router();

  let staticFolder = null;

  const server = http.createServer(async (req, res) => {
    try {
      // --------------------------
      // RESPONSE HELPERS
      // --------------------------

      res.json = (data, status = 200) => {
        res.writeHead(status, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify(data, null, 2));
      };

      res.send = (body, status = 200) => {
        res.writeHead(status, {
          'Content-Type': 'text/plain'
        });
        res.end(String(body));
      };

      res.html = (body, status = 200) => {
        res.writeHead(status, {
          'Content-Type': 'text/html'
        });
        res.end(body);
      };

      res.file = (filePath) => {
        try {
          const ext = path.extname(filePath);
          const type = MIME_TYPES[ext] || 'application/octet-stream';

          const data = fs.readFileSync(filePath);

          res.writeHead(200, {
            'Content-Type': type
          });

          res.end(data);
        } catch {
          res.writeHead(404);
          res.end('File not found');
        }
      };

      // --------------------------
      // REQUEST PARSING
      // --------------------------

      req.body = await parseBody(req);

      const url = new URL(req.url, `http://${req.headers.host}`);

      req.query = Object.fromEntries(url.searchParams);
      req.pathname = url.pathname;

      // --------------------------
      // STATIC FILE SUPPORT
      // --------------------------

      if (staticFolder) {
        let filePath = path.join(
          staticFolder,
          req.pathname === '/'
            ? 'index.html'
            : req.pathname
        );

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          return res.file(filePath);
        }
      }

      // --------------------------
      // ROUTER
      // --------------------------

      const handled = await router.handle(req, res);

      if (!handled) {
        res.json({
          error: 'Not Found',
          path: req.pathname
        }, 404);
      }

    } catch (err) {
      if (options.onError) {
        options.onError(err, req, res);
      } else {
        console.error(err);

        res.json({
          error: 'Internal Server Error',
          message: err.message
        }, 500);
      }
    }
  });

  // --------------------------
  // LISTEN OVERRIDE
  // --------------------------

  const originalListen = server.listen.bind(server);

  server.listen = (port, ...args) => {
    const cb = args.find(a => typeof a === 'function');
    const rest = args.filter(a => typeof a !== 'function');

    return originalListen(port, ...rest, () => {
      console.log('');
      console.log('🚀 Server running');
      console.log('');

      console.log(`Local:   http://localhost:${port}`);

      for (const ip of getLocalIPs()) {
        console.log(`Network: http://${ip}:${port}`);
      }

      console.log('');

      if (cb) cb();
    });
  };

  // --------------------------
  // ROUTES
  // --------------------------

  server.router = router;

  server.get = (path, ...handlers) =>
    router.add('GET', path, handlers);

  server.post = (path, ...handlers) =>
    router.add('POST', path, handlers);

  server.put = (path, ...handlers) =>
    router.add('PUT', path, handlers);

  server.delete = (path, ...handlers) =>
    router.add('DELETE', path, handlers);

  server.use = (path, ...handlers) =>
    router.use(path, handlers);

  // --------------------------
  // STATIC WEB SUPPORT
  // --------------------------

  server.static = (folder) => {
    staticFolder = path.resolve(folder);
  };

  return server;
}

/**
 * Parse request body
 */
async function parseBody(req) {
  return new Promise((resolve) => {
    const chunks = [];

    req.on('data', chunk => chunks.push(chunk));

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();

      if (!raw) {
        return resolve({});
      }

      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('application/json')) {
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve({});
        }
      } else {
        resolve(raw);
      }
    });

    req.on('error', () => resolve({}));
  });
}

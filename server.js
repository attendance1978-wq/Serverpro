import http from 'http';
import os from 'os';
import crypto from 'crypto';
import { Router } from './router.js';

export function createServer(options = {}) {

  const router = new Router();

  const middlewares = [];

  const server = http.createServer(async (req, res) => {

    // --------------------------------------------------
    // REQUEST META
    // --------------------------------------------------

    req.id = crypto.randomUUID();
    req.time = Date.now();
    req.ip =
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress;

    // --------------------------------------------------
    // RESPONSE HELPERS
    // --------------------------------------------------

    res.status = (code) => {
      res.statusCode = code;
      return res;
    };

    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data, null, 2));
    };

    res.send = (data) => {
      if (typeof data === 'object') {
        return res.json(data);
      }

      res.setHeader('Content-Type', 'text/plain');
      res.end(String(data));
    };

    res.html = (html) => {
      res.setHeader('Content-Type', 'text/html');
      res.end(html);
    };

    res.redirect = (url, code = 302) => {
      res.writeHead(code, {
        Location: url
      });
      res.end();
    };

    res.error = (message = 'Server Error', code = 500) => {
      res.status(code).json({
        success: false,
        error: message
      });
    };

    // --------------------------------------------------
    // REQUEST BODY
    // --------------------------------------------------

    req.body = await parseBody(req);

    const url = new URL(req.url, `http://${req.headers.host}`);

    req.query = Object.fromEntries(url.searchParams);
    req.pathname = url.pathname;

    // --------------------------------------------------
    // LOGGER
    // --------------------------------------------------

    console.log(
      `[${req.method}] ${req.pathname}`
    );

    // --------------------------------------------------
    // MIDDLEWARE ENGINE
    // --------------------------------------------------

    let index = 0;

    const next = async () => {
      const middleware = middlewares[index++];

      if (middleware) {
        await middleware(req, res, next);
      }
    };

    await next();

    // --------------------------------------------------
    // ROUTER
    // --------------------------------------------------

    try {

      const handled = await router.handle(req, res);

      if (!handled) {
        res.status(404).json({
          success: false,
          error: 'Route Not Found'
        });
      }

    } catch (err) {

      console.error(err);

      if (options.onError) {
        options.onError(err, req, res);
      } else {
        res.error(err.message);
      }

    }

  });

  // --------------------------------------------------
  // SERVER METHODS
  // --------------------------------------------------

  server.router = router;

  server.use = (middleware) => {
    middlewares.push(middleware);
  };

  server.get = (path, ...handlers) => {
    router.add('GET', path, handlers);
  };

  server.post = (path, ...handlers) => {
    router.add('POST', path, handlers);
  };

  server.put = (path, ...handlers) => {
    router.add('PUT', path, handlers);
  };

  server.patch = (path, ...handlers) => {
    router.add('PATCH', path, handlers);
  };

  server.delete = (path, ...handlers) => {
    router.add('DELETE', path, handlers);
  };

  // --------------------------------------------------
  // SERVER INFO
  // --------------------------------------------------

  server.info = () => ({
    platform: os.platform(),
    cpus: os.cpus().length,
    memory: Math.round(os.totalmem() / 1024 / 1024),
    uptime: process.uptime()
  });

  // --------------------------------------------------
  // START SERVER
  // --------------------------------------------------

  const originalListen = server.listen.bind(server);

  server.listen = (port, cb) => {

    return originalListen(port, () => {

      console.log('');
      console.log('🚀 CForge Server Started');
      console.log('');

      console.log(`Local: http://localhost:${port}`);

      const interfaces = os.networkInterfaces();

      for (const iface of Object.values(interfaces)) {

        for (const config of iface || []) {

          if (
            config.family === 'IPv4' &&
            !config.internal
          ) {
            console.log(
              `Network: http://${config.address}:${port}`
            );
          }

        }

      }

      console.log('');

      if (cb) cb();

    });

  };

  return server;
}

// --------------------------------------------------
// BODY PARSER
// --------------------------------------------------

async function parseBody(req) {

  return new Promise((resolve) => {

    const chunks = [];

    req.on('data', chunk => {
      chunks.push(chunk);
    });

    req.on('end', () => {

      const raw = Buffer
        .concat(chunks)
        .toString();

      if (!raw) {
        return resolve({});
      }

      const type =
        req.headers['content-type'] || '';

      try {

        if (type.includes('application/json')) {
          return resolve(JSON.parse(raw));
        }

        resolve(raw);

      } catch {

        resolve({});

      }

    });

    req.on('error', () => {
      resolve({});
    });

  });

}

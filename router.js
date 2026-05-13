export class Router {

  constructor() {
    this.routes = [];
    this.middleware = [];
    this.errorMiddleware = [];
  }

  // --------------------------------------------------
  // REGISTER ROUTE
  // --------------------------------------------------

  add(method, path, handlers = [], options = {}) {

    this.routes.push({
      method: method.toUpperCase(),
      path,
      pattern: compilePath(path),
      handlers,
      name: options.name || null
    });

    return this;
  }

  // --------------------------------------------------
  // GLOBAL/PREFIX MIDDLEWARE
  // --------------------------------------------------

  use(pathOrHandler, handlers = []) {

    // app.use(fn)

    if (typeof pathOrHandler === 'function') {

      this.middleware.push({
        prefix: '/',
        handler: pathOrHandler
      });

      return this;
    }

    // app.use('/api', fn)

    for (const handler of handlers) {

      this.middleware.push({
        prefix: pathOrHandler,
        handler
      });

    }

    return this;
  }

  // --------------------------------------------------
  // ERROR MIDDLEWARE
  // --------------------------------------------------

  useError(handler) {

    this.errorMiddleware.push(handler);

    return this;
  }

  // --------------------------------------------------
  // GROUP ROUTES
  // --------------------------------------------------

  group(prefix, callback) {

    const groupRouter = {

      get: (path, ...handlers) =>
        this.add('GET', prefix + path, handlers),

      post: (path, ...handlers) =>
        this.add('POST', prefix + path, handlers),

      put: (path, ...handlers) =>
        this.add('PUT', prefix + path, handlers),

      patch: (path, ...handlers) =>
        this.add('PATCH', prefix + path, handlers),

      delete: (path, ...handlers) =>
        this.add('DELETE', prefix + path, handlers),

      all: (path, ...handlers) =>
        this.add('ALL', prefix + path, handlers)

    };

    callback(groupRouter);

    return this;
  }

  // --------------------------------------------------
  // HANDLE REQUEST
  // --------------------------------------------------

  async handle(req, res) {

    try {

      // ----------------------------------------------
      // RUN MIDDLEWARE
      // ----------------------------------------------

      for (const mw of this.middleware) {

        if (!req.pathname.startsWith(mw.prefix)) {
          continue;
        }

        const stop = await runHandler(
          mw.handler,
          req,
          res
        );

        if (stop) {
          return true;
        }

      }

      // ----------------------------------------------
      // FIND ROUTE
      // ----------------------------------------------

      let pathExists = false;

      for (const route of this.routes) {

        const match = route.pattern.exec(
          req.pathname
        );

        if (!match) {
          continue;
        }

        pathExists = true;

        // Method mismatch

        if (
          route.method !== req.method &&
          route.method !== 'ALL'
        ) {
          continue;
        }

        // Route params

        req.params = match.groups || {};

        // Route metadata

        req.route = {
          path: route.path,
          name: route.name,
          method: route.method
        };

        // ------------------------------------------
        // RUN HANDLERS
        // ------------------------------------------

        for (const handler of route.handlers) {

          const stop = await runHandler(
            handler,
            req,
            res
          );

          if (stop) {
            return true;
          }

        }

        return true;

      }

      // ----------------------------------------------
      // 405 METHOD NOT ALLOWED
      // ----------------------------------------------

      if (pathExists) {

        res.statusCode = 405;

        res.end('Method Not Allowed');

        return true;
      }

      return false;

    } catch (err) {

      // ----------------------------------------------
      // ERROR HANDLER
      // ----------------------------------------------

      for (const handler of this.errorMiddleware) {

        await handler(err, req, res);

      }

      throw err;

    }

  }

}

// --------------------------------------------------
// PATH COMPILER
// --------------------------------------------------

function compilePath(path) {

  const pattern = path

    // Escape slashes
    .replace(/\//g, '\\/')

    // Params
    .replace(
      /:([a-zA-Z_][a-zA-Z0-9_]*)/g,
      '(?<$1>[^\\/]+)'
    )

    // Wildcards
    .replace(/\*/g, '.*');

  return new RegExp(`^${pattern}$`);

}

// --------------------------------------------------
// RUN HANDLER
// --------------------------------------------------

function runHandler(handler, req, res) {

  return new Promise((resolve, reject) => {

    let nextCalled = false;

    const next = () => {

      nextCalled = true;

      resolve(false);

    };

    try {

      const result = handler(req, res, next);

      // Async handler

      if (
        result &&
        typeof result.then === 'function'
      ) {

        result
          .then(() => {

            if (!nextCalled) {
              resolve(true);
            }

          })
          .catch(reject);

      } else {

        if (!nextCalled) {
          resolve(true);
        }

      }

    } catch (err) {

      reject(err);

    }

  });

}

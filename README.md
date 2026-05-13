# @serverpro/core

A lightweight, zero-dependency Node.js HTTP server package with built-in routing, middleware support, and response helpers.

## Requirements

- Node.js >= 18.0.0

## Usage

```js
import { createServer } from '@server/server';

const app = createServer();

// Middleware
app.use('/', (req, res, next) => {
  console.log(`${req.method} ${req.pathname}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.get('/users/:id', (req, res) => {
  res.json({ userId: req.params.id });
});

app.post('/data', (req, res) => {
  res.json({ received: req.body });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

## API

### `createServer(options?)`

Creates and returns an HTTP server instance.

| Option     | Type       | Description                     |
|------------|------------|---------------------------------|
| `onError`  | `function` | Custom error handler `(err, req, res)` |

### Route Methods

| Method             | Description             |
|--------------------|-------------------------|
| `app.get(path, ...handlers)`    | Register GET route     |
| `app.post(path, ...handlers)`   | Register POST route    |
| `app.put(path, ...handlers)`    | Register PUT route     |
| `app.delete(path, ...handlers)` | Register DELETE route  |
| `app.use(path, ...handlers)`    | Register middleware    |

### Path Parameters

Use `:name` syntax in paths:

```js
app.get('/users/:id/posts/:postId', (req, res) => {
  const { id, postId } = req.params;
  res.json({ id, postId });
});
```

### Request Helpers

| Property      | Description                        |
|---------------|------------------------------------|
| `req.params`  | URL path parameters                |
| `req.query`   | Query string as object             |
| `req.body`    | Parsed JSON body (or raw string)   |
| `req.pathname`| URL path without query string      |

### Response Helpers

| Method              | Description                          |
|---------------------|--------------------------------------|
| `res.json(data, status?)` | Send JSON response            |
| `res.send(text, status?)` | Send plain text response      |
| `res.html(html, status?)` | Send HTML response            |

## Running the Example

```bash
node src/example.js
```

## License

MIT

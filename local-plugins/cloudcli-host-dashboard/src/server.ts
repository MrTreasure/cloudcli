import http from 'node:http';

import { readResourceSnapshot } from './metrics.js';

const server = http.createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  // The host RPC preserves transport query parameters; route on the pathname.
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
  if (request.method !== 'GET' || pathname !== '/metrics') {
    response.writeHead(404);
    response.end(JSON.stringify({ error: 'Not found' }));
    return;
  }
  try {
    response.end(JSON.stringify(readResourceSnapshot()));
  } catch {
    response.writeHead(503);
    response.end(JSON.stringify({ error: 'Host metrics are unavailable' }));
  }
});

server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  if (address && typeof address !== 'string') {
    console.log(JSON.stringify({ ready: true, port: address.port }));
  }
});

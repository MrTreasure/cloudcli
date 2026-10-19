import http from 'node:http';

import { readResourceSnapshot } from './metrics.js';

const server = http.createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET' || request.url !== '/metrics') {
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

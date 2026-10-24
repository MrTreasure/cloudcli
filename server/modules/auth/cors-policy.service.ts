import type { CorsOptions } from 'cors';

/** Used by the HTTP entrypoint to cache only legal-origin preflights, never API responses. */
export function createCorsPolicy(frontendOrigin: string | undefined): CorsOptions {
  return {
    origin: frontendOrigin ? (origin, callback) => callback(null, origin === frontendOrigin) : false,
    maxAge: 600,
    exposedHeaders: ['X-Refreshed-Token', 'X-Auth-Error'],
  };
}

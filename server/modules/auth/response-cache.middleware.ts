import type { RequestHandler } from 'express';

/** Used by the HTTP entrypoint before API parsing/auth so successes and errors cannot be cached. */
export const preventApiResponseCaching: RequestHandler = (_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
};

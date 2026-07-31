import { timingSafeEqual } from 'node:crypto';
import {
  ApiRequest,
  ApiResponse,
  createSessionCookie,
  isAuthorized,
  readJsonBody,
  sendError,
  sendJson,
} from '../src/server/apiUtils';

const passwordsMatch = (provided: string, expected: string) => {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method === 'GET') {
      sendJson(response, 200, { authenticated: isAuthorized(request) });
      return;
    }

    if (request.method !== 'POST') {
      response.setHeader('Allow', 'GET, POST');
      sendJson(response, 405, { error: 'Method not allowed.' });
      return;
    }

    const expectedPassword = process.env.APP_ACCESS_PASSWORD;
    if (!expectedPassword) throw new Error('Missing APP_ACCESS_PASSWORD.');

    const { password } = await readJsonBody<{ password?: string }>(request);
    if (!password || !passwordsMatch(password, expectedPassword)) {
      sendJson(response, 401, { error: 'Nesprávne heslo' });
      return;
    }

    response.setHeader('Set-Cookie', createSessionCookie());
    sendJson(response, 200, { authenticated: true });
  } catch (error) {
    sendError(response, error);
  }
}

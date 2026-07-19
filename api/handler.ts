/**
 * Vercel serverless entry point for the API server.
 * Vercel's @vercel/node builder picks up this file automatically,
 * bundles it with esbuild, and serves it at /api/*.
 *
 * The Express app is defined in artifacts/api-server/src/app.ts and
 * exported without calling app.listen() — perfect for serverless use.
 */
import app from '../artifacts/api-server/src/app';

export default app;

/**
 * Vercel serverless entry point.
 *
 * The api-server is compiled by its own esbuild step (pnpm --filter
 * @workspace/api-server run build) which produces dist/app.mjs — a
 * self-contained ESM bundle of the Express app without app.listen().
 *
 * Using a pre-compiled JS file means Vercel never needs to type-check
 * or resolve TypeScript across the monorepo boundary.
 */
import app from '../artifacts/api-server/dist/app.mjs';

export default app;

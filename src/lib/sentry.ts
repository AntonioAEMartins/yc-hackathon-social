import * as Sentry from "@sentry/node";

declare global {
  var __sentryInitialized: boolean | undefined;
}

// Initialize Sentry only once in the server runtime (works with hot-reload)
if (!global.__sentryInitialized) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENV || process.env.NODE_ENV || "local",
    release: process.env.SENTRY_RELEASE || "test-sentry-api@0.1.0",
    tracesSampleRate: 0,
  });
  global.__sentryInitialized = true;
}

export { Sentry };



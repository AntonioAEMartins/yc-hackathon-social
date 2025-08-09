"use client";

import { hc } from "hono/client";
import type { AppType } from "@/server";

// Centralized Hono RPC client. Use this from client components to call the API.
// The Next.js route is mounted at `/api`, and our Hono app also uses a basePath of `/api`,
// so we point the client to `/api`.
// Use root base here so the typed client exposes `client.api.friends` paths.
// The generated requests will still hit `/api/*` because the route tree includes that segment.
export const client = hc<AppType>("/");

export type HonoClient = typeof client;



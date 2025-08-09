import z from "zod";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { prisma } from "@/lib/prisma";
import type { Scope as SentryScope } from "@sentry/node";

// Helper to extract relative file path and line/column from an Error stack
function extractSourceFromStack(
  stack: string | undefined,
  preferPattern?: RegExp
): { absolutePath: string; relativePath: string; line: number; column: number } | null {
  if (!stack) return null;
  const stackLines = stack.split("\n").slice(1);
  const cwd = process.cwd();
  const candidateLines = preferPattern
    ? stackLines.filter((l) => preferPattern.test(l))
    : stackLines;
  for (const line of candidateLines) {
    // Matches both "at func (path:line:col)" and "at path:line:col"
    const match = line.match(/\(?([^()\s]+?):(\d+):(\d+)\)?/);
    if (match) {
      const absolutePathRaw = match[1];
      const absolutePath = absolutePathRaw.replace(/^file:\/\//, "");
      const lineNum = Number(match[2]);
      const colNum = Number(match[3]);
      const normalized = absolutePath.replace(/\\/g, "/");
      const srcIdx = normalized.indexOf("/src/");
      const relativePath = srcIdx !== -1
        ? normalized.slice(srcIdx + 1)
        : absolutePath.startsWith(cwd)
          ? absolutePath.slice(cwd.length + 1)
          : normalized;
      return { absolutePath, relativePath, line: lineNum, column: colNum };
    }
  }
  return null;
}

// Schemas
const FriendSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Ada Lovelace" }),
  title: z.string().nullable().openapi({ example: "Engineer" }),
  phoneNumber: z.string().nullable().openapi({ example: "+1 555-1234" }),
  email: z.string().email().openapi({ example: "ada@example.com" }),
  xUsername: z.string().nullable().openapi({ example: "@ada" }),
  instagramUsername: z.string().nullable().openapi({ example: "@ada.ig" }),
});

const FriendCreateSchema = z.object({
  name: z.string().min(1),
  title: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  email: z.string().email(),
  xUsername: z.string().nullable().optional(),
  instagramUsername: z.string().nullable().optional(),
});

type FriendInput = z.infer<typeof FriendCreateSchema>;

const FriendUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    title: z.string().nullable().optional(),
    phoneNumber: z.string().nullable().optional(),
    email: z.string().email().optional(),
    xUsername: z.string().nullable().optional(),
    instagramUsername: z.string().nullable().optional(),
  })
  .refine((data: Record<string, unknown>) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// OpenAPI routes
const ListFriendsRoute = createRoute({
  method: "get",
  path: "/friends",
  summary: "List Friends",
  tags: ["Friends"],
  responses: {
    200: {
      description: "Friends list",
      content: {
        "application/json": {
          schema: z.array(FriendSchema),
        },
      },
    },
  },
});

const GetFriendRoute = createRoute({
  method: "get",
  path: "/friends/{id}",
  summary: "Get Friend",
  tags: ["Friends"],
  request: {
    params: z.object({
      id: z.coerce.number().int().positive().openapi({ example: 1 }),
    }),
  },
  responses: {
    200: {
      description: "Friend",
      content: {
        "application/json": {
          schema: FriendSchema,
        },
      },
    },
    404: {
      description: "Not Found",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
  },
});

const CreateFriendRoute = createRoute({
  method: "post",
  path: "/friends",
  summary: "Create Friend",
  tags: ["Friends"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: FriendCreateSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Created",
      content: {
        "application/json": {
          schema: FriendSchema,
        },
      },
    },
  },
});

const UpdateFriendRoute = createRoute({
  method: "put",
  path: "/friends/{id}",
  summary: "Update Friend",
  tags: ["Friends"],
  request: {
    params: z.object({
      id: z.coerce.number().int().positive().openapi({ example: 1 }),
    }),
    body: {
      required: true,
      content: {
        "application/json": {
          schema: FriendUpdateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated",
      content: {
        "application/json": {
          schema: FriendSchema,
        },
      },
    },
    404: {
      description: "Not Found",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
  },
});

const DeleteFriendRoute = createRoute({
  method: "delete",
  path: "/friends/{id}",
  summary: "Delete Friend",
  tags: ["Friends"],
  request: {
    params: z.object({
      id: z.coerce.number().int().positive().openapi({ example: 1 }),
    }),
  },
  responses: {
    204: {
      description: "Deleted",
    },
    404: {
      description: "Not Found",
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
    },
  },
});

export const friendsRouter = new OpenAPIHono()
  .openapi(ListFriendsRoute, async (c) => {
    const friends = await prisma.friend.findMany();
    return c.json(friends, 200);
  })
  .openapi(GetFriendRoute, async (c) => {
    const { id } = c.req.valid("param");
    const friend = await prisma.friend.findUnique({ where: { id } });
    if (!friend) {
      return c.json({ message: "Friend not found" }, 404);
    }
    return c.json(friend, 200);
  })
  .openapi(CreateFriendRoute, async (c) => {
    const body = c.req.valid("json") as FriendInput;

    // Optional Sentry test flow is only triggered when sentryTest=true|1 is provided
    const sentryTest =
      c.req.query("sentryTest") === "1" || c.req.query("sentryTest") === "true";

    if (sentryTest) {
      // Send alert to Sentry prior to throwing — with richer context for debugging
      const { Sentry } = await import("@/lib/sentry");

      const sameIssue =
        c.req.query("sameIssue") === "1" || c.req.query("sameIssue") === "true";
      const fingerprintPrefix = c.req.query("fingerprintPrefix") || "test-alert";
      const uniquePart = sameIssue ? "static" : crypto.randomUUID();
      const message =
        c.req.query("message") || "Test alert from friends.routes.ts (pre-throw)";

      // Build error we'll capture and then throw (keeps file hint for workflow)
      const err = new Error("Intentional test error in src/server/friends.routes.ts");
      const source = extractSourceFromStack(err.stack, /friends\.routes\.(t|j)s/);

      Sentry.withScope((scope: SentryScope) => {
        scope.setLevel("error");
        scope.setTag("area", "friends.create");
        scope.setTag("endpoint", "POST /friends");
        scope.setTag("sentry_env", process.env.SENTRY_ENV || "local");
        scope.setTag("app_version", process.env.APP_VERSION || "dev");
        scope.setTag("runtime", `node-${process.version}`);
        scope.setFingerprint([String(fingerprintPrefix), String(uniquePart)]);
        if (source) {
          scope.setTag("source_file", source.relativePath);
          scope.setTag("source_line", String(source.line));
          scope.setTag("source_column", String(source.column));
          scope.setContext("source_frame", source);
        }

        // Rich context
        scope.setUser({
          email: body?.email ?? "unknown@local",
          username: body?.name ?? "unknown",
        });
        scope.setContext("request", {
          method: c.req.method,
          url: c.req.url,
          query: {
            sameIssue: c.req.query("sameIssue"),
            fingerprintPrefix: c.req.query("fingerprintPrefix"),
            message: c.req.query("message"),
          },
          headers: {
            "user-agent": c.req.header("user-agent") || "",
            "x-request-id": c.req.header("x-request-id") || "",
            "x-forwarded-for": c.req.header("x-forwarded-for") || "",
          },
        });
        scope.setContext("friend_input", {
          name: body?.name,
          title: body?.title ?? null,
          phoneNumber: body?.phoneNumber ?? null,
          email: body?.email,
          xUsername: body?.xUsername ?? null,
          instagramUsername: body?.instagramUsername ?? null,
        });
        scope.addBreadcrumb({
          category: "action",
          message: "Creating friend",
          level: "info",
          data: { hasPayload: !!body, email: body?.email },
        });
        scope.addBreadcrumb({
          category: "db",
          message: "About to call prisma.friend.create",
          level: "debug",
        });

        // Capture both message and exception (for stack + file hint)
        Sentry.captureMessage(String(message), "error");
        Sentry.captureException(err);
      });

      // Give Sentry time to send
      try {
        const { Sentry } = await import("@/lib/sentry");
        await Sentry.flush(2000);
      } catch {}

      throw err;
    }

    // Normal flow: create the friend
    const created = await prisma.friend.create({ data: body });
    return c.json(created, 201);
  })
  .openapi(UpdateFriendRoute, async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const existing = await prisma.friend.findUnique({ where: { id } });
    if (!existing) {
      return c.json({ message: "Friend not found" }, 404);
    }
    const updated = await prisma.friend.update({ where: { id }, data });
    return c.json(updated, 200);
  })
  .openapi(DeleteFriendRoute, async (c) => {
    const { id } = c.req.valid("param");
    const existing = await prisma.friend.findUnique({ where: { id } });
    if (!existing) {
      return c.json({ message: "Friend not found" }, 404);
    }
    await prisma.friend.delete({ where: { id } });
    return c.body(null, 204);
  });

export type FriendsRouterType = typeof friendsRouter;
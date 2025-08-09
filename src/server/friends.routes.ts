import z from "zod";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { prisma } from "@/lib/prisma";

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

const FriendUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    title: z.string().nullable().optional(),
    phoneNumber: z.string().nullable().optional(),
    email: z.string().email().optional(),
    xUsername: z.string().nullable().optional(),
    instagramUsername: z.string().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
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
    const body = c.req.valid("json");
    const created = await prisma.friend.create({
      data: body,
    });
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



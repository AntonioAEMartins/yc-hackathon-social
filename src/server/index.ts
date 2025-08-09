import z, { ZodError } from "zod";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";

const HelloWorldRoute = createRoute({
  method: "get",
  path: "/",
  // middleware: [requireAuthentication] as const,
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
      description: "Success",
    },
  },
  summary: "List Friends",
  tags: ["Friends"],
});

const app = new OpenAPIHono()
  .basePath("/api")
  .openapi(HelloWorldRoute, async (ctx) => {
    return ctx.json({ message: "Hello, world!" }, 200);
  })
  .doc("/spec", {
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "Hono Starter Kit",
    },
    tags: [],
  })
  .get("/", Scalar({ url: "/api/spec" }))
  .onError((err, c) => {
    if (err instanceof ZodError) {
      return c.json(
        {
          code: 400,
          errorCode: "VALIDATION_ERROR",
          message: "Validation Error",
          errors: [],
        },
        400
      );
    }

    console.error(err);
    return c.json(
      {
        code: 500,
        errorCode: "INTERNAL_SERVER_ERROR",
        message: "Internal Server Error",
      },
      500
    );
  });

export type AppType = typeof app;

export { app };

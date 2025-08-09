import { ZodError } from "zod";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { friendsRouter } from "./friends.routes";
import "@/lib/sentry";


const app = new OpenAPIHono()
  .basePath("/api")
  .route("/", friendsRouter)
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

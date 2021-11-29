import { Express } from "express";
import cors from "cors";
import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";
import app from "@/app";
import fileRouter from "@/routers/fileRouter";

class StorageApi {
  private static get port(): string {
    return process.env.PORT || "3000";
  }

  private static get sentryIsEnabled(): boolean {
    return !!process.env.SENTRY_DSN && !!process.env.SENTRY_ENVIRONMENT;
  }

  private async startApiServer(app: Express) {
    if (StorageApi.sentryIsEnabled) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Tracing.Integrations.Express({ app }),
        ],
        tracesSampleRate: 1.0,
        environment: process.env.SENTRY_ENVIRONMENT,
      });

      app.use(Sentry.Handlers.requestHandler());
      app.use(Sentry.Handlers.tracingHandler());
    }

    app.use(cors());

    app.use("/api/files", fileRouter);

    if (StorageApi.sentryIsEnabled) {
      app.use(Sentry.Handlers.errorHandler());
    }

    app.listen(StorageApi.port, () => {
      console.log(`Server listening on ${StorageApi.port}`);
    });
  }

  constructor(app: Express) {
    this.startApiServer(app);
  }
}

new StorageApi(app);

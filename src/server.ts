import { Server as HttpServer } from "http";
import { Express } from "express";
import cors from "cors";
import app from "@/app";
import fileRouter from "@/routers/fileRouter";

class StorageApi {
  private static get port(): string {
    return process.env.PORT || "3000";
  }

  private async startApiServer(app: Express) {
    app.use(cors());

    app.use("/api/files", fileRouter);

    const server = app.listen(StorageApi.port, () => {
      console.log(`Server listening on ${StorageApi.port}`);
    });

    process.on("SIGTERM", () => this.shutdownApiServer(server));
    process.on("SIGINT", () => this.shutdownApiServer(server));
  }

  private async shutdownApiServer(server: HttpServer) {
    server.close(() => {
      console.log("Server has gracefully shut down");
    });
  }

  constructor(app: Express) {
    this.startApiServer(app);
  }
}

new StorageApi(app);

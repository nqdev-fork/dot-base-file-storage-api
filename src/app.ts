import express from "express";
import fileRouter from "@/routers/fileRouter";

const app = express();
app.use("/api/files", fileRouter);

export default app;

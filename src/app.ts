import express from "express";
import cors from "cors";
import fileRouter from "@/routers/fileRouter";

const app = express();
app.use(cors());
app.use("/api/files", fileRouter);

export default app;

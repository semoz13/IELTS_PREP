import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { connectDB } from "@/config/db";
import { env } from "@/config/env";
import { errorHandler } from "@/middleware/error.middleware";
import routing from "@/routes/routing";
import mongoose from "mongoose";

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: env.clientUrl }));
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ─── Routes ───────────────────────────────────────────────────
app.use("/api", routing);

// ─── Health Check ─────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "API is running" });
});


/*app.get("/test-db", async (_req, res) => {
  try {
    const nativeDb = mongoose.connection.getClient().db();
    const result = await nativeDb.collection("test").insertOne({
      message: "MongoDB works!",
      createdAt: new Date(),
    });

    res.json({
      success: true,
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error,
    });
  }
});*/
// ─── Error Handler ────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────
const start = async (): Promise<void> => {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`🚀 Server running on http://localhost:${env.port}`);
  });
};

start();

import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "@/config/db";
import { env } from "@/config/env";
import { errorHandler } from "@/middleware/error.middleware";
import routing from "@/routes/routing";

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: env.clientUrl }));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────
app.use("/api", routing);

// ─── Health Check ─────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "API is running" });
});

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

import mongoose from "mongoose";
import { env } from "@/config/env";

export const connectDB = async (): Promise<void> => {
  try {
    console.log("URI:", process.env.MONGODB_URI);
    await mongoose.connect(env.mongoUri);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

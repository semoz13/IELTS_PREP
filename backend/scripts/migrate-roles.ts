import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/config/db";
import { env } from "../src/config/env";
import User from "../src/models/User";

const SUPER_ADMIN_EMAIL = "superadmin@example.com";
const SUPER_ADMIN_PASSWORD = "123456";

function log(msg: string): void {
  console.log(`[migrate] ${msg}`);
}

async function migrate(): Promise<void> {
  await connectDB();
  log(`Connected to ${env.mongoUri}`);

  // ── Step 1: "admin" → "teacher" ──
  const adminResult = await User.updateMany(
    { role: "admin" },
    { $set: { role: "teacher" } }
  );
  log(`Renamed admin → teacher: ${adminResult.modifiedCount}`);

  // ── Step 2: "user" → "student" ──
  const userResult = await User.updateMany(
    { role: "user" },
    { $set: { role: "student" } }
  );
  log(`Renamed user → student: ${userResult.modifiedCount}`);

  // ── Step 3: ensure super admin ──
  const existing = await User.findOne({ email: SUPER_ADMIN_EMAIL }).select("+password");

  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      await existing.save();
      log(`Upgraded existing user to admin`);
    } else {
      log(`Super admin already exists`);
    }
  } else {
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);

    await User.create({
      name: "Super",
      surName: "Admin",
      email: SUPER_ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
    });

    log(`Super admin created`);
  }

  await mongoose.disconnect();
  log("Migration complete");
}

migrate().catch((err) => {
  console.error("[migrate] Fatal error:", err);
  process.exit(1);
});
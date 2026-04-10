import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import { env } from "@/config/env";
import { StatusCodes } from "http-status-codes";

// ─── Helper: generate token ───────────────────────────────────
const generateToken = (userId: string, role: string): string => {
  return jwt.sign({ userId, role }, env.jwtAccessSecret, { expiresIn: "7d" });
};

// get current user info
const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById((req as any).user.userId);
    if (!user) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "User not found" });
      return;
    }
    res.status(StatusCodes.OK).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// ─── Register ─────────────────────────────────────────────────
const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, surName, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      res
        .status(StatusCodes.CONFLICT)
        .json({ success: false, message: "Email already in use" });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      surName,
      email,
      password: hashedPassword,
    });

    const token = generateToken(user._id.toString(), user.role);

    res.status(StatusCodes.CREATED).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        surName: user.surName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Login ────────────────────────────────────────────────────
const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ success: false, message: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ success: false, message: "Invalid credentials" });
      return;
    }

    const token = generateToken(user._id.toString(), user.role);

    res.status(StatusCodes.OK).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        surName: user.surName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Logout ───────────────────────────────────────────────────
const logout = (_req: Request, res: Response): void => {
  res
    .status(StatusCodes.NO_CONTENT)
    .json({ success: true, message: "Logged out successfully" });
};

export const authController = {
  register,
  login,
  logout,
  getMe,
};

import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import User from "@/models/User";

// ─── Get All Users ────────────────────────────────────────────
const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const users = await User.find();
    res.status(StatusCodes.OK).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// ─── Get User By Id ───────────────────────────────────────────
const getById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "User not found" });
      return;
    }
    res.status(StatusCodes.OK).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ─── Create User ──────────────────────────────────────────────
const create = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.create(req.body);
    res.status(StatusCodes.CREATED).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ─── Update User ──────────────────────────────────────────────
const update = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!user) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "User not found" });
      return;
    }
    res.status(StatusCodes.OK).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ─── Delete User ──────────────────────────────────────────────
const remove = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "User not found" });
      return;
    }
    res
      .status(StatusCodes.OK)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const userController = {
  getAll,
  getById,
  create,
  update,
  remove,
};

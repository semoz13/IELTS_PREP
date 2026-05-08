import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import User from "@/models/User";
import { request } from "http";
import { error } from "console";

// get teachers 
const getTeachers = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const teachers = await User.find({ role: "teacher" }).select("-__v");
        res.status(StatusCodes.OK).json({
            success: true,
            count: teachers.length,
            data: teachers,
        });
    } catch (error) {
        next(error);
    }
};

// create teacher 
const createTeacher = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { name, surName, email, password, avatar, bio } = req.body;

        const existing = await User.findOne({ email });
        if (existing){
            res 
                .status(StatusCodes.CONFLICT)
                .json({ success: false, message: "Email already exists" });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const teacher = await User.create({
            name,
            surName,
            email,
            password: hashedPassword,
            role: "teacher",
            avatar: avatar ?? "",
            bio: bio ?? "",
        });

        res.status(StatusCodes.CREATED).json({
            success: true,
            data: {
                id: teacher._id,
                name: teacher.name,
                surName: teacher.surName,
                email: teacher.email,
                role: teacher.role,
            },
        });
    } catch (error) {
        next(error);
    }
};

// delete teacher
const deleteTeacher = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const teacher = await User.findOneAndDelete({
            _id: req.params.id, 
            role: "teacher" 
        });

        if (!teacher) {
            res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Teacher not found or already deleted",
            });
            return;
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Teacher deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

// get students 
const getStudents = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const students = await User.find({ role: "student" }).select("-__v");
        res.status(StatusCodes.OK).json({
            success: true,
            count: students.length,
            data: students,
        });
    } catch (error) {
        next(error);
    }
};

// create student 

const createStudent = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try{
        const { name, surName, email, password, avatar, bio } = req.body;

        const existing = await User.findOne({ email });
        if (existing){
            res 
                .status(StatusCodes.CONFLICT)
                .json({ success: false, message: "Email already exists" });
            return;
        }
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const student = await User.create({
            name,
            surName,
            email,
            password: hashedPassword,
            role: "student",
            avatar: avatar ?? "",
            bio: bio ?? "",
        });

        res.status(StatusCodes.CREATED).json({
            sucess: true,
            data: {
                id: student._id,
                name: student.name,
                surName: student.surName,
                email: student.email,
                role: student.role,
            },
        });
    } catch (error){ 
        next(error);
    }
};


// delete student 
const deleteStudent = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const student = await User.findOneAndDelete({
            _id: req.params.id,
            role: "student",
        });

        if (!student) {
            res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Student Not Found",
            });
            return;
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Student deleted Successfully",
        });
    } catch (error){
        next(error);
    }
};

// get admin stats 
const getStats = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const [teacherCount, studentCount, adminCount] = await Promise.all([
            User.countDocuments({ role: "teacher" }),
            User.countDocuments({ role: "teacher" }),
            User.countDocuments({ role: "admin"   }),
        ]);

        res.status(StatusCodes.OK).json({
            success: true,
            data: {
                students : studentCount,
                teacher: teacherCount,
                admins: adminCount,
                total: studentCount + teacherCount + adminCount,
            },
        });
    } catch (error) {
        next(error)
    }
};

export const adminController = {
    getTeachers,
    createTeacher,
    deleteTeacher,
    getStudents,
    createStudent,
    deleteStudent,
    getStats,
};
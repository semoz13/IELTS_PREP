import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";


// ─── Ensure directory exists once at module load ──────────────
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "speaking");
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Disk storage
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || ".webm";
        const unique = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}${ext}`;

        cb(null, unique);
    }
});

// accept only audio MIME types 
const audioFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
): void => {
    const allowed = new Set ([
        "audio/webm",
        "audio/ogg",
        "audio/mpeg",
        "audio/mp4",
        "audio/wav",
        "audio/x-wav",
        "audio/aac",
        "audio/x-m4a"
    ]);

    if (allowed.has(file.mimetype)) { 
        cb(null, true);
    } else {
        cb(new Error(`Unsupported audio format: ${file.mimetype}. Allowed: webm, ogg, mp3, mp4, wav, aac, m4a`));
    }
};

// ─── 25 MB ceiling — IELTS Speaking Part 2 is at most 2 min ──
export const uploadAudio = multer ({
    storage,
    fileFilter: audioFilter,
    limits: { fileSize: 25 * 1024 * 1024 },
}).single("audio");   //filed name the client must use 

//build the public URL served by express.static
export const buildAudioUrl = (filename: string): string => 
    `uploads/speaking/${filename}`;


//delete a file from disk silently (used on re-record)
export const deleteAudioFile = (audioUrl: string): void => {
    try {
        const filePath = path.join(process.cwd(), audioUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
        //non fatal - log and move on 
        console.warn(`[upload] could not delete old audio file: ${audioUrl}`);
    }
}
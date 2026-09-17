import multer from "multer"
import path from "node:path"
import fs from "node:fs"

// Ensure temporary uploads directory exists for disk storage if used
const uploadDir = path.join(process.cwd(), "uploads")
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

// Memory storage configuration (ideal for buffer processing, Cloudinary, PDF RAG & Image Analysis)
const storage = multer.memoryStorage()

// Disk storage configuration (alternative for persisting files locally)
const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
        const ext = path.extname(file.originalname)
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`)
    }
})

// File filter for allowed file types (PDFs, Images, Documents)
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png"
    ]

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(new Error(`Unsupported file type: ${file.mimetype} .only PDF and images are allowed`), false)
    }
}

// Multer instances
export const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB limit
    },
    fileFilter
})

export const diskUpload = multer({
    storage: diskStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB limit
    },
    fileFilter
})

export default upload

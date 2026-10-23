/**
 * Storage utility for handling item image uploads.
 * Supports persistent Cloudinary storage (recommended for production/Vercel)
 * with graceful local disk storage for local development, and data URI fallback.
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Cloudinary configuration (if environment variables exist)
let cloudinary = null;
if (process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_URL) {
    try {
        cloudinary = require('cloudinary').v2;
        if (process.env.CLOUDINARY_CLOUD_NAME) {
            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET,
                secure: true
            });
        }
    } catch (err) {
        console.warn('Cloudinary initialization skipped:', err.message);
    }
}

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Multer memory storage preserves file buffer for either cloud upload or local saving
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    if (ALLOWED_MIME_TYPES.includes(mime) || ALLOWED_EXTENSIONS.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and WebP are allowed.'));
    }
}

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE
    },
    fileFilter
});

/**
 * Persist an uploaded image buffer.
 * Priority:
 * 1. Cloudinary (if credentials exist)
 * 2. Local uploads directory (if writable filesystem)
 * 3. Base64 Data URI fallback (for serverless environments without cloud config)
 */
async function saveUploadedImage(file) {
    if (!file || !file.buffer) return null;

    // 1. Cloudinary upload if configured
    if (cloudinary && (process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_URL)) {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'circlo_items',
                    resource_type: 'image'
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        // Fall back to local or data URI if cloud upload fails
                        resolve(fallbackSave(file));
                    } else {
                        resolve(result.secure_url);
                    }
                }
            );
            uploadStream.end(file.buffer);
        });
    }

    return fallbackSave(file);
}

function fallbackSave(file) {
    const uploadsDir = path.join(__dirname, 'uploads');

    try {
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        const uniqueName = `item_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
        const filePath = path.join(uploadsDir, uniqueName);

        fs.writeFileSync(filePath, file.buffer);
        return `/uploads/${uniqueName}`;
    } catch (err) {
        // In read-only serverless environment without cloud storage, persist as safe data URI
        console.warn('Local disk write failed, falling back to Data URI:', err.message);
        const mime = file.mimetype || 'image/png';
        return `data:${mime};base64,${file.buffer.toString('base64')}`;
    }
}

module.exports = {
    upload,
    saveUploadedImage,
    MAX_FILE_SIZE,
    ALLOWED_MIME_TYPES
};

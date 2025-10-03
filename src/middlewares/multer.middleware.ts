import multer from 'multer'

const storage = multer.memoryStorage()

const upload = multer({
  storage,
  limits: {
    // Max size for the uploaded file (e.g., the blog cover image)
    fileSize: 20 * 1024 * 1024, // 20MB max
    
    // CRITICAL FIX: Max size for non-file form fields (like 'description' or 'content').
    // This MUST be large enough to handle the massive Base64 strings.
    fieldSize: 100 * 1024 * 1024, // 100MB for the large content field
  },
})

export default upload

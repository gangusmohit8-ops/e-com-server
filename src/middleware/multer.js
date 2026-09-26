import multer from 'multer';

// Memory storage — files are kept in buffer (no disk writes)
const storage = multer.memoryStorage();

// File filter — only allow image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// Single profile image upload
export const uploadProfileImg = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('profileImg');

// Multiple product images upload (max 5)
export const uploadProductImgs = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB per file
}).array('productImgs', 5);

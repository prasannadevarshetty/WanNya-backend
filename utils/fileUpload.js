const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
console.log('🔧 Configuring Cloudinary...');
console.log('📋 Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'NOT SET');
console.log('🔑 API Key:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET');
console.log('🔐 API Secret:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Test Cloudinary connection
cloudinary.api.ping((error, result) => {
  if (error) {
    console.error('❌ Cloudinary connection failed:', error);
  } else {
    console.log('✅ Cloudinary connection successful:', result);
  }
});

// Ensure upload directories exist (Kept for backward compatibility)
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Configure storage for different file types using Cloudinary
const createStorage = (folder) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `wannya/${folder}`,
      allowed_formats: ['jpeg', 'jpg', 'png', 'webp', 'gif', 'pdf'],
    }
  });
};

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, WebP, and GIF images are allowed.'), false);
  }
};

// File filter for documents
const documentFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, JPG, and PNG files are allowed.'), false);
  }
};

// Generic upload middleware for multiple images
const uploadImages = (folder = 'images', maxCount = 5) => {
  return multer({
    storage: createStorage(folder),
    fileFilter: imageFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit per file
      files: maxCount
    }
  });
};

// Single image upload
const uploadSingleImage = (folder = 'images') => {
  return multer({
    storage: createStorage(folder),
    fileFilter: imageFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    }
  }).single('image');
};

// Single image upload with custom field name
const uploadSingleImageField = (folder = 'images', fieldName = 'image') => {
  return multer({
    storage: createStorage(folder),
    fileFilter: imageFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    }
  }).single(fieldName);
};

// Multiple images upload
const uploadMultipleImages = (folder = 'images', maxCount = 5) => {
  return multer({
    storage: createStorage(folder),
    fileFilter: imageFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit per file
      files: maxCount
    }
  }).array('images', maxCount);
};

// Document upload (for verification documents, certificates, etc.)
const uploadDocuments = (folder = 'documents', maxCount = 3) => {
  return multer({
    storage: createStorage(folder),
    fileFilter: documentFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit per file
      files: maxCount
    }
  }).array('documents', maxCount);
};

// Avatar upload (specific for user avatars)
const uploadAvatar = multer({
  storage: createStorage('avatars'),
  fileFilter: imageFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit for avatars
  }
}).single('avatar');

// Get file URL helper (Backwards compatibility function)
const getFileUrl = (filename, folder = 'images') => {
  if (!filename) return null;
  // If it's already a full URL (from Cloudinary or local endpoint), return it
  if (filename.startsWith('http')) return filename;
  
  const baseUrl = process.env.API_URL || 'http://127.0.0.1:5001';
  return `${baseUrl}/uploads/${folder}/${filename}`;
};

// Delete file helper
const deleteFile = async (identifier, folder = 'images') => {
  if (!identifier) return false;
  
  try {
    let filename = identifier;
    let isCloudinary = false;
    let publicId = identifier;

    // Check if what is passed is a URL
    if (identifier.startsWith('http')) {
      if (identifier.includes('cloudinary.com')) {
        isCloudinary = true;
        // Extract public ID from Cloudinary URL:
        // Ex: https://res.cloudinary.com/cloud_name/image/upload/v123456789/wannya/pets/filename.jpg
        const urlParts = identifier.split('/');
        const versionIndex = urlParts.findIndex(p => p.startsWith('v') && !isNaN(p.substring(1)));
        if(versionIndex !== -1) {
            const publicIdWithExt = urlParts.slice(versionIndex + 1).join('/');
            publicId = publicIdWithExt.split('.').slice(0, -1).join('.'); // Remove extension
        }
      } else {
        // Local URL
        filename = path.basename(identifier);
      }
    } else {
      // Identifier passes as 'wannya/folder/filename' or just filename
      if (identifier.includes('/')) {
        isCloudinary = true;
      }
    }

    if (isCloudinary) {
      await cloudinary.uploader.destroy(publicId);
      return true;
    } else {
      // Local delete
      const filePath = path.join(__dirname, '..', 'uploads', folder, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Delete multiple files helper
const deleteFiles = async (identifiers, folder = 'images') => {
  if (!identifiers || !Array.isArray(identifiers)) return false;
  
  let deletedCount = 0;
  for (const identifier of identifiers) {
    const success = await deleteFile(identifier, folder);
    if (success) {
      deletedCount++;
    }
  }
  
  return deletedCount;
};

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files uploaded' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected file field' });
    }
  }
  
  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({ message: error.message });
  }
  
  next(error);
};

module.exports = {
  uploadImages,
  uploadSingleImage,
  uploadMultipleImages,
  uploadDocuments,
  uploadAvatar,
  uploadSingleImageField,
  getFileUrl,
  deleteFile,
  deleteFiles,
  handleUploadError,
  ensureDirectoryExists
};

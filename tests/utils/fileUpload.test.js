jest.mock('fs');
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    api: { ping: jest.fn() },
    uploader: { destroy: jest.fn() }
  }
}));
jest.mock('multer-storage-cloudinary', () => ({
  CloudinaryStorage: jest.fn((options) => ({ options }))
}));
jest.mock('multer', () => {
  class MulterError extends Error {
    constructor(code) {
      super(code);
      this.name = 'MulterError';
      this.code = code;
    }
  }

  const multer = jest.fn(() => ({
    single: jest.fn(() => jest.fn()),
    array: jest.fn(() => jest.fn())
  }));
  multer.MulterError = MulterError;

  return multer;
});

const path = require('path');
const { mockRequest, mockResponse } = require('../helpers/mockHttp');

// fileUpload configures Cloudinary while being required, so every test reloads it
// against fresh module mocks.
let fs;
let multer;
let cloudinary;
let CloudinaryStorage;
let fileUpload;

const lastMulterOptions = () => multer.mock.calls.at(-1)[0];
const lastStorageOptions = () => CloudinaryStorage.mock.calls.at(-1)[0];

beforeEach(() => {
  jest.resetModules();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);

  process.env.CLOUDINARY_CLOUD_NAME = 'demo';
  process.env.CLOUDINARY_API_KEY = 'key';
  process.env.CLOUDINARY_API_SECRET = 'secret';

  fs = require('fs');
  multer = require('multer');
  cloudinary = require('cloudinary').v2;
  ({ CloudinaryStorage } = require('multer-storage-cloudinary'));
  fileUpload = require('../../utils/fileUpload');
});

describe('cloudinary bootstrap', () => {
  it('configures cloudinary from the environment and pings it', () => {
    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: 'demo',
      api_key: 'key',
      api_secret: 'secret'
    });
    expect(cloudinary.api.ping).toHaveBeenCalledTimes(1);
  });

  it('logs both ping outcomes without throwing', () => {
    const pingCallback = cloudinary.api.ping.mock.calls[0][0];

    expect(() => pingCallback(new Error('unauthorized'))).not.toThrow();
    expect(() => pingCallback(null, { status: 'ok' })).not.toThrow();
  });
});

describe('ensureDirectoryExists', () => {
  it('creates the directory when it is missing', () => {
    fs.existsSync.mockReturnValue(false);

    fileUpload.ensureDirectoryExists('/tmp/uploads');

    expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/uploads', { recursive: true });
  });

  it('leaves an existing directory alone', () => {
    fs.existsSync.mockReturnValue(true);

    fileUpload.ensureDirectoryExists('/tmp/uploads');

    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });
});

describe('upload middleware factories', () => {
  it('namespaces the Cloudinary folder and limits image uploads to 5MB', () => {
    fileUpload.uploadImages('pets', 3);

    expect(lastStorageOptions().params).toMatchObject({
      folder: 'wannya/pets',
      allowed_formats: ['jpeg', 'jpg', 'png', 'webp', 'gif', 'pdf']
    });
    expect(lastMulterOptions().limits).toEqual({ fileSize: 5 * 1024 * 1024, files: 3 });
  });

  it('defaults to the images folder', () => {
    fileUpload.uploadImages();

    expect(lastStorageOptions().params.folder).toBe('wannya/images');
    expect(lastMulterOptions().limits.files).toBe(5);
  });

  it('binds uploadSingleImage to the image field', () => {
    const middleware = fileUpload.uploadSingleImage('pets');

    expect(typeof middleware).toBe('function');
    expect(multer.mock.results.at(-1).value.single).toHaveBeenCalledWith('image');
  });

  it('binds uploadSingleImageField to a custom field', () => {
    fileUpload.uploadSingleImageField('pets', 'photo');

    expect(multer.mock.results.at(-1).value.single).toHaveBeenCalledWith('photo');
  });

  it('binds uploadMultipleImages to the images array field', () => {
    fileUpload.uploadMultipleImages('pets', 4);

    expect(multer.mock.results.at(-1).value.array).toHaveBeenCalledWith('images', 4);
  });

  it('allows larger documents and binds them to the documents field', () => {
    fileUpload.uploadDocuments('docs', 2);

    expect(lastMulterOptions().limits).toEqual({ fileSize: 10 * 1024 * 1024, files: 2 });
    expect(multer.mock.results.at(-1).value.array).toHaveBeenCalledWith('documents', 2);
  });

  it('exposes an avatar upload middleware capped at 2MB', () => {
    expect(typeof fileUpload.uploadAvatar).toBe('function');
    const avatarCall = multer.mock.calls.find(([options]) => options.limits.fileSize === 2 * 1024 * 1024);
    expect(avatarCall).toBeDefined();
  });
});

describe('file filters', () => {
  const imageFilter = () => {
    fileUpload.uploadSingleImage('pets');
    return lastMulterOptions().fileFilter;
  };

  const documentFilter = () => {
    fileUpload.uploadDocuments('docs');
    return lastMulterOptions().fileFilter;
  };

  it.each(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'])(
    'accepts the image type %s',
    (mimetype) => {
      const cb = jest.fn();

      imageFilter()(mockRequest(), { mimetype }, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    }
  );

  it.each(['application/pdf', 'text/plain'])('rejects the non-image type %s', (mimetype) => {
    const cb = jest.fn();

    imageFilter()(mockRequest(), { mimetype }, cb);

    expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
    expect(cb.mock.calls[0][0].message).toContain('Invalid file type');
  });

  it.each(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'])(
    'accepts the document type %s',
    (mimetype) => {
      const cb = jest.fn();

      documentFilter()(mockRequest(), { mimetype }, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    }
  );

  it.each(['image/gif', 'application/zip'])('rejects the document type %s', (mimetype) => {
    const cb = jest.fn();

    documentFilter()(mockRequest(), { mimetype }, cb);

    expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
  });
});

describe('getFileUrl', () => {
  const originalApiUrl = process.env.API_URL;

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.API_URL;
    } else {
      process.env.API_URL = originalApiUrl;
    }
  });

  it('returns null when there is no filename', () => {
    expect(fileUpload.getFileUrl(null)).toBeNull();
    expect(fileUpload.getFileUrl('')).toBeNull();
  });

  it('passes absolute URLs through untouched', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/v1/wannya/pets/cat.jpg';

    expect(fileUpload.getFileUrl(url)).toBe(url);
  });

  it('builds a local URL from API_URL and the folder', () => {
    process.env.API_URL = 'https://api.wannya.test';

    expect(fileUpload.getFileUrl('cat.jpg', 'pets')).toBe('https://api.wannya.test/uploads/pets/cat.jpg');
  });

  it('falls back to the local API host', () => {
    delete process.env.API_URL;

    expect(fileUpload.getFileUrl('cat.jpg')).toBe('http://127.0.0.1:5001/uploads/images/cat.jpg');
  });
});

describe('deleteFile', () => {
  it('returns false without an identifier', async () => {
    await expect(fileUpload.deleteFile(null)).resolves.toBe(false);
  });

  it('destroys the Cloudinary asset derived from its URL', async () => {
    cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

    await expect(
      fileUpload.deleteFile('https://res.cloudinary.com/demo/image/upload/v123456/wannya/pets/cat.jpg')
    ).resolves.toBe(true);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('wannya/pets/cat');
  });

  it('treats a bare public id path as a Cloudinary asset', async () => {
    cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

    await expect(fileUpload.deleteFile('wannya/pets/cat')).resolves.toBe(true);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('wannya/pets/cat');
  });

  it('deletes a local file referenced by a non-Cloudinary URL', async () => {
    fs.existsSync.mockReturnValue(true);

    await expect(
      fileUpload.deleteFile('https://api.wannya.test/uploads/pets/cat.jpg', 'pets')
    ).resolves.toBe(true);
    expect(fs.unlinkSync).toHaveBeenCalledWith(
      path.join(__dirname, '..', '..', 'uploads', 'pets', 'cat.jpg')
    );
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
  });

  it('returns false when the local file does not exist', async () => {
    fs.existsSync.mockReturnValue(false);

    await expect(fileUpload.deleteFile('cat.jpg')).resolves.toBe(false);
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  it('returns false when the deletion throws', async () => {
    cloudinary.uploader.destroy.mockRejectedValue(new Error('not found'));

    await expect(fileUpload.deleteFile('wannya/pets/cat')).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith('Error deleting file:', expect.any(Error));
  });
});

describe('deleteFiles', () => {
  it('returns false for anything that is not an array', async () => {
    await expect(fileUpload.deleteFiles(null)).resolves.toBe(false);
    await expect(fileUpload.deleteFiles('cat.jpg')).resolves.toBe(false);
  });

  it('counts only the successful deletions', async () => {
    cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });
    fs.existsSync.mockReturnValue(false);

    await expect(
      fileUpload.deleteFiles(['wannya/pets/cat', 'missing-local.jpg', 'wannya/pets/dog'])
    ).resolves.toBe(2);
  });
});

describe('handleUploadError', () => {
  it.each([
    ['LIMIT_FILE_SIZE', 'File size too large'],
    ['LIMIT_FILE_COUNT', 'Too many files uploaded'],
    ['LIMIT_UNEXPECTED_FILE', 'Unexpected file field']
  ])('turns a %s multer error into a 400', (code, message) => {
    const res = mockResponse();
    const next = jest.fn();

    fileUpload.handleUploadError(new multer.MulterError(code), mockRequest(), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ message });
    expect(next).not.toHaveBeenCalled();
  });

  it('reports invalid file type errors from the filters as a 400', () => {
    const res = mockResponse();
    const error = new Error('Invalid file type. Only PDF, JPEG, JPG, and PNG files are allowed.');

    fileUpload.handleUploadError(error, mockRequest(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ message: error.message });
  });

  it('forwards unhandled multer codes and generic errors to next', () => {
    const res = mockResponse();
    const next = jest.fn();
    const unknownMulterError = new multer.MulterError('LIMIT_PART_COUNT');
    const genericError = new Error('boom');

    fileUpload.handleUploadError(unknownMulterError, mockRequest(), res, next);
    fileUpload.handleUploadError(genericError, mockRequest(), res, next);

    expect(next).toHaveBeenNthCalledWith(1, unknownMulterError);
    expect(next).toHaveBeenNthCalledWith(2, genericError);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('forwards errors without a message to next', () => {
    const next = jest.fn();
    const error = new Error();

    fileUpload.handleUploadError(error, mockRequest(), mockResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

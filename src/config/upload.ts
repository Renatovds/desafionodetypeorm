import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const diretory = path.resolve(__dirname, '..', '..', 'tmp');

export default {
  fileDirectory: diretory,

  storage: multer.diskStorage({
    destination: diretory,
    filename: (request, file, callback) => {
      const hashname = crypto.randomBytes(10).toString('HEX');
      const filename = `${hashname}-${file.originalname}`;

      return callback(null, filename);
    },
  }),
};

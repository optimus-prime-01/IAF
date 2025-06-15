const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
 
    const folderName = uuidv4();
    const uploadPath = path.join(__dirname, '../uploads', folderName);

 
    fs.mkdirSync(uploadPath, { recursive: true });

  
    req.uploadFolder = uploadPath;
    req.folderName = folderName;

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });
module.exports = upload;

import multer from "multer"
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, './public/temp');
  },
  filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExtension = file.mimetype.split('/')[1]; // Get file extension
      cb(null, file.fieldname + '-' + uniqueSuffix + '.' + fileExtension); 
  }
});

  
  const upload = multer({ storage: storage })
  export { upload }
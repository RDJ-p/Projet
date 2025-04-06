const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { submitExchangeRequest } = require('../Controllers/exchangecontroller');

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || 
            file.mimetype === 'application/msword' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF and DOC/DOCX files are allowed!'), false);
        }
    }
});

router.post('/', upload.single('file_upload'), submitExchangeRequest);

module.exports = router;

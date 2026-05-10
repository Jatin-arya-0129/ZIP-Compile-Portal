const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  dest: 'uploads/'
});

app.post('/upload', upload.array('zips'), async (req, res) => {

  try {

    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No ZIP files uploaded'
      });
    }

    const tempFolder = path.join(__dirname, 'temp');

    await fs.ensureDir(tempFolder);

    for (const file of files) {

      const zip = new AdmZip(file.path);

      zip.extractAllTo(tempFolder, true);
    }

    await fs.ensureDir('output');

    const finalZip = `compiled_${Date.now()}.zip`;

    const outputZipPath = path.join(__dirname, 'output', finalZip);

    const output = fs.createWriteStream(outputZipPath);

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.pipe(output);

    archive.directory(tempFolder, false);

    await archive.finalize();

    output.on('close', async () => {

      await fs.emptyDir(tempFolder);

      res.json({
        success: true,
        download: `/download/${finalZip}`
      });

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }

});

app.get('/download/:file', (req, res) => {

  const filePath = path.join(__dirname, 'output', req.params.file);

  res.download(filePath);
});

app.get('/', (req, res) => {

  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

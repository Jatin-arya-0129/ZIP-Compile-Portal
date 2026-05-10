const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');
const archiver = require('archiver');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  dest: 'uploads/'
});

function getFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

app.post('/upload', upload.array('zips'), async (req, res) => {

  try {

    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No ZIP files uploaded'
      });
    }

    const tempFolder = path.join(__dirname, 'temp', Date.now().toString());

    await fs.ensureDir(tempFolder);

    const hashes = new Set();

    for (const file of files) {

      const zip = new AdmZip(file.path);

      zip.extractAllTo(tempFolder, true);
    }

    async function scanDirectory(dir) {

      const items = await fs.readdir(dir);

      for (const item of items) {

        const fullPath = path.join(dir, item);

        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {

          await scanDirectory(fullPath);

        } else {

          const hash = getFileHash(fullPath);

          if (hashes.has(hash)) {

            await fs.remove(fullPath);

          } else {

            hashes.add(hash);
          }
        }
      }
    }

    await scanDirectory(tempFolder);

    await fs.ensureDir(path.join(__dirname, 'output'));

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

      await fs.remove(tempFolder);

      for (const file of files) {
        await fs.remove(file.path);
      }

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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
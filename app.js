const uploadBtn = document.getElementById('uploadBtn');
const zipInput = document.getElementById('zipInput');
const progressBar = document.getElementById('progressBar');
const result = document.getElementById('result');
const preview = document.getElementById('preview');
const themeSwitcher = document.getElementById('themeSwitcher');

themeSwitcher.addEventListener('change', () => {
  document.body.className = themeSwitcher.value;
});

zipInput.addEventListener('change', () => {

  preview.innerHTML = '';

  for (let file of zipInput.files) {

    const div = document.createElement('div');

    div.className = 'preview-item';

    div.innerHTML = `
      <strong>${file.name}</strong><br>
      ${(file.size / 1024).toFixed(2)} KB
    `;

    preview.appendChild(div);
  }
});

uploadBtn.addEventListener('click', async () => {

  const files = zipInput.files;

  if (files.length === 0) {
    alert('Please Select ZIP Files');
    return;
  }

  const formData = new FormData();

  for (let file of files) {
    formData.append('zips', file);
  }

  progressBar.style.width = '20%';

  try {

    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    progressBar.style.width = '80%';

    const data = await response.json();

    progressBar.style.width = '100%';

    if (data.success) {

      result.innerHTML = `
        <a class="download-btn" href="${data.download}">
          Download Final ZIP
        </a>
      `;

    } else {

      result.innerHTML = 'Error Processing Files';
    }

  } catch (error) {

    console.log(error);

    result.innerHTML = 'Server Error';
  }
});
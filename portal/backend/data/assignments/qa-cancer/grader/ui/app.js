const $ = (id) => document.getElementById(id);

document.getElementById('run').addEventListener('click', () => {
  document.getElementById('error').textContent = "";
  document.getElementById('result').style.display = "none";
  const name = document.getElementById('name').value.trim();
  const age = parseInt(document.getElementById('age').value, 10);
  const f = document.getElementById('img').files[0];
  if (!name) {
    document.getElementById('error').textContent = "Patient Name is required";
    return;
  }
  if (!Number.isInteger(age) || age <= 0) {
    document.getElementById('error').textContent = "Age must be positive";
    return;
  }
  if (!f) {
    document.getElementById('error').textContent = "Image is required";
    return;
  }
  if (!/\.(jpg|jpeg|png)$/i.test(f.name)) {
    document.getElementById('error').textContent = "Invalid image";
    return;
  }
  setTimeout(() => {
    document.getElementById('result').style.display = "block";
    document.getElementById('pdf').setAttribute('href', 'data:application/pdf;base64,UEZG');
  }, 300);
});

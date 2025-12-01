const $ = (id) => document.getElementById(id);

const dateInput = $('date');
const today = new Date().toISOString().split('T')[0];
dateInput.max = today;
if (!dateInput.value) dateInput.value = today;

const errorsBox = $('errors');
const summaryBox = $('summary');

function showErrors(errors) {
  if (!errors.length) {
    errorsBox.style.display = 'none';
    errorsBox.innerHTML = '';
    return;
  }
  errorsBox.style.display = 'block';
  errorsBox.innerHTML = errors.map(e => `<div class="error">${e}</div>`).join('');
}

$('run').addEventListener('click', () => {
  summaryBox.style.display = 'none';
  const errors = [];

  const claimId = $('claimId').value.trim();
  const email = $('email').value.trim();
  const date = $('date').value;
  const type = $('type').value;
  const desc = $('desc').value.trim();
  const file = $('evidence').files[0];

  if (!claimId) {
    errors.push('Claim ID is required');
  } else if (!/^\d{6}$/.test(claimId)) {
    errors.push('Claim ID must be 6 digits');
  }

  if (!email) {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Enter a valid email');
    }
  }

  if (!date) {
    errors.push('Incident date cannot be in the future');
  } else {
    const todayDate = new Date();
    const picked = new Date(date + 'T00:00:00');
    if (picked > todayDate) {
      errors.push('Incident date cannot be in the future');
    }
  }

  if (desc.length < 20) {
    errors.push('Description must be at least 20 characters');
  }

  if (!file) {
    errors.push('Evidence is required');
  } else if (!/\.pdf$/i.test(file.name)) {
    errors.push('Evidence must be a PDF');
  }

  showErrors(errors);
  if (errors.length) return;

  $('token').textContent = `CLAIM-${claimId}`;
  $('sumEmail').textContent = email;
  $('sumType').textContent = type || 'Unspecified';
  $('sumDate').textContent = date;
  $('sumDesc').textContent = desc;
  summaryBox.style.display = 'block';
});

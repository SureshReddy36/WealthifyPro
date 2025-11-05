// Utility: format currency INR
function formatINR(value) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0);
  } catch (_) {
    return `₹${(value || 0).toFixed(2)}`;
  }
}

// Utility: animated counting for numbers
function animateNumber(el, to, duration = 600) {
  const start = performance.now();
  const from = parseFloat((el.getAttribute('data-from') || '0').replace(/[^0-9.-]/g, '')) || 0;
  const diff = to - from;
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = from + diff * eased;
    el.textContent = formatINR(val);
    if (t < 1) requestAnimationFrame(step);
    else el.setAttribute('data-from', String(to));
  }
  requestAnimationFrame(step);
}

// Toast notifications
const toastEl = document.getElementById('toast');
function showToast(message = 'Done') {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  toastEl.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toastEl.classList.remove('show'); }, 1800);
}

// Theme toggle persistence
const themeToggle = document.getElementById('themeToggle');
const paletteSelect = document.getElementById('paletteSelect');
function applyTheme(theme) {
  if (theme === 'light') document.documentElement.classList.add('light');
  else document.documentElement.classList.remove('light');
  if (themeToggle) themeToggle.textContent = document.documentElement.classList.contains('light') ? '🌞' : '🌙';
}
function applyPalette(paletteKey) {
  if (!paletteKey) return;
  document.documentElement.setAttribute('data-palette', paletteKey);
  // If user picked a light palette, ensure light mode; dark palettes otherwise
  const lightPalettes = ['mint-cream','warm-beige','soft-teal','lavender-mist','sky-breeze','blush-rose','ivory-glow','ocean-pearl','lemon-frost','cloud-drift','frost-mint','peach-glow','sand-dune','snow-lilac'];
  const theme = lightPalettes.includes(paletteKey) ? 'light' : 'dark';
  localStorage.setItem('theme', theme);
  applyTheme(theme);
}
function initTheme() {
  const savedPalette = localStorage.getItem('palette') || 'charcoal-violet';
  applyPalette(savedPalette);
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);
  if (paletteSelect) paletteSelect.value = savedPalette;
}
initTheme();
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('light');
    const theme = isLight ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    applyTheme(theme);
  });
}
paletteSelect?.addEventListener('change', () => {
  const value = paletteSelect.value;
  localStorage.setItem('palette', value);
  applyPalette(value);
});

// Interest calculator elements
const principalEl = document.getElementById('principal');
const rateEl = document.getElementById('rate');
const daysEl = document.getElementById('days');
const modeEl = document.getElementById('mode');
const simpleYearsGroup = document.getElementById('simpleYearsGroup');
const simpleYearsEl = document.getElementById('simpleYears');
const calcInterestBtn = document.getElementById('calcInterest');
const resetInterestBtn = document.getElementById('resetInterest');
const siAmountEl = document.getElementById('siAmount');
const ciAmountEl = document.getElementById('ciAmount');
const totalAmountEl = document.getElementById('totalAmount');
const interestResults = document.getElementById('interestResults');
const interestLoading = document.getElementById('interestLoading');
const historyContainer = document.getElementById('interestHistory');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');

let interestHistory = JSON.parse(localStorage.getItem('interestHistory') || '[]');
renderHistory();

if (modeEl) {
  modeEl.addEventListener('change', () => {
    const isCustom = modeEl.value === 'custom';
    simpleYearsGroup.classList.toggle('hidden', !isCustom);
  });
}

// (rate UI reverted to default % p.a.)

function clamp(n) { return Number.isFinite(n) ? n : 0; }

// Core interest calculation logic
function calculateInterest() {
  const P = clamp(parseFloat(principalEl.value));
  const R = clamp(parseFloat(rateEl.value));
  const D = Math.max(0, Math.floor(clamp(parseFloat(daysEl.value))));
  if (!(P > 0 && R >= 0 && D >= 0)) return { si: 0, ci: 0, total: P };

  const mode = modeEl.value;
  // R represents ₹ per day per ₹1000
  if (mode === 'full-simple') {
    const SI = (P * R * D) / 3000;
    return { si: SI, ci: 0, total: P + SI };
  }

  // Custom mode
  const years = Math.max(0, clamp(parseFloat(simpleYearsEl.value)) || 0);
  const simpleDays = Math.floor(years * 360);
  if (D <= simpleDays) {
    const SI = (P * R * D) / 3000;
    return { si: SI, ci: 0, total: P + SI };
  }

  // First simple interest over simpleDays
  const SI = (P * R * simpleDays) / 3000;
  const newPrincipal = P + SI;
  const compoundDays = D - simpleDays;
  const dailyRate = R / 3000;
  const compoundAmount = newPrincipal * Math.pow(1 + dailyRate, compoundDays);
  const compoundInterest = compoundAmount - newPrincipal;
  const total = P + SI + compoundInterest;
  return { si: SI, ci: compoundInterest, total };
}

function renderHistory() {
  if (!historyList) return;
  historyList.innerHTML = '';
  if (!interestHistory.length) {
    const li = document.createElement('li');
    li.textContent = 'No calculations yet. Run a calculation to see it here.';
    historyList.appendChild(li);
  } else {
    interestHistory.slice(0, 5).forEach((h) => {
      const li = document.createElement('li');
      li.textContent = `${h.date} • P=${formatINR(h.P)} • R=${h.R}% • D=${h.D} → Total ${formatINR(h.total)}`;
      historyList.appendChild(li);
    });
  }
  historyContainer.classList.remove('hidden');
}
 
function renderCalcHistory() {
  calcHistoryList.innerHTML = '';
  if (!calcHistory.length) {
    const li = document.createElement('li');
    li.textContent = 'No history yet. Perform a calculation.';
    calcHistoryList.appendChild(li);
    return;
  }
  calcHistory.slice(0, 10).forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    calcHistoryList.appendChild(li);
  });
}

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', () => {
    interestHistory = [];
    localStorage.removeItem('interestHistory');
    renderHistory();
  });
}

function handleCalculateInterest() {
  // Loading shimmer
  interestLoading.classList.remove('hidden');
  calcInterestBtn.disabled = true;
  setTimeout(() => {
    const { si, ci, total } = calculateInterest();
    interestResults.classList.remove('hidden');
    animateNumber(siAmountEl, si);
    animateNumber(ciAmountEl, ci);
    animateNumber(totalAmountEl, total);
    interestLoading.classList.add('hidden');
    calcInterestBtn.disabled = false;
    // Save history (max 5)
    const rec = {
      date: new Date().toLocaleString(),
      P: parseFloat(principalEl.value) || 0,
      R: parseFloat(rateEl.value) || 0,
      D: parseFloat(daysEl.value) || 0,
      total
    };
    interestHistory.unshift(rec);
    interestHistory = interestHistory.slice(0, 5);
    localStorage.setItem('interestHistory', JSON.stringify(interestHistory));
    renderHistory();
    showToast('Interest calculated');
  }, 450);
}

if (calcInterestBtn) calcInterestBtn.addEventListener('click', handleCalculateInterest);
if (resetInterestBtn) resetInterestBtn.addEventListener('click', () => {
  principalEl.value = '';
  rateEl.value = '';
  // Do not reset days; it may be populated by date calculator
  siAmountEl.textContent = formatINR(0);
  ciAmountEl.textContent = formatINR(0);
  totalAmountEl.textContent = formatINR(0);
  interestResults.classList.add('hidden');
});

// Date difference (30/360) elements
const startDateEl = document.getElementById('startDate');
const endDateEl = document.getElementById('endDate');
const calcDatesBtn = document.getElementById('calcDates');
const dateErrorEl = document.getElementById('dateError');
const totalDaysEl = document.getElementById('totalDays');
const ymdEl = document.getElementById('ymd');

function ymdFromDays(total) {
  const y = Math.floor(total / 360);
  const m = Math.floor((total % 360) / 30);
  const d = total % 30;
  return { y, m, d };
}

function calc30_360_days(d1, d2) {
  // Actual rule simplified per prompt: 30/360 simple difference
  const y1 = d1.getFullYear();
  const m1 = d1.getMonth() + 1;
  const day1 = d1.getDate();
  const y2 = d2.getFullYear();
  const m2 = d2.getMonth() + 1;
  const day2 = d2.getDate();
  return (y2 - y1) * 360 + (m2 - m1) * 30 + (day2 - day1);
}

function handleCalcDates() {
  dateErrorEl.classList.add('hidden');
  const s = startDateEl.valueAsDate;
  const e = endDateEl.valueAsDate;
  if (!s || !e) return;
  if (e <= s) {
    dateErrorEl.classList.remove('hidden');
    return;
  }
  const days = calc30_360_days(s, e);
  const { y, m, d } = ymdFromDays(days);
  totalDaysEl.textContent = String(days);
  ymdEl.textContent = `${y}y : ${m}m : ${d}d`;
  document.getElementById('dateResults').classList.remove('hidden');
  // Autofill the Interest Calculator Days
  daysEl.value = String(days);
  showToast('Date difference calculated');
}

if (calcDatesBtn) calcDatesBtn.addEventListener('click', handleCalcDates);

// Date Calculator Toggle
const toggleDateCalcBtn = document.getElementById('toggleDateCalc');
const closeDateCalcBtn = document.getElementById('closeDateCalc');
const dateCard = document.getElementById('dateCard');
const interestCard = document.getElementById('interestCard');

function updateDateCalcLayout() {
  if (!dateCard || !interestCard) return;
  const isDateCardVisible = !dateCard.classList.contains('hidden');
  if (isDateCardVisible) {
    interestCard.style.gridColumn = '';
  } else {
    interestCard.style.gridColumn = '1 / -1';
  }
}

function hideDateCalculator() {
  if (!dateCard) return;
  dateCard.classList.add('hidden');
  if (toggleDateCalcBtn) {
    toggleDateCalcBtn.textContent = '📅 Date Calculator';
  }
  updateDateCalcLayout();
}

function showDateCalculator() {
  if (!dateCard) return;
  dateCard.classList.remove('hidden');
  if (toggleDateCalcBtn) {
    toggleDateCalcBtn.textContent = '📅 Hide Date Calculator';
  }
  updateDateCalcLayout();
}

if (toggleDateCalcBtn && dateCard && interestCard) {
  toggleDateCalcBtn.addEventListener('click', () => {
    if (dateCard.classList.contains('hidden')) {
      showDateCalculator();
    } else {
      hideDateCalculator();
    }
  });
  // Initial layout update
  updateDateCalcLayout();
}

if (closeDateCalcBtn) {
  closeDateCalcBtn.addEventListener('click', hideDateCalculator);
}

// Integrated popup calculator
const openCalcBtn = document.getElementById('openCalc');
const closeCalcBtn = document.getElementById('closeCalc');
const calcModal = document.getElementById('calcModal');
const calcInput = document.getElementById('calcInput');
const calcEqualsBtn = document.getElementById('calcEquals');
const calcCopyBtn = document.getElementById('calcCopy');
const calcPasteBtn = document.getElementById('calcPaste');
const calcClearBtn = document.getElementById('calcClear');
const calcHistoryList = document.getElementById('calcHistoryList');
const calcClearHistoryBtn = document.getElementById('calcClearHistory');

let calcHistory = JSON.parse(localStorage.getItem('popupCalcHistory') || '[]');
renderCalcHistory();

function openCalc() {
  if (!calcModal.open) calcModal.showModal();
  setTimeout(() => calcInput.focus(), 50);
}
function closeCalc() { if (calcModal.open) calcModal.close(); }

// (moved up for placeholder support)

function evalExpression(expr) {
  // Basic safe eval using Function with numeric filter
  if (!/^[-+/*()., 0-9]+$/.test(expr)) return NaN;
  try {
    const f = new Function(`return (${expr.replace(/,/g, '')})`);
    const n = f();
    return Number.isFinite(n) ? n : NaN;
  } catch { return NaN; }
}

if (openCalcBtn) openCalcBtn.addEventListener('click', openCalc);
if (closeCalcBtn) closeCalcBtn.addEventListener('click', closeCalc);
calcModal?.addEventListener('cancel', (e) => { e.preventDefault(); closeCalc(); });

document.querySelectorAll('.calc-grid button[data-key]').forEach(btn => {
  btn.addEventListener('click', () => { calcInput.value += btn.dataset.key; });
});
document.querySelectorAll('.calc-grid button[data-op]').forEach(btn => {
  btn.addEventListener('click', () => { calcInput.value += ` ${btn.dataset.op} `; });
});
if (calcEqualsBtn) calcEqualsBtn.addEventListener('click', () => {
  const val = evalExpression(calcInput.value.trim());
  if (!Number.isNaN(val)) {
    const line = `${calcInput.value} = ${val}`;
    calcInput.value = String(val);
    calcHistory.unshift(line);
    calcHistory = calcHistory.slice(0, 10);
    localStorage.setItem('popupCalcHistory', JSON.stringify(calcHistory));
    renderCalcHistory();
  }
});

if (calcCopyBtn) calcCopyBtn.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(calcInput.value || ''); showToast('Copied'); } catch { /* noop */ }
});
if (calcPasteBtn) calcPasteBtn.addEventListener('click', async () => {
  try { const t = await navigator.clipboard.readText(); calcInput.value += t; } catch { /* noop */ }
});
if (calcClearBtn) calcClearBtn.addEventListener('click', () => { calcInput.value = ''; });
if (calcClearHistoryBtn) calcClearHistoryBtn.addEventListener('click', () => {
  calcHistory = [];
  localStorage.removeItem('popupCalcHistory');
  renderCalcHistory();
});

window.addEventListener('keydown', (e) => {
  if (!calcModal.open) return;
  if (e.key === 'Enter') { e.preventDefault(); calcEqualsBtn.click(); }
});

// Accessibility: trap focus minimal
calcModal?.addEventListener('click', (e) => {
  const rect = calcModal.querySelector('.calc-window')?.getBoundingClientRect();
  if (!rect) return;
  if (e.target === calcModal) closeCalc();
});


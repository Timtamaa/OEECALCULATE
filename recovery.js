/* ==========================================================
   CORE RECOVERY — per interval

   Rec (per interval) = min(Panjang Sampel ÷ Interval, 1) × 100%
   Core loss          = max(Interval − Panjang Sampel, 0)
   Swelling           = Panjang Sampel > Interval  →  Rec 100%
   Rata-rata Rec      = rata-rata Rec per interval (baris terisi)
   ========================================================== */

const els = {
  startDepth: document.getElementById('startDepth'),
  intervalLen: document.getElementById('intervalLen'),
  recRows: document.getElementById('recRows'),
  addRow: document.getElementById('addRow'),
  errorBox: document.getElementById('errorBox'),
  statusLamp: document.getElementById('statusLamp'),
  statusText: document.getElementById('statusText'),
  outAvg: document.getElementById('outAvg'),
  outCount: document.getElementById('outCount'),
  outLoss: document.getElementById('outLoss'),
  outDrilled: document.getElementById('outDrilled'),
  outSample: document.getElementById('outSample'),
  outSwell: document.getElementById('outSwell'),
  coreList: document.getElementById('coreList'),
};

let rows = [];   // { id, input, idxEl, pctEl, el }
let nextId = 1;

/* ---------- util ---------- */
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
function fmt(n, d = 2) {
  return n.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function tone(rec) { return rec >= 90 ? 'good' : rec >= 70 ? 'mid' : 'low'; }

/* ---------- inti perhitungan ---------- */
function calcInterval(sampleLen, interval) {
  const swelling = sampleLen > interval + 1e-9;
  const rec = Math.min(sampleLen / interval, 1) * 100;
  const loss = Math.max(interval - sampleLen, 0);
  return { rec, loss, swelling };
}

/* ---------- baris input ---------- */
function addRow(focus = true) {
  const id = nextId++;
  const el = document.createElement('div');
  el.className = 'rec-row';
  el.innerHTML =
    '<span class="rec-idx"></span>' +
    '<div class="adv-field rec-input">' +
      '<input type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00">' +
      '<span class="unit-sm">m</span>' +
    '</div>' +
    '<span class="rec-pct">—</span>' +
    '<button type="button" class="rec-del" aria-label="Hapus interval">×</button>';

  const row = {
    id, el,
    input: el.querySelector('input'),
    idxEl: el.querySelector('.rec-idx'),
    pctEl: el.querySelector('.rec-pct'),
  };

  row.input.addEventListener('input', update);
  row.input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const i = rows.indexOf(row);
    if (i === rows.length - 1) addRow(true);
    else rows[i + 1].input.focus();
  });
  el.querySelector('.rec-del').addEventListener('click', () => removeRow(row));

  rows.push(row);
  els.recRows.appendChild(el);
  update();
  if (focus) row.input.focus();
}

function removeRow(row) {
  if (rows.length === 1) {          // sisakan minimal satu baris
    row.input.value = '';
    update();
    row.input.focus();
    return;
  }
  rows.splice(rows.indexOf(row), 1);
  row.el.remove();
  update();
}

/* ---------- hitung & render ---------- */
function setStatus(state, text) {
  els.statusLamp.classList.remove('ready', 'error');
  if (state) els.statusLamp.classList.add(state);
  els.statusText.textContent = text;
}

function clearOutputs() {
  els.outAvg.textContent = '—';
  els.outCount.textContent = '0';
  els.outLoss.textContent = '—';
  els.outDrilled.textContent = '—';
  els.outSample.textContent = '—';
  els.outSwell.textContent = '—';
  els.coreList.innerHTML = '<p class="core-empty">Isi panjang sampel untuk melihat ilustrasi.</p>';
}

function update() {
  els.errorBox.hidden = true;

  const interval = parseFloat(els.intervalLen.value);
  let start = parseFloat(els.startDepth.value);
  if (isNaN(start) || start < 0) start = 0;

  if (isNaN(interval) || interval <= 0) {
    els.errorBox.hidden = false;
    els.errorBox.textContent = 'Panjang interval harus lebih besar dari 0.';
    setStatus('error', 'INPUT TIDAK VALID');
    clearOutputs();
    return;
  }

  let sumRec = 0, sumLoss = 0, sumSample = 0, swellCount = 0, n = 0;
  const illus = [];

  rows.forEach((row, i) => {
    const from = round2(start + i * interval);
    const to = round2(start + (i + 1) * interval);
    row.idxEl.textContent = `${fmt(from, 1)}–${fmt(to, 1)}`;

    const raw = row.input.value.trim();
    const len = parseFloat(raw);
    row.pctEl.className = 'rec-pct';

    if (raw === '' || isNaN(len) || len < 0) {
      row.pctEl.textContent = '—';
      return;
    }

    const r = calcInterval(len, interval);
    row.pctEl.textContent = `${fmt(r.rec, 1)}%`;
    row.pctEl.classList.add(tone(r.rec));

    n++;
    sumRec += r.rec;
    sumLoss += r.loss;
    sumSample += len;
    if (r.swelling) swellCount++;
    illus.push({ label: `${fmt(from, 1)}–${fmt(to, 1)}`, len, ...r });
  });

  if (n === 0) {
    clearOutputs();
    setStatus(null, 'MENUNGGU INPUT');
    return;
  }

  const avg = sumRec / n;
  els.outAvg.textContent = `${fmt(avg, 1)}%`;
  els.outCount.textContent = String(n);
  els.outLoss.textContent = fmt(sumLoss);
  els.outDrilled.textContent = `${fmt(n * interval)} m`;
  els.outSample.textContent = `${fmt(sumSample)} m`;
  els.outSwell.textContent = `${swellCount} interval`;

  renderIllustration(illus);
  setStatus('ready', 'PERHITUNGAN SELESAI');
}

function renderIllustration(list) {
  els.coreList.innerHTML = '';
  list.forEach(item => {
    const row = document.createElement('div');
    row.className = 'core-row';

    const label = document.createElement('span');
    label.textContent = item.label;

    const bar = document.createElement('div');
    bar.className = 'core-bar';
    const fill = document.createElement('div');
    fill.className = 'core-fill ' + tone(item.rec) + (item.swelling ? ' swell' : '');
    fill.style.width = Math.min(item.rec, 100) + '%';
    bar.appendChild(fill);

    const val = document.createElement('span');
    val.className = 'core-val';
    val.textContent = `${fmt(item.rec, 0)}%`;

    row.append(label, bar, val);
    els.coreList.appendChild(row);
  });
}

/* ---------- wiring ---------- */
els.addRow.addEventListener('click', () => addRow(true));
els.startDepth.addEventListener('input', update);
els.intervalLen.addEventListener('input', update);

addRow(false);

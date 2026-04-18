// =============================================
//  Reang Translator — Admin Dashboard Script
// =============================================

let currentPage   = 1;
let currentSearch = '';
let chart1Instance = null;
let chart2Instance = null;

// ─── View Switching ───────────────────────────────────────────
const VIEWS = ['dashboard', 'words', 'pending', 'analytics'];

function showView(name) {
  VIEWS.forEach(v => {
    const el  = document.getElementById(`view-${v}`);
    const nav = document.getElementById(`nav-${v}`);
    if (el)  el.style.display  = v === name ? '' : 'none';
    if (nav) nav.classList.toggle('active', v === name);
  });

  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.remove('open');

  // Topbar labels
  const titles = {
    dashboard: ['Dashboard',  'Overview of your translation data'],
    words:     ['Dictionary', 'Browse and manage word pairs'],
    pending:   ['Approvals',  'Review user-submitted words'],
    analytics: ['Analytics',  'Translation trends and usage stats'],
  };
  const [title, sub] = titles[name] || ['Admin', ''];
  document.getElementById('topbar-title').textContent = title;
  document.getElementById('topbar-sub').textContent   = sub;

  if (name === 'words')     loadWords(currentPage);
  if (name === 'pending')   loadPendingWords(1);
  if (name === 'analytics') loadAnalyticsView();
}

// ─── Stats ────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res  = await fetch('/admin/stats');
    const data = await res.json();

    setText('translations',   data.translations ?? '—');
    setText('words',          data.words         ?? '—');
    setText('today-count',    data.today         ?? '—');
    setText('a-translations', data.translations  ?? '—');
    setText('a-words',        data.words         ?? '—');
  } catch { /* silent */ }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─── Chart ────────────────────────────────────────────────────
const CHART_DEFAULTS = {
  type: 'line',
  options: {
    responsive:          true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1c1b28',
        borderColor:     'rgba(124,106,247,0.3)',
        borderWidth:      1,
        titleColor:      '#f0eeff',
        bodyColor:       '#a594f9',
        padding:          10,
      },
    },
    scales: {
      x: {
        grid:  { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: 'rgba(240,238,255,0.35)', font: { family: 'Inter', size: 11 } },
      },
      y: {
        grid:  { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: 'rgba(240,238,255,0.35)', font: { family: 'Inter', size: 11 }, stepSize: 1 },
        beginAtZero: true,
      },
    },
  },
};

async function loadChart(canvasId, destroyRef) {
  try {
    const res  = await fetch('/admin/chart');
    const data = await res.json();

    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    if (destroyRef) destroyRef.destroy();

    return new Chart(ctx, {
      ...CHART_DEFAULTS,
      data: {
        labels:   data.labels || [],
        datasets: [{
          label:           'Translations',
          data:            data.data   || [],
          fill:            true,
          tension:         0.4,
          borderColor:     '#7c6af7',
          borderWidth:      2,
          pointBackgroundColor: '#7c6af7',
          pointRadius:      4,
          pointHoverRadius: 6,
          backgroundColor: (ctx) => {
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 220);
            gradient.addColorStop(0,   'rgba(124,106,247,0.25)');
            gradient.addColorStop(1,   'rgba(124,106,247,0)');
            return gradient;
          },
        }],
      },
    });
  } catch { return null; }
}

// ─── Add Word ─────────────────────────────────────────────────
async function addWord() {
  const englishEl = document.getElementById('english');
  const reangEl   = document.getElementById('reang');
  const statusEl  = document.getElementById('status');

  const english = englishEl.value.trim();
  const reang   = reangEl.value.trim();

  if (!english || !reang) {
    showStatus('Please fill in both fields.', true);
    return;
  }

  try {
    const res  = await fetch('/add-word', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ english, reang }),
    });
    const data = await res.json();

    if (data.error) {
      showStatus(data.error, true);
    } else {
      showStatus(data.message || '✓ Word added successfully!', false);
      englishEl.value = '';
      reangEl.value   = '';
      loadStats();
    }
  } catch {
    showStatus('Network error — please try again.', true);
  }
}

function showStatus(msg, isError) {
  const el = document.getElementById('status');
  if (!el) return;
  el.textContent = msg;
  el.className   = isError ? 'error' : '';
  setTimeout(() => { el.textContent = ''; }, 4000);
}

// ─── Word Table ───────────────────────────────────────────────
function searchWords() {
  currentSearch = document.getElementById('searchInput').value;
  loadWords(1);
}

async function loadWords(page = 1) {
  currentPage = page;

  try {
    const res  = await fetch(`/words?page=${page}&search=${encodeURIComponent(currentSearch)}`);
    const data = await res.json();

    const tbody = document.getElementById('wordsTable');
    tbody.innerHTML = '';

    if (!data.words || data.words.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center;padding:40px;color:var(--text-muted);font-size:14px;">
            No words found
          </td>
        </tr>`;
    } else {
      const offset = (page - 1) * (data.per_page || 10);
      data.words.forEach((word, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="color:var(--text-muted);font-size:12px;">${offset + i + 1}</td>
          <td style="font-weight:500;color:var(--text-primary);">${escHtml(word.english)}</td>
          <td>${escHtml(word.reang)}</td>
          <td>
            <div class="action-btns">
              <button class="small edit" onclick="openEditModal(${word.id}, '${escAttr(word.english)}', '${escAttr(word.reang)}')">
                ✏️ Edit
              </button>
              <button class="small delete" onclick="deleteWord(${word.id})">
                🗑 Delete
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(row);
      });
    }

    renderPagination(data.total_pages || 1, page);
  } catch { /* silent */ }
}

function renderPagination(totalPages, current) {
  const container = document.getElementById('pagination');
  if (!container) return;
  container.innerHTML = '';

  if (totalPages <= 1) return;

  const mkBtn = (label, page, isActive = false, disabled = false) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (isActive)  btn.className = 'active';
    if (disabled)  btn.disabled  = true;
    btn.onclick = () => loadWords(page);
    return btn;
  };

  container.appendChild(mkBtn('←', current - 1, false, current === 1));

  const start = Math.max(1, current - 2);
  const end   = Math.min(totalPages, current + 2);

  if (start > 1) {
    container.appendChild(mkBtn('1', 1));
    if (start > 2) container.appendChild(Object.assign(document.createElement('span'), { textContent: '…', style: 'color:var(--text-muted);padding:0 4px;' }));
  }

  for (let i = start; i <= end; i++) {
    container.appendChild(mkBtn(i, i, i === current));
  }

  if (end < totalPages) {
    if (end < totalPages - 1) container.appendChild(Object.assign(document.createElement('span'), { textContent: '…', style: 'color:var(--text-muted);padding:0 4px;' }));
    container.appendChild(mkBtn(totalPages, totalPages));
  }

  container.appendChild(mkBtn('→', current + 1, false, current === totalPages));
}

// ─── Delete ───────────────────────────────────────────────────
async function deleteWord(id) {
  if (!confirm('Delete this word pair? This cannot be undone.')) return;
  try {
    await fetch(`/delete-word/${id}`, { method: 'DELETE' });
    loadWords(currentPage);
    loadStats();
  } catch { /* silent */ }
}

let currentPendingPage = 1;
async function loadPendingWords(page = 1) {
  currentPendingPage = page;
  try {
    const res  = await fetch(`/words?page=${page}&owner=pending`);
    const data = await res.json();
    const tbody = document.getElementById('pendingTable');
    tbody.innerHTML = '';
    if (!data.words || data.words.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--text-muted);font-size:14px;">No pending words</td></tr>`;
    } else {
      const offset = (page - 1) * 10;
      data.words.forEach((word, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="color:var(--text-muted);font-size:12px;">${offset + i + 1}</td>
          <td style="font-weight:500;color:var(--text-primary);">${escHtml(word.english)}</td>
          <td>${escHtml(word.reang)}</td>
          <td>
            <div class="action-btns">
              <button class="small" onclick="approveWord(${word.id})" style="background:var(--accent-light); border-color:var(--accent-light); color:black;">✓ Approve</button>
              <button class="small delete" onclick="rejectWord(${word.id})">✗ Reject</button>
            </div>
          </td>
        `;
        tbody.appendChild(row);
      });
    }
  } catch { }
}

async function approveWord(id) {
  try {
    await fetch(`/approve-word/${id}`, { method: 'POST' });
    loadPendingWords(currentPendingPage);
    loadStats();
  } catch {}
}

async function rejectWord(id) {
  if(!confirm('Reject and delete this submission?')) return;
  try {
    await fetch(`/reject-word/${id}`, { method: 'POST' });
    loadPendingWords(currentPendingPage);
  } catch {}
}

// ─── Edit Modal ───────────────────────────────────────────────
function openEditModal(id, english, reang) {
  document.getElementById('editId').value      = id;
  document.getElementById('editEnglish').value = english;
  document.getElementById('editReang').value   = reang;
  document.getElementById('editModal').classList.add('open');
}

function closeModal() {
  document.getElementById('editModal').classList.remove('open');
}

async function saveEdit() {
  const id      = document.getElementById('editId').value;
  const english = document.getElementById('editEnglish').value.trim();
  const reang   = document.getElementById('editReang').value.trim();

  if (!english || !reang) return;

  try {
    await fetch(`/update-word/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ english, reang }),
    });
    closeModal();
    loadWords(currentPage);
    loadStats();
  } catch { /* silent */ }
}

// Close modal on overlay click
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
});

// ─── Analytics View ───────────────────────────────────────────
async function loadAnalyticsView() {
  loadStats();
  chart2Instance = await loadChart('chart2', chart2Instance);
}

// ─── Helpers ──────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str).replace(/'/g, "\\'");
}

// ─── Init ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await loadStats();
  chart1Instance = await loadChart('chart', chart1Instance);
});
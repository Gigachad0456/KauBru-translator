// =============================================
//  Reang Translator — Contributor Dashboard
// =============================================

let currentPage   = 1;
let currentSearch = '';

// ─── View Switching ───────────────────────────────────────────
const VIEWS = ['dashboard', 'words'];

function showView(name) {
  VIEWS.forEach(v => {
    const el  = document.getElementById(`view-${v}`);
    const nav = document.getElementById(`nav-${v}`);
    if (el)  el.style.display  = v === name ? '' : 'none';
    if (nav) nav.classList.toggle('active', v === name);
  });

  // Topbar labels
  const titles = {
    dashboard: ['Dashboard',  'Overview of your translation data'],
    words:     ['My Dictionary', 'Browse and manage your words']
  };
  const [title, sub] = titles[name] || ['Contributor', ''];
  document.getElementById('topbar-title').textContent = title;
  document.getElementById('topbar-sub').textContent   = sub;

  if (name === 'words')     loadWords(currentPage);
}

// ─── Stats ────────────────────────────────────────────────────
async function loadStats() {
  try {
    // Basic stats can still be global, or we can just hide them for now.
    // Fetching the global stats just to populate for now
    const res  = await fetch('/admin/stats');
    const data = await res.json();

    setText('translations',   data.translations ?? '—');
    setText('words',          data.words         ?? '—');
    setText('today-count',    data.today         ?? '—');
  } catch { /* silent */ }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
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
      showStatus(data.message || '✓ Word submitted for approval!', false);
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
    const res  = await fetch(`/words?page=${page}&search=${encodeURIComponent(currentSearch)}&owner=me`);
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
        
        let statusBadge = word.is_approved 
          ? '<span style="color:var(--accent-light); font-size:12px; border:1px solid rgba(124,106,247,0.3); padding:2px 6px; border-radius:4px; margin-right:8px;">Approved</span>'
          : '<span style="color:#d4986a; font-size:12px; border:1px solid rgba(212,152,106,0.3); padding:2px 6px; border-radius:4px; margin-right:8px;">Pending</span>';

        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="color:var(--text-muted);font-size:12px;">${offset + i + 1}</td>
          <td style="font-weight:500;color:var(--text-primary);">${statusBadge}${escHtml(word.english)}</td>
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
});
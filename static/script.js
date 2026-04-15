// =============================================
//  Reang Translator — Main Page Script
// =============================================

function updateCharCount() {
  const textarea = document.getElementById('word');
  const count    = document.getElementById('charCount');
  if (count) count.textContent = `${textarea.value.length} / 500`;
}

async function translateWord() {
  const word      = document.getElementById('word').value.trim();
  const direction = document.getElementById('direction').value;
  const btn       = document.getElementById('translate-btn');
  const resultEl  = document.getElementById('result');
  const resultBox = document.getElementById('result-box');

  if (!word) {
    resultEl.textContent = 'Please enter a word or sentence.';
    resultEl.classList.remove('translated');
    resultBox.classList.remove('has-result');
    return;
  }

  // Loading state
  btn.classList.add('loading');

  let url = direction === 'en_to_re'
    ? `/translate/sentence?text=${encodeURIComponent(word)}`
    : `/translate/re_to_en?word=${encodeURIComponent(word)}`;

  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (data.error) {
      resultEl.textContent = data.error;
      resultEl.classList.remove('translated');
      resultBox.classList.remove('has-result');
    } else {
      const text = data.translated || data.english || data.reang || '—';
      resultEl.textContent = text;
      resultEl.classList.add('translated');
      resultBox.classList.add('has-result');
    }
  } catch (err) {
    resultEl.textContent = 'A network error occurred. Please try again.';
    resultEl.classList.remove('translated');
    resultBox.classList.remove('has-result');
  } finally {
    btn.classList.remove('loading');
  }
}

function copyResult() {
  const text = document.getElementById('result').textContent;
  if (!text || text.includes('appear here') || text.includes('error')) return;

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>`;
    setTimeout(() => {
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>`;
    }, 1800);
  });
}

// Allow Enter key to trigger translation (Shift+Enter for new line)
document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('word');
  if (textarea) {
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        translateWord();
      }
    });
  }
});
/* ============================================================
   ÁXICON · shared.js
   Ticker de mercado + Toggle PT/EN + Reveal + FAQ + Mobile menu
   ============================================================ */

// ----- TICKER DE MERCADO -----
async function loadMarketTicker() {
  const pairs = 'USD-BRL,EUR-BRL,GBP-BRL,BTC-USD,JPY-BRL,CHF-BRL,CAD-BRL,AUD-BRL';
  const url = `https://economia.awesomeapi.com.br/last/${pairs}`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('API error');
    const d = await r.json();
    setTickerValue('usd', d.USDBRL, 4);
    setTickerValue('eur', d.EURBRL, 4);
    setTickerValue('gbp', d.GBPBRL, 4);
    setTickerValue('btc', d.BTCUSD, 0);
    setTickerValue('jpy', d.JPYBRL, 4);
    setTickerValue('chf', d.CHFBRL, 4);
    setTickerValue('cad', d.CADBRL, 4);
    setTickerValue('aud', d.AUDBRL, 4);
    const upd = document.getElementById('news-upd');
    if (upd) {
      const now = new Date();
      upd.textContent = 'Atualizado às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
  } catch (e) {
    document.querySelectorAll('[id^="t-"]').forEach(s => s.textContent = '—');
  }
}

function setTickerValue(id, obj, decimals) {
  if (!obj) return;
  const bid = parseFloat(obj.bid).toFixed(decimals);
  const pct = parseFloat(obj.pctChange);
  const sign = pct >= 0 ? '▲' : '▼';
  const cls = pct >= 0 ? 'ticker-up' : 'ticker-down';
  const html = `<span style="margin-right:6px">${bid}</span><span class="${cls}">${sign} ${Math.abs(pct).toFixed(2)}%</span>`;
  const el = document.getElementById('t-' + id);
  if (el) el.innerHTML = html;
  const el2 = document.querySelector('.t-' + id + '2');
  if (el2) el2.innerHTML = html;
}

// ----- TOGGLE PT / EN (estrutura placeholder) -----
function setupLangToggle() {
  const toggle = document.querySelector('.lang-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', (e) => {
    const target = e.target;
    if (target.dataset && target.dataset.lang) {
      const lang = target.dataset.lang;
      document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
      toggle.querySelectorAll('[data-lang]').forEach(s => {
        s.classList.toggle('inactive', s.dataset.lang !== lang);
      });
      document.querySelectorAll('[data-pt]').forEach(el => {
        const txt = lang === 'en' ? el.dataset.en : el.dataset.pt;
        if (txt) el.innerHTML = txt;
      });
    }
  });
}

// ----- REVEAL ON SCROLL -----
function setupReveal() {
  if (!('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// ----- FAQ accordion -----
function setupFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', () => {
      item.classList.toggle('open');
    });
  });
}

// ----- INIT -----
document.addEventListener('DOMContentLoaded', () => {
  loadMarketTicker();
  setupLangToggle();
  setupReveal();
  setupFAQ();
  setInterval(loadMarketTicker, 5 * 60 * 1000);
});

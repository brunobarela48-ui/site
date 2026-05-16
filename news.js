/*
  Curadoria de notícias via Google Sheets.

  Como configurar (passo único, 5 min):
  1) Crie a planilha. Cabeçalhos exatos na linha 1 (minúsculos, sem acento exceto "fonte"):
       titulo | resumo | fonte | link | data | tag | imagem | destaque | publicar
     - titulo:   manchete (ex.: "Copom mantém Selic em 10,75%")
     - resumo:   1 a 3 frases curtas (ex.: "Decisão unânime...")
     - fonte:    nome do veículo (ex.: "Valor", "Reuters", "InfoMoney")
     - link:     URL absoluta do artigo na fonte
     - data:     YYYY-MM-DD ou YYYY-MM-DD HH:MM (ex.: 2026-05-16 14:32)
     - tag:      uma das: Macro, Câmbio, Crédito, Mercado de Capitais,
                 Agro, Cross-Border, Regulatório
     - imagem:   URL absoluta (opcional)
     - destaque: SIM/NAO — só a primeira "SIM" vira o card grande
     - publicar: SIM/NAO — só linhas SIM aparecem no site
  2) Arquivo → Compartilhar → Publicar na web → Aba "Notícias" → "Valores
     separados por vírgula (.csv)" → Publicar. Copie a URL gerada.
  3) Cole a URL em SHEET_CSV_URL abaixo (ou me envie que eu colo).
*/

(function () {
  const SHEET_CSV_URL = '';                  // ← preencher após publicar a planilha
  const REFRESH_MS = 0;                      // 0 = sem auto-refresh; ex.: 5*60*1000 para 5 min

  const $featured = document.getElementById('news-featured');
  const $grid     = document.getElementById('news-grid');
  const $filters  = document.getElementById('news-filters');
  const $status   = document.getElementById('news-status');
  if (!$grid || !$featured) return;

  const TAG_ORDER = ['Macro','Câmbio','Crédito','Mercado de Capitais','Agro','Cross-Border','Regulatório'];

  const state = { items: [], filter: 'todas' };

  // --- CSV mínimo RFC 4180-friendly ---
  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', i = 0, quoted = false;
    while (i < text.length) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i+1] === '"') { field += '"'; i += 2; continue; }
        if (c === '"') { quoted = false; i++; continue; }
        field += c; i++;
      } else {
        if (c === '"') { quoted = true; i++; continue; }
        if (c === ',') { row.push(field); field = ''; i++; continue; }
        if (c === '\r') { i++; continue; }
        if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
        field += c; i++;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function rowsToObjects(rows) {
    if (!rows.length) return [];
    const headers = rows[0].map(h => h.trim().toLowerCase());
    return rows.slice(1)
      .filter(r => r.some(c => c && c.trim()))
      .map(r => {
        const o = {};
        headers.forEach((h, i) => { o[h] = (r[i] || '').trim(); });
        return o;
      });
  }

  function isYes(v) { return /^(sim|s|yes|y|true|1|✔|x)$/i.test((v||'').trim()); }
  function esc(s)   { return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function formatDate(s) {
    if (!s) return '';
    const d = new Date(s.includes('T') || s.includes(':') ? s : s + 'T12:00:00');
    if (isNaN(d)) return esc(s);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yest = new Date(now); yest.setDate(yest.getDate()-1);
    const isYesterday = d.toDateString() === yest.toDateString();
    if (sameDay) return 'Hoje · ' + d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
    if (isYesterday) return 'Ontem';
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays > 0 && diffDays < 8) return diffDays + ' dias';
    return d.toLocaleDateString('pt-BR');
  }

  function setStatus(html) { if ($status) $status.innerHTML = html; }
  function clearStatus()   { if ($status) $status.innerHTML = ''; }

  function renderFeatured(item) {
    if (!item) { $featured.innerHTML = ''; return; }
    const imgStyle = item.imagem ? `style="background-image: url('${esc(item.imagem)}')"` : 'style="background: linear-gradient(135deg, var(--c-bg-dark) 0%, var(--c-primary) 100%);"';
    $featured.innerHTML =
      '<a href="' + esc(item.link) + '" class="featured-story" target="_blank" rel="noopener">' +
        '<div class="featured-story-img-wrap">' +
          '<div class="featured-story-img" ' + imgStyle + '></div>' +
          '<div class="featured-story-badges">' +
            '<span class="news-badge news-badge-featured">Em destaque</span>' +
            (item.tag ? '<span class="news-badge">' + esc(item.tag) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="featured-story-content">' +
          '<div>' +
            '<div class="featured-story-meta">' + formatDate(item.data) + ' · ' + esc(item.fonte || '') + '</div>' +
            '<h2>' + esc(item.titulo) + '</h2>' +
            '<p>' + esc(item.resumo || '') + '</p>' +
          '</div>' +
          '<div class="featured-story-foot">' +
            '<span>Ler na fonte →</span>' +
            '<span>' + esc(item.fonte || '') + '</span>' +
          '</div>' +
        '</div>' +
      '</a>';
  }

  function renderCard(item) {
    const imgStyle = item.imagem ? `style="background-image: url('${esc(item.imagem)}')"` : 'style="background: linear-gradient(135deg, var(--c-cream-2) 0%, rgba(204, 166, 127, 0.18) 100%);"';
    return (
      '<a href="' + esc(item.link) + '" class="news-card small" target="_blank" rel="noopener">' +
        '<div class="news-img-wrap small">' +
          '<div class="news-img" ' + imgStyle + '></div>' +
          (item.tag ? '<div class="news-badges"><span class="news-badge">' + esc(item.tag) + '</span></div>' : '') +
        '</div>' +
        '<div class="news-meta">' + formatDate(item.data) + ' · ' + esc(item.fonte || '') + '</div>' +
        '<h3>' + esc(item.titulo) + '</h3>' +
        '<p>' + esc(item.resumo || '') + '</p>' +
        '<div class="news-card-foot">Ler na fonte →</div>' +
      '</a>'
    );
  }

  function render() {
    const filter = state.filter;
    const visible = filter === 'todas'
      ? state.items.slice()
      : state.items.filter(i => (i.tag || '').toLowerCase() === filter.toLowerCase());

    const featured = visible.find(i => isYes(i.destaque)) || visible[0] || null;
    const grid = visible.filter(i => i !== featured);

    renderFeatured(featured);
    $grid.innerHTML = grid.map(renderCard).join('');

    if (!visible.length) {
      setStatus('<p class="news-empty">Nenhuma notícia ' + (filter === 'todas' ? 'publicada' : 'nesta categoria') + ' ainda.</p>');
    } else {
      clearStatus();
    }
  }

  function bindFilters() {
    if (!$filters) return;
    $filters.addEventListener('click', e => {
      const btn = e.target.closest('.news-filter');
      if (!btn) return;
      $filters.querySelectorAll('.news-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.dataset.filter || 'todas';
      render();
    });
  }

  async function load() {
    if (!SHEET_CSV_URL) {
      setStatus(
        '<div class="news-empty news-config-pending">' +
          '<p><strong>Curadoria pendente de configuração.</strong></p>' +
          '<p>Para ativar: crie a planilha conforme instruções no topo de <code>news.js</code> e me envie a URL do CSV publicado.</p>' +
        '</div>'
      );
      return;
    }
    try {
      const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      const rows = parseCSV(text);
      const items = rowsToObjects(rows)
        .filter(i => isYes(i.publicar))
        .filter(i => i.titulo && i.link)
        .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
      state.items = items;
      bindFilters();
      render();
    } catch (e) {
      console.error('[news] erro ao carregar', e);
      setStatus('<p class="news-empty">Não foi possível carregar a curadoria agora. Recarregue em instantes.</p>');
    }
  }

  load();
  if (REFRESH_MS > 0) setInterval(load, REFRESH_MS);
})();

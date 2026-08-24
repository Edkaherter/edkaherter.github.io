// Gerado automaticamente a partir de trf2-core.js — NÃO editar à mão.
(function (root) {
  // Núcleo analítico do Observatório TRF2 — funções puras de filtragem, agregação e insights.
  // Todos os cálculos derivam exclusivamente do JSON gerado a partir da planilha original.
  
  const LABELS = {
    dec: { mantem: 'Mantém o ato do INPI', anula: 'Anula o ato do INPI', outro: 'Outro resultado', ni: 'Não identificado' },
    mat: { mantido: 'Ato do INPI mantido', concedido: 'Registro concedido judicialmente', anulado: 'Registro anulado judicialmente', outro: 'Outro resultado', ni: 'Não identificado' },
    sent: { mantida: 'Sentença mantida', reformada: 'Sentença reformada', outro: 'Outro resultado', ni: 'Não identificado' },
    sf: { proc: 'Procedente — anulou o ato', improc: 'Improcedente — mantém o ato', ni: 'Não identificado' },
    ato: { indef: 'Indeferimento de registro', conc: 'Concessão de registro', outro: 'Outro ato', ni: 'Não identificado' }
  };
  
  const LABELS_EN = {
    dec: { mantem: 'Upholds the INPI decision', anula: 'Annuls the INPI decision', outro: 'Other outcome', ni: 'Not identified' },
    mat: { mantido: 'INPI decision upheld', concedido: 'Registration granted by the court', anulado: 'Registration annulled by the court', outro: 'Other outcome', ni: 'Not identified' },
    sent: { mantida: 'Trial ruling upheld', reformada: 'Trial ruling reversed', outro: 'Other outcome', ni: 'Not identified' },
    sf: { proc: 'Claim granted — act annulled', improc: 'Claim denied — act upheld', ni: 'Not identified' },
    ato: { indef: 'Refusal of registration', conc: 'Grant of registration', outro: 'Other act', ni: 'Not identified' }
  };
  
  const COLORS = {
    mantem: '#334155', anula: '#0082C8', outro: '#94A3B8', ni: '#CBD5E1',
    mantido: '#334155', concedido: '#3E6B48', anulado: '#BD3F32',
    mantida: '#334155', reformada: '#0082C8',
    proc: '#0082C8', improc: '#BD3F32',
    indef: '#BD3F32', conc: '#334155'
  };
  
  // Símbolos redundantes à cor (acessibilidade: informação não depende só do matiz)
  const GLYPHS = {
    mantem: '=', anula: '×', mantido: '=', concedido: '+', anulado: '−',
    mantida: '=', reformada: '⇄', proc: '×', improc: '=', indef: '▲', conc: '■', outro: '○', ni: '?'
  };
  
  const nfmt = new Intl.NumberFormat('pt-BR');
  const num = n => nfmt.format(n);
  const pct = (a, b) => (b ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format((a / b) * 100) + '%' : '—');
  const pctNum = (a, b) => (b ? (a / b) * 100 : 0);
  
  const EMPTY_FILTERS = {
    yFrom: '', yTo: '', ano: '', rel: '', dec: '', mat: '', ato: '', sent: '', etq: '', disp: '', q: ''
  };
  
  // Filtros multivalorados (menus suspensos com multisseleção). Vazio = sem restrição.
  /** Sentido da sentença de 1º grau, derivado do par (sentença mantida/reformada × decisão sobre o ato).
   *  Procedente: sentença mantida + ato anulado, ou sentença reformada + ato mantido.
   *  Improcedente: sentença mantida + ato mantido, ou sentença reformada + ato anulado. */
  function sentenceMerit(r) {
    if (r.sent !== 'mantida' && r.sent !== 'reformada') return 'ni';
    if (r.dec !== 'mantem' && r.dec !== 'anula') return 'ni';
    const anulou = r.dec === 'anula';
    return r.sent === 'mantida' ? (anulou ? 'proc' : 'improc') : (anulou ? 'improc' : 'proc');
  }
  
  /** Acrescenta o campo derivado `sf` a cada registro (executado uma vez, ao carregar). */
  function decorate(data) {
    data.recs.forEach(r => { r.sf = sentenceMerit(r); });
    return data;
  }
  
  const EMPTY_MULTI = { anos: [], rels: [], decs: [], atos: [], etqs: [], sents: [] };
  
  function activeCount(f) {
    const single = Object.keys(EMPTY_FILTERS).filter(k => f[k] !== '' && f[k] != null).length;
    const multi = Object.keys(EMPTY_MULTI).reduce((a, k) => a + ((f[k] && f[k].length) ? 1 : 0), 0);
    return single + multi;
  }
  
  /** Alterna um valor dentro de um filtro multivalorado. */
  function toggleIn(list, value) {
    const arr = (list || []).slice();
    const i = arr.findIndex(v => String(v) === String(value));
    if (i >= 0) arr.splice(i, 1); else arr.push(value);
    return arr;
  }
  
  /** Aplica todos os filtros por lógica "E" (interseção). */
  function applyFilters(data, f) {
    const q = (f.q || '').replace(/\s+/g, '').toLowerCase();
    const yFrom = f.yFrom ? +f.yFrom : null, yTo = f.yTo ? +f.yTo : null;
    const etqI = f.etq !== '' ? +f.etq : null, dispI = f.disp !== '' ? +f.disp : null, relI = f.rel !== '' ? +f.rel : null;
    const has = (arr, v) => !arr || arr.length === 0 || arr.some(x => String(x) === String(v));
    return data.recs.filter(r => {
      if (!has(f.anos, r.y)) return false;
      if (!has(f.rels, r.r)) return false;
      if (!has(f.decs, r.dec)) return false;
      if (!has(f.atos, r.ato)) return false;
      if (!has(f.sents, r.sf)) return false;
      if (f.etqs && f.etqs.length && !f.etqs.some(i => r.e.includes(+i))) return false;
      if (yFrom != null && (r.y == null || r.y < yFrom)) return false;
      if (yTo != null && (r.y == null || r.y > yTo)) return false;
      if (f.ano !== '' && String(r.y) !== String(f.ano)) return false;
      if (relI != null && r.r !== relI) return false;
      if (f.dec && r.dec !== f.dec) return false;
      if (f.mat && r.mat !== f.mat) return false;
      if (f.ato && r.ato !== f.ato) return false;
      if (f.sent && r.sent !== f.sent) return false;
      if (etqI != null && !r.e.includes(etqI)) return false;
      if (dispI != null && !r.l.includes(dispI)) return false;
      if (q && !r.n.replace(/\s+/g, '').toLowerCase().includes(q)) return false;
      return true;
    });
  }
  
  /** Contagem por campo categórico, na ordem canônica dos rótulos. */
  function countBy(recs, field, labels) {
    const LB = (labels || LABELS)[field];
    const order = Object.keys(LB);
    const c = {}; order.forEach(k => (c[k] = 0));
    recs.forEach(r => { c[r[field]] = (c[r[field]] || 0) + 1; });
    return order.filter(k => c[k] > 0).map(k => ({ key: k, label: LB[k], value: c[k], color: COLORS[k] || COLORS.outro, glyph: GLYPHS[k] }));
  }
  
  /** Série anual: total e cada resultado, em ordem cronológica. */
  function byYear(recs, years) {
    return years.map(y => {
      const rs = recs.filter(r => r.y === y);
      return {
        year: y, total: rs.length,
        mantido: rs.filter(r => r.dec === 'mantem').length,
        anulado_ato: rs.filter(r => r.dec === 'anula').length,
        concedido: rs.filter(r => r.mat === 'concedido').length,
        anulado_reg: rs.filter(r => r.mat === 'anulado').length
      };
    });
  }
  
  /** Ranking de valores multivalorados (etiquetas / dispositivos). */
  function rankMulti(recs, field, names, limit) {
    const c = new Map();
    recs.forEach(r => r[field].forEach(i => c.set(i, (c.get(i) || 0) + 1)));
    const arr = [...c.entries()].sort((a, b) => b[1] - a[1] || names[a[0]].localeCompare(names[b[0]], 'pt-BR'))
      .map(([i, v], k) => ({ idx: i, name: names[i], value: v, rank: k + 1, share: pctNum(v, recs.length) }));
    return limit ? arr.slice(0, limit) : arr;
  }
  
  /** Ranking de relatorias com taxas de manutenção e anulação. */
  function rankRelatoria(recs, names, sort) {
    const m = new Map();
    recs.forEach(r => {
      if (!m.has(r.r)) m.set(r.r, { idx: r.r, name: names[r.r], value: 0, mantem: 0, anula: 0 });
      const o = m.get(r.r); o.value++;
      if (r.dec === 'mantem') o.mantem++; else if (r.dec === 'anula') o.anula++;
    });
    const arr = [...m.values()].map(o => ({ ...o, pMantem: pctNum(o.mantem, o.value), pAnula: pctNum(o.anula, o.value) }));
    const cmp = { total: (a, b) => b.value - a.value, mantem: (a, b) => b.pMantem - a.pMantem || b.value - a.value, anula: (a, b) => b.pAnula - a.pAnula || b.value - a.value }[sort] || ((a, b) => b.value - a.value);
    return arr.sort(cmp);
  }
  
  function topOf(list) {
    return list.reduce((a, b) => (b.value > (a ? a.value : -1) ? b : a), null);
  }
  
  /** Ordenação do painel de processos. */
  function sortRecs(recs, mode) {
    const dateVal = d => { const p = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d || ''); return p ? +(p[3] + p[2] + p[1]) : 0; };
    const arr = recs.slice();
    const cmps = {
      'data-desc': (a, b) => dateVal(b.d) - dateVal(a.d),
      'data-asc': (a, b) => dateVal(a.d) - dateVal(b.d),
      'ano-desc': (a, b) => (b.y || 0) - (a.y || 0) || dateVal(b.d) - dateVal(a.d),
      'ano-asc': (a, b) => (a.y || 0) - (b.y || 0) || dateVal(a.d) - dateVal(b.d),
      'proc-asc': (a, b) => a.n.localeCompare(b.n, 'pt-BR'),
      'rel-asc': null
    };
    if (mode === 'rel-asc') return arr;
    return arr.sort(cmps[mode] || cmps['data-desc']);
  }
  
  /** Testes de consistência executados em tempo de execução (Testes 1 a 7 do protocolo). */
  function consistency(data, filtered) {
    const t = [];
    const sum = list => list.reduce((a, b) => a + b.value, 0);
    t.push({ id: 1, name: 'Total da base', ok: filtered.length <= data.recs.length && new Set(filtered.map(r => r.n)).size <= data.meta.unique, detail: `${num(filtered.length)} de ${num(data.recs.length)} registros` });
    t.push({ id: 2, name: 'Decisão sobre o ato do INPI', ok: sum(countBy(filtered, 'dec')) === filtered.length, detail: `soma = ${num(sum(countBy(filtered, 'dec')))}` });
    t.push({ id: 3, name: 'Resultado material', ok: sum(countBy(filtered, 'mat')) === filtered.length, detail: `soma = ${num(sum(countBy(filtered, 'mat')))}` });
    t.push({ id: 4, name: 'Sentença', ok: sum(countBy(filtered, 'sent')) === filtered.length, detail: `soma = ${num(sum(countBy(filtered, 'sent')))}` });
    const yr = byYear(filtered, data.meta.years);
    t.push({ id: 5, name: 'Evolução anual', ok: yr.reduce((a, b) => a + b.total, 0) === filtered.filter(r => r.y != null).length, detail: `${num(yr.reduce((a, b) => a + b.total, 0))} registros com ano válido` });
    const dupla = filtered.filter(r => r.mat === 'concedido' && r.ato !== 'indef').length + filtered.filter(r => r.mat === 'anulado' && r.ato !== 'conc').length;
    t.push({ id: 7, name: 'Regras materiais', ok: dupla === 0, detail: dupla === 0 ? 'nenhuma sobreposição de categorias' : `${dupla} divergências` });
    return t;
  }
  
  root.TRF2Core = { LABELS, LABELS_EN, COLORS, GLYPHS, num, pct, pctNum, EMPTY_FILTERS, sentenceMerit, decorate, EMPTY_MULTI, activeCount, toggleIn, applyFilters, countBy, byYear, rankMulti, rankRelatoria, topOf, sortRecs, consistency };
})(window);

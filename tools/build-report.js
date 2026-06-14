/**
 * Injeta no relatório (report/relatorio-tecnico.html) um Apêndice com os
 * resumos de execução do k6 (os "prints") extraídos de results/<teste>.txt.
 * Remove banner-logo e linhas de progresso, mantendo cenário + resumo final.
 * Idempotente: regenera a região entre os marcadores APENDICE.
 */
const fs = require('fs');

const TESTS = [
  { id: 'smoke', label: 'Smoke Test — GET /health' },
  { id: 'load', label: 'Teste de Carga — POST /checkout/simple' },
  { id: 'stress', label: 'Teste de Estresse — POST /checkout/crypto' },
  { id: 'spike', label: 'Teste de Pico — POST /checkout/simple' },
];

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function extractSummary(txt) {
  let s = txt;
  const i = s.indexOf('===== STDOUT');
  if (i >= 0) s = s.slice(i);
  const j = s.indexOf('===== STDERR');
  if (j >= 0) s = s.slice(0, j);
  let lines = s.split(/\r?\n/);
  lines.shift(); // remove a linha do marcador "===== STDOUT ..."
  const drop = (l) =>
    /^\s*running \(/.test(l) ||              // linhas de progresso
    /^\s*default\s+.*\[\s*\d+%/.test(l) ||   // barras de progresso
    /Grafana/.test(l) ||                     // logo (linha com texto)
    /^[\s/\\_|().'`‾-]+$/.test(l);           // arte do logo / linhas só de símbolos
  lines = lines.filter((l) => !drop(l));
  const out = [];
  for (let l of lines) {
    l = l.replace(/\s+$/, '');
    if (l.trim() === '' && (out.length === 0 || out[out.length - 1].trim() === '')) continue;
    out.push(l);
  }
  while (out.length && out[0].trim() === '') out.shift();
  while (out.length && out[out.length - 1].trim() === '') out.pop();
  return out.join('\n');
}

const preStyle =
  'font-family:Consolas,monospace;font-size:6.5pt;line-height:1.12;' +
  'white-space:pre-wrap;word-break:break-word;border:0.75pt solid #999;background:#f5f5f5;' +
  'padding:4pt 6pt;margin:2pt 0 1pt;';
const capStyle = 'font-size:10pt;text-align:center;margin:10pt 0 1pt;';
const srcStyle = 'font-size:9pt;text-align:left;margin:0 0 6pt;';

let blocks = '';
TESTS.forEach((t, n) => {
  const txt = fs.readFileSync(`results/${t.id}.txt`, 'utf8');
  const summary = esc(extractSummary(txt));
  blocks +=
    `\n  <div style="page-break-inside:avoid;">\n` +
    `    <div style="${capStyle}">Quadro ${n + 1} – Resumo de execução do k6 — ${t.label}</div>\n` +
    `    <pre style="${preStyle}">${summary}</pre>\n` +
    `    <div style="${srcStyle}">Fonte: Elaborado pelo autor (2026).</div>\n` +
    `  </div>\n`;
});

const apendice =
  `<!--APENDICE-INI-->\n` +
  `  <div style="page-break-before:always;"></div>\n` +
  `  <h2 class="sec">Apêndice A – Resumos de Execução do k6 (prints)</h2>\n` +
  `  <p>Reproduções das saídas de resumo geradas pelo k6 (via <i>handleSummary</i>) ao final de cada ` +
  `teste, evidenciando as métricas reais coletadas.</p>\n` +
  blocks +
  `<!--APENDICE-FIM-->\n`;

let html = fs.readFileSync('report/relatorio-tecnico.html', 'utf8');
// remove apêndice anterior, se houver (idempotência)
html = html.replace(/<!--APENDICE-INI-->[\s\S]*<!--APENDICE-FIM-->\s*/, '');
html = html.replace('</body>', apendice + '\n</body>');
fs.writeFileSync('report/relatorio-tecnico.html', html);
console.log('Apêndice com os 4 prints do k6 injetado em report/relatorio-tecnico.html');

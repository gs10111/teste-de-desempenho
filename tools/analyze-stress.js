/**
 * Analisa o JSON bruto do k6 (--out json) do teste de estresse.
 * Agrega por janelas de tempo e identifica o "breaking point":
 * a primeira janela em que a taxa de erro >= 1% OU o p95 >= 1000ms.
 * Uso: node analyze-stress.js <arquivo.json> [bucketSegundos]
 */
const fs = require('fs');
const readline = require('readline');

const file = process.argv[2];
const BUCKET = Number(process.argv[3] || 15); // segundos

const points = { dur: [], fail: [], vus: [] };

const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });

rl.on('line', (line) => {
  if (!line) return;
  let o;
  try { o = JSON.parse(line); } catch { return; }
  if (o.type !== 'Point' || !o.data) return;
  const t = new Date(o.data.time).getTime() / 1000;
  const v = o.data.value;
  if (o.metric === 'http_req_duration') points.dur.push([t, v]);
  else if (o.metric === 'http_req_failed') points.fail.push([t, v]);
  else if (o.metric === 'vus') points.vus.push([t, v]);
});

function pct(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.floor((p / 100) * s.length));
  return s[idx];
}

rl.on('close', () => {
  let t0 = Infinity;
  for (const arr of [points.dur, points.fail, points.vus])
    for (const [t] of arr) if (t < t0) t0 = t;

  const buckets = new Map();
  const B = (i) => {
    if (!buckets.has(i)) buckets.set(i, { dur: [], fail: [], vus: 0 });
    return buckets.get(i);
  };
  for (const [t, v] of points.dur) B(Math.floor((t - t0) / BUCKET)).dur.push(v);
  for (const [t, v] of points.fail) B(Math.floor((t - t0) / BUCKET)).fail.push(v);
  for (const [t, v] of points.vus) { const b = B(Math.floor((t - t0) / BUCKET)); if (v > b.vus) b.vus = v; }

  const idxs = [...buckets.keys()].sort((a, b) => a - b);

  const header = ['janela(s)', 'VUs_max', 'reqs', 'erro%', 'med_ms', 'p95_ms', 'p99_ms'];
  const rows = [header.join('\t')];
  const series = [];
  for (const i of idxs) {
    const b = buckets.get(i);
    const reqs = b.dur.length;
    const errRate = b.fail.length ? (100 * b.fail.reduce((a, c) => a + c, 0) / b.fail.length) : 0;
    const med = Math.round(pct(b.dur, 50));
    const p95 = Math.round(pct(b.dur, 95));
    const p99 = Math.round(pct(b.dur, 99));
    const win = `${i * BUCKET}-${(i + 1) * BUCKET}`;
    rows.push([win, b.vus, reqs, errRate.toFixed(1), med, p95, p99].join('\t'));
    series.push({ win, vus: b.vus, reqs, errRate, p95 });
  }

  const first = (cond) => series.find((s) => s.reqs > 0 && cond(s));
  const mLatency = first((s) => s.p95 >= 500);   // estoura SLA de latencia (500ms)
  const mErr1 = first((s) => s.errRate >= 1);     // primeiros erros/timeouts
  const mErr50 = first((s) => s.errRate >= 50);   // degradacao severa
  const mErr100 = first((s) => s.errRate >= 99.9);// colapso total

  const line = (label, m) =>
    m ? `${label}: ~${m.vus} VUs (janela ${m.win}s | erro ${m.errRate.toFixed(1)}% | p95 ${m.p95}ms)\n`
      : `${label}: nao atingido\n`;

  let out = rows.join('\n') + '\n';
  out += '\n=============== ANALISE DO BREAKING POINT (/checkout/crypto) ===============\n';
  out += line('Latencia estoura SLA (p95>=500ms)', mLatency);
  out += line('Comeca a FALHAR (erro>=1%)        ', mErr1);
  out += line('Degradacao severa (erro>=50%)     ', mErr50);
  out += line('Colapso total (erro~100%)         ', mErr100);
  out += '===========================================================================\n';

  console.log(out);
});

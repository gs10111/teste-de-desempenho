/**
 * Consolida as métricas dos *-summary.json do k6 num único objeto,
 * usado como fonte de dados (real) para o relatório.
 */
const fs = require('fs');
const tests = ['smoke', 'load', 'stress', 'spike'];
const out = {};
for (const t of tests) {
  const d = JSON.parse(fs.readFileSync(`results/${t}-summary.json`, 'utf8'));
  const M = d.metrics;
  const dur = M.http_req_duration.values;
  const f = M.http_req_failed.values;       // rate, passes(=falhas), fails(=ok)
  const reqs = M.http_reqs.values;
  const checks = M.checks ? M.checks.values : { rate: null, passes: 0, fails: 0 };
  const vusMax = (M.vus_max && M.vus_max.values.max) || (M.vus && M.vus.values.max) || null;
  const thresholds = {};
  for (const [k, v] of Object.entries(M))
    if (v.thresholds) for (const [expr, o] of Object.entries(v.thresholds)) thresholds[`${k}: ${expr}`] = o.ok;
  out[t] = {
    durationMs: d.state.testRunDurationMs,
    reqs: reqs.count, rps: reqs.rate,
    errPct: f.rate * 100, errCount: f.passes, okCount: f.fails,
    avg: dur.avg, med: dur.med, p90: dur['p(90)'], p95: dur['p(95)'], p99: dur['p(99)'], max: dur.max,
    checksPct: checks.rate == null ? null : checks.rate * 100, checksPass: checks.passes, checksFail: checks.fails,
    vusMax, thresholds,
  };
}
fs.writeFileSync('results/metrics-consolidated.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

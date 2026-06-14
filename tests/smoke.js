// =============================================================
// SMOKE TEST — Etapa 1
// Objetivo: verificar se a API está de pé antes dos testes pesados.
// Alvo: GET /health
// Carga: 1 VU por 30s
// Critério: 100% de sucesso (http_req_failed == 0)
// =============================================================
import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 1,
  duration: '30s',
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    // 100% de sucesso exigido
    http_req_failed: ['rate==0'],
    checks: ['rate==1.0'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    'status é 200': (r) => r.status === 200,
    'corpo status=UP': (r) => r.json('status') === 'UP',
  });
  sleep(1);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: !__ENV.NO_COLOR }),
    'results/smoke-summary.json': JSON.stringify(data, null, 2),
  };
}

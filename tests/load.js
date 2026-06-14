// =============================================================
// LOAD TEST — Etapa 2
// Cenário: promoção do Marketing, pico esperado de 50 usuários.
// Alvo: POST /checkout/simple (I/O bound)
// Stages: ramp-up 0->50 em 1m | platô 50 por 2m | ramp-down 50->0 em 30s
// SLA (thresholds): p95 < 500ms e taxa de erro < 1%
// =============================================================
import http from 'k6/http';
import { check } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // ramp-up
    { duration: '2m', target: 50 },  // platô
    { duration: '30s', target: 0 },  // ramp-down
  ],
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    http_req_duration: ['p(95)<500'], // SLA de latência
    http_req_failed: ['rate<0.01'],   // SLA de erro (< 1%)
  },
};

const payload = JSON.stringify({ item: 'produto-promocao', quantidade: 1, valor: 199.9 });
const params = { headers: { 'Content-Type': 'application/json' } };

export default function () {
  const res = http.post(`${BASE_URL}/checkout/simple`, payload, params);
  check(res, {
    'status é 201': (r) => r.status === 201,
    'status=APPROVED': (r) => r.json('status') === 'APPROVED',
  });
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: !__ENV.NO_COLOR }),
    'results/load-summary.json': JSON.stringify(data, null, 2),
  };
}

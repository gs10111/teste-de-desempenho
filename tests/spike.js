// =============================================================
// SPIKE TEST — Etapa 4
// Cenário: "Flash Sale" (abertura de venda de ingressos).
// Alvo: POST /checkout/simple (I/O bound)
// Stages:
//   - carga baixa: 10 VUs por 30s
//   - salto imediato: ->300 VUs em 10s
//   - manter: 300 VUs por 1m
//   - queda imediata: ->10 VUs em 10s
// =============================================================
import http from 'k6/http';
import { check } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // carga baixa
    { duration: '10s', target: 300 }, // salto imediato (spike)
    { duration: '1m', target: 300 },  // manter o pico
    { duration: '10s', target: 10 },  // queda imediata
  ],
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    // Informativos: avaliam como a API se comporta durante/depois do pico
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

const payload = JSON.stringify({ item: 'ingresso-flash-sale', quantidade: 2 });
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
    'results/spike-summary.json': JSON.stringify(data, null, 2),
  };
}

// =============================================================
// STRESS TEST — Etapa 3
// Pergunta: quantos usuários fazendo cálculo de cripto (CPU heavy)
//           derrubam o servidor?
// Alvo: POST /checkout/crypto (CPU bound — bcrypt bloqueia o event loop)
// Stages: 0->200 em 2m | 200->500 em 2m | 500->1000 em 2m
// Foco: achar o Breaking Point (latência explode / timeouts / erros).
//
// Os thresholds abaixo são INFORMATIVOS: espera-se que sejam violados.
// A violação é justamente a evidência do ponto de ruptura. A análise
// fina (em qual nº de VUs degradou) sai da série temporal exportada
// com --out json (ver results/stress-raw.json).
// =============================================================
import http from 'k6/http';
import { check } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '2m', target: 200 },
    { duration: '2m', target: 500 },
    { duration: '2m', target: 1000 },
  ],
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    // Marcadores de degradação (informativos, não abortam o teste)
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

const payload = JSON.stringify({ item: 'transacao-segura', quantidade: 1 });
const params = {
  headers: { 'Content-Type': 'application/json' },
  // timeout maior para capturar requisições que ficam presas na fila
  timeout: '60s',
};

export default function () {
  const res = http.post(`${BASE_URL}/checkout/crypto`, payload, params);
  check(res, {
    'status é 201': (r) => r.status === 201,
    'status=SECURE_TRANSACTION': (r) => r.json('status') === 'SECURE_TRANSACTION',
  });
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: !__ENV.NO_COLOR }),
    'results/stress-summary.json': JSON.stringify(data, null, 2),
  };
}

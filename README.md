# Engenharia de Desempenho — API de Checkout + Suíte de Testes k6

Este repositório contém a **API de Checkout (SUT)** e a **suíte de testes de performance
(k6)** criada para revelar os limites da aplicação em cenários de **Carga**, **Estresse**
e **Pico**.

> A API (SUT) **não foi alterada** — foi testada como caixa-preta.

## Estrutura

```
.
├── atividade/              # API (SUT) — NÃO ALTERAR
│   └── src/server.js       #   GET /health · POST /checkout/simple · POST /checkout/crypto
├── exemplo/                # Exemplos do repositório base
├── tests/                  # Scripts k6 (entregável principal)
│   ├── smoke.js            # 1 VU x 30s  -> GET  /health
│   ├── load.js             # 0->50->0 VUs -> POST /checkout/simple  (SLA: p95<500ms, erro<1%)
│   ├── stress.js           # 0->200->500->1000 VUs -> POST /checkout/crypto (breaking point)
│   └── spike.js            # 10->300->10 VUs -> POST /checkout/simple (flash sale)
├── results/                # Evidências: <teste>.txt, <teste>-summary.json, stress-breakpoint.txt
├── report/
│   ├── relatorio-tecnico.html
│   └── relatorio-tecnico.pdf  # Relatório técnico (1 página, modelo ABNT)
└── tools/
    ├── analyze-stress.js   # Agrega o JSON do stress e localiza o breaking point
    └── extract-metrics.js  # Consolida os *-summary.json para o relatório
```

## Pré-requisitos

- [k6](https://k6.io) (testado com **v2.0.0**)
- Node.js

## Como rodar

1. **Subir a API (SUT):**
   ```bash
   cd atividade
   npm install && npm start      # API em http://localhost:3000
   ```

2. **Executar os testes** (de volta na raiz do repositório):
   ```bash
   k6 run tests/smoke.js
   k6 run tests/load.js
   k6 run --out json=results/stress-raw.json tests/stress.js
   k6 run tests/spike.js
   ```
   Cada script grava um resumo em `results/<teste>-summary.json` via `handleSummary()`.
   O `BASE_URL` é configurável: `k6 run -e BASE_URL=http://host:porta tests/load.js`.

## Resumo dos resultados (coletados em 14/06/2026)

| Teste  | Endpoint               | VUs máx | p95       | p99       | Throughput | Erro    |
|--------|------------------------|---------|-----------|-----------|------------|---------|
| Smoke  | GET /health            | 1       | 14,98 ms  | 63,18 ms  | 0,98 req/s | 0,00%   |
| Load   | POST /checkout/simple  | 50      | 308,53 ms | 370,42 ms | 177,3 req/s| 0,00%   |
| Stress | POST /checkout/crypto  | 1000    | 60.020 ms | 60.053 ms | 15,4 req/s | 81,66%  |
| Spike  | POST /checkout/simple  | 300     | 483,80 ms | 891,91 ms | 685,3 req/s| 0,00%   |

- **I/O (`/checkout/simple`)**: escala bem — sustenta ≥ 300 VUs com p95 < 500 ms e 0% de erro.
- **CPU (`/checkout/crypto`)**: o `bcrypt` síncrono bloqueia o event loop. Começa a falhar em
  **~74 VUs** e entra em **colapso total (~100% de falha) em ~386 VUs**.

Detalhes no [relatório técnico](report/relatorio-tecnico.pdf).

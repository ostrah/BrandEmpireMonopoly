# План миграции на GCP: прод-инфраструктура для «Биржи 1929»

Цель: перенести игру с Hetzner-VPS на GCP так, как делают в проде — GKE со спот-нодами,
IaC на Terraform+Terragrunt, мониторинг Prometheus+Grafana, CI/CD, свой домен. Плюс
дорожная карта MCP-сервера. Это одновременно и хостинг, и учебный полигон по K8s
(логичное продолжение локального kind-кластера).

---

## 0. Честная рамка

- Приложению (Node, ноль зависимостей, ~50МБ RAM) GKE не нужен — Hetzner за €4.5 его
  тянет. Ценность переезда — **прод-паттерны и опыт**: IaC, спот-экономика, observability,
  GitOps. Это нормальная цель, просто называем вещи своими именами.
- **$300 стартовых кредитов GCP на 90 дней** покрывают первые месяцы экспериментов.
- Hetzner не выключаем до полного cutover — он остаётся бесплатной страховкой.

## 1. Целевая архитектура

```
Пользователь → Cloudflare (Free, DNS+CDN+DDoS)      [вариант A]
             → GCP HTTPS LB + ManagedCertificate     [вариант B, каноничный]
                    ↓
        GKE Standard, 1 зональный кластер (europe-west3, Франкфурт — близко к РФ/EU)
        ├── nodepool spot: 1× e2-medium (2vCPU/4GB) — приложение + мониторинг
        ├── (опция) nodepool on-demand: 1× e2-small — «якорь» для критичных подов
        ├── Deployment monopoly (1 реплика: состояние партий в памяти)
        │     ├── PVC 10GB (users.json), env DATA_DIR
        │     ├── /healthz, /metrics (руками, zero-dep)
        │     └── graceful SIGTERM (уже есть) + PodDisruptionBudget
        ├── ingress-nginx + cert-manager (вариант A) | GKE Ingress (вариант B)
        └── kube-prometheus-stack: Prometheus (урезанный) + Grafana + Alertmanager→Telegram
```

Почему 1 реплика: партии живут в памяти процесса. Горизонтальное масштабирование
потребует внешнего стора (Redis) — это отдельный этап (фаза 7), не блокер переезда.

### Спот-ноды и наша statefulness
- Вытеснение спота = 30 секунд на выселение → SIGTERM уже сбрасывает users.json на PVC;
  идущие партии теряются (как при рестарте сейчас). Смягчение в фазе 7: периодический
  снапшот партий на диск и восстановление.
- GKE сам пересоздаёт вытесненную спот-ноду (обычно 1–3 мин простоя). Для пет-прода ок;
  «якорный» on-demand пул убирает даже это (вариант B+).

## 2. Репозиторий IaC (Terraform + Terragrunt)

```
infra/
├── terragrunt.hcl              # remote state: GCS bucket + versioning, project vars
├── modules/
│   ├── project-base/           # APIs, budget alert, Artifact Registry
│   ├── network/                # VPC, subnet, Cloud NAT (для приватных нод)
│   ├── gke/                    # кластер + пулы (spot/on-demand), Workload Identity
│   ├── dns/                    # зона + записи (или Cloudflare provider)
│   └── monitoring/             # helm_release: kube-prometheus-stack, дашборды из json
└── live/
    └── prod/
        ├── project-base/terragrunt.hcl
        ├── network/terragrunt.hcl
        ├── gke/terragrunt.hcl
        ├── dns/terragrunt.hcl
        └── monitoring/terragrunt.hcl
```

Принципы: state в GCS с версионированием; никаких ключей сервис-аккаунтов — GitHub
Actions ходит в GCP через **Workload Identity Federation**; `terragrunt run-all plan`
в PR, apply — вручную или по merge в main.

## 3. Изменения в приложении (маленькие)

| Что | Зачем |
|---|---|
| `Dockerfile` (node:22-slim → distroless) | контейнеризация, образ ~80МБ |
| `DATA_DIR` из env | users.json на PVC |
| `GET /healthz` → 200 | liveness/readiness probes |
| `GET /metrics` (Prometheus text, руками) | игровые метрики: sse_connections, rooms_active, games_playing, players_online, http_request_duration (histogram), engine_actions_total |
| `PORT`/`HOST` из env | уже сделано ✅ |
| graceful SIGTERM | уже сделано ✅ |
| доверие X-Forwarded-* | уже сделано ✅ |

## 4. CI/CD (GitHub Actions в BrandEmpireMonopoly)

1. `test.yml` — на PR: `node --test` (41 тест) + `sim.js 200` + `--check` всех файлов.
2. `deploy.yml` — на push в main: build → push в Artifact Registry (`:sha`) →
   `kubectl set image` / helm upgrade → rollout status. Аутентификация через WIF.
3. (опция) `infra.yml` — terragrunt plan в PR с комментарием диффа.

## 5. Мониторинг и алерты

- **kube-prometheus-stack** (helm) с урезанными ресурсами: Prometheus 512Mi/retention 7d,
  Grafana 128Mi. Влезает на e2-medium рядом с игрой.
- Дашборды: (1) готовые node/pod; (2) **свой «Биржа 1929»**: игроки онлайн, комнаты,
  партии, длительность партий, SSE-коннекты, p95 latency, вытеснения ноды.
- Alertmanager → Telegram-бот: под не поднялся 5 мин, 5xx>1%, диск PVC>80%,
  сертификат истекает, spot-вытеснение.
- Внешний uptime-чек: Cloud Monitoring uptime check (бесплатного хватает) или UptimeRobot.
- Логи: stdout → Cloud Logging (50GiB/мес бесплатно). Loki — потом, если захочется.

## 6. Домен и TLS

- Купить домен у Porkbun/Namecheap (Cloud Domains переехал в Squarespace — брать напрямую
  у регистратора дешевле): `.com` ~$11–13/год, `.dev` ~$12/год, `.xyz` ~$2–13/год.
  Пример: `brandempire.dev` / `birzha1929.com`.
- Вариант A: NS на Cloudflare Free → проксирование, бесплатный edge-TLS, скрытие IP;
  origin-TLS через cert-manager (Let's Encrypt, DNS-01 через CF API).
  SSE через CF работает (наш heartbeat 25с < таймаута CF 100с).
- Вариант B: Cloud DNS ($0.20/мес) + GKE Ingress + ManagedCertificate.
- Поддомены: `play.` (игра), `grafana.` (за oauth2-proxy или CF Access), `mcp.` (фаза 8).

## 7. Устойчивость партий к вытеснению (после переезда)

- Снапшот `room.game` в JSON на PVC каждые N секунд + при SIGTERM; восстановление комнат
  при старте. Даёт переживание вытеснений почти бесшовно (клиент и так реконнектится).
- Дальше по желанию: Redis (Memorystore дорог — лучше свой pod с PVC) и 2+ реплики.

## 8. MCP-сервер (дорожная карта)

Два сервера, оба — тонкие обёртки над существующим HTTP API (zero-dep, streamable HTTP):

1. **game-mcp** (`mcp.<домен>`): tools `create_room`, `add_bot`, `start_game`,
   `get_state`, `act` (roll/buy/…), `list_rooms`, `player_stats`. Даёт Claude играть в
   Монополию, гонять смоук-тесты после деплоя, устраивать турниры ботов.
2. **ops-mcp**: tools `grafana_query` (PromQL), `deploy_status`, `recent_errors`,
   `restart_app`. Авторизация: bearer-токен, только чтение по умолчанию.

Оценка: game-mcp ~вечер работы (у нас уже чистый REST + SSE).

## 9. Денежный план (месяц, europe-west3, июль 2026, курс цен GCP может плыть ±20%)

| Статья | A «Бюджетный лаб» | B «Каноничный прод» | B+ «С якорем» |
|---|---|---|---|
| GKE management (1 зональный) | $0 (free tier $74.40) | $0 | $0 |
| Нода spot e2-medium (2vCPU/4GB) | ~$8–10 | ~$8–10 | ~$8–10 |
| Нода on-demand e2-small (якорь) | — | — | ~$12.2 |
| Диски нод + PVC (30–40GB) | ~$2–3 | ~$2–3 | ~$3–4 |
| Вход: Cloudflare Free + static IP | ~$3.7 | — | — |
| Вход: GCP HTTPS LB | — | ~$18.3 + трафик | ~$18.3 |
| Cloud DNS / CF DNS | $0 (CF) | $0.2 | $0.2 |
| Egress (~десятки GB) | ~$0–2 | ~$0–2 | ~$0–2 |
| Artifact Registry, GCS state | ~$0.1 | ~$0.1 | ~$0.1 |
| **Итого/мес** | **≈ $14–19** | **≈ $29–34** | **≈ $42–48** |
| Домен (раз в год) | +$11–13/год (~$1/мес) | то же | то же |

Для сравнения: текущий Hetzner ≈ €4.5/мес. Первые ~3 месяца любой вариант фактически
бесплатен за счёт $300 trial-кредитов. **Рекомендация: стартовать с A** (все прод-паттерны
на месте, кроме GCP LB — его добавить позже одним terragrunt-модулем, если захочется
каноничности), поставить **budget alert на $25/мес** в первый же день.

## 10. Фазы и порядок (по вечерам)

| # | Фаза | Результат | Оценка |
|---|---|---|---|
| 0 | Подготовка приложения | Dockerfile, /healthz, /metrics, DATA_DIR | 1 вечер |
| 1 | Bootstrap GCP | проект, billing+budget alert, state-bucket, WIF | 0.5 |
| 2 | Terragrunt: network+GKE | кластер со спот-пулом поднят | 1–1.5 |
| 3 | Деплой игры + домен + TLS | игра на `play.<домен>` | 1 |
| 4 | Мониторинг | Grafana с игровым дашбордом, алерты в TG | 1 |
| 5 | CI/CD | push в main → тесты → выкатка | 0.5–1 |
| 6 | Cutover | трафик на GCP, Hetzner в режиме страховки месяц | 0.5 |
| 7 | Снапшоты партий | партии переживают вытеснение спота | 1 |
| 8 | game-mcp | Claude играет в Монополию через MCP | 1 |

Итого: ~7–8 вечеров до полного переезда с мониторингом и CI/CD.

## 11. Риски

| Риск | Смягчение |
|---|---|
| Вытеснение спота посреди партии | 30с graceful + фаза 7 (снапшоты); «якорный» пул в B+ |
| Забытый ресурс жрёт деньги | budget alert $25 + `terragrunt destroy` для всего |
| LE rate-limit на новом домене | cert-manager staging → prod; DNS-01 |
| GKE сложнее systemd | это и есть цель 🙂 + kind-кластер уже освоен |
| CF Free и SSE | heartbeat 25с уже есть; при проблемах — вариант B |

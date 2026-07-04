#!/usr/bin/env bash
# Деплой «Монополии · Биржа 1929» на тот же VPS, что и tandem — БЕЗ конфликта.
# Своя ветка: поддомен monopoly.159-69-153-135.sslip.io -> 127.0.0.1:3200,
# свой systemd-сервис, свой пользователь. tandem (корневой домен, :3000) не трогаем.
# Запускать от root. Код должен лежать в /tmp/monopoly-upload.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

IP="159.69.153.135"
ROOT_DOMAIN="159-69-153-135.sslip.io"          # это tandem — не трогаем
DOMAIN="monopoly.$ROOT_DOMAIN"                  # наш поддомен
EMAIL="lksuhodolsky@gmail.com"
APP="/opt/monopoly"
PORT=3200

echo "=== [1/6] Node.js ==="
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
node -v

echo "=== [2/6] Код приложения (ноль npm-зависимостей) ==="
mkdir -p "$APP"
if [ -d /tmp/monopoly-upload ]; then
  # чистим старый код (кроме данных), заливаем свежий
  find "$APP" -mindepth 1 -maxdepth 1 ! -name data -exec rm -rf {} + 2>/dev/null || true
  cp -a /tmp/monopoly-upload/. "$APP"/
  rm -rf /tmp/monopoly-upload
fi
cd "$APP"

echo "=== [3/6] Пользователь и данные ==="
id -u monopoly >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin -d "$APP" monopoly
mkdir -p "$APP/data"
chown -R monopoly:monopoly "$APP"

echo "=== [4/6] systemd (порт $PORT, bind 127.0.0.1) ==="
cat > /etc/systemd/system/monopoly.service <<UNIT
[Unit]
Description=МОНОПОЛИЯ · Биржа 1929 (monopoly)
After=network.target

[Service]
User=monopoly
Group=monopoly
WorkingDirectory=$APP
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=$PORT
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
KillSignal=SIGTERM
TimeoutStopSec=15
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=$APP/data

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable monopoly >/dev/null 2>&1
systemctl restart monopoly
sleep 2
echo "monopoly: $(systemctl is-active monopoly)"
curl -fsS "http://127.0.0.1:$PORT/api/me" -o /dev/null -w "  локальный /api/me -> HTTP %{http_code}\n" || true

echo "=== [5/6] Caddy: добавляю поддомен, tandem не трогаю ==="
cp -a /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.bak.$(date +%s)" 2>/dev/null || true
# Полностью пересобираем Caddyfile из известного состояния: оба сайта.
cat > /etc/caddy/Caddyfile <<CADDY
{
	email $EMAIL
}

$ROOT_DOMAIN {
	encode gzip
	reverse_proxy 127.0.0.1:3000
}

$DOMAIN {
	encode gzip
	reverse_proxy 127.0.0.1:$PORT
}

http://$IP {
	redir https://$ROOT_DOMAIN{uri} permanent
}
CADDY
caddy validate --config /etc/caddy/Caddyfile 2>&1 | tail -2 || true
systemctl reload caddy || systemctl restart caddy
sleep 1
echo "caddy: $(systemctl is-active caddy)"

# HTTP3/QUIC — без 443/udp браузеры иногда ловят "Failed to fetch"
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q 'Status: active'; then
  ufw allow 443/udp >/dev/null 2>&1 || true
fi

echo "=== [6/6] Жду HTTPS-сертификат для поддомена ==="
ok=0
for i in $(seq 1 18); do
  sleep 5
  if curl -fsS -m 10 "https://$DOMAIN/api/me" -o /dev/null 2>&1 || \
     curl -fsS -m 10 "https://$DOMAIN/" -o /dev/null 2>&1; then ok=1; break; fi
  echo "  ...жду сертификат ($i/18)"
done
echo "=== ИТОГ ==="
if [ "$ok" = 1 ]; then
  echo "МОНОПОЛИЯ РАБОТАЕТ:  https://$DOMAIN"
else
  echo "HTTPS пока не отвечает. Лог Caddy:"
  journalctl -u caddy --no-pager -n 20
fi
echo "tandem (не тронут): https://$ROOT_DOMAIN  [$(systemctl is-active tandem)]"

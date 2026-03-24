#!/usr/bin/env bash

set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-aliyun-todo}"
REMOTE_DIR="${REMOTE_DIR:-/opt/todo-app}"
REMOTE_DATA_DIR="${REMOTE_DATA_DIR:-/var/lib/todo-app}"
SERVICE_NAME="${SERVICE_NAME:-todo-app}"
PORT="${PORT:-80}"

echo "Configuring and restarting ${SERVICE_NAME} on ${REMOTE_HOST}"

ssh "${REMOTE_HOST}" "sudo env REMOTE_DIR='${REMOTE_DIR}' REMOTE_DATA_DIR='${REMOTE_DATA_DIR}' SERVICE_NAME='${SERVICE_NAME}' PORT='${PORT}' bash -s" <<'EOF'
set -euo pipefail

mkdir -p "${REMOTE_DATA_DIR}"
if [ -f "${REMOTE_DIR}/data/todo.db" ] && [ ! -f "${REMOTE_DATA_DIR}/todo.db" ]; then
  cp "${REMOTE_DIR}/data/todo.db" "${REMOTE_DATA_DIR}/todo.db"
fi

cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<SERVICE_EOF
[Unit]
Description=Todo App
After=network.target

[Service]
Type=simple
WorkingDirectory=${REMOTE_DIR}
ExecStart=/usr/bin/node server/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=${PORT}
Environment=TODO_APP_DATA_DIR=${REMOTE_DATA_DIR}

[Install]
WantedBy=multi-user.target
SERVICE_EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}" >/dev/null
systemctl restart "${SERVICE_NAME}"
systemctl is-active --quiet "${SERVICE_NAME}"
if command -v curl >/dev/null 2>&1; then
  healthy=0
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
      healthy=1
      break
    fi
    sleep 1
  done
  if [ "${healthy}" -ne 1 ]; then
    echo "Health check failed for http://127.0.0.1:${PORT}/" >&2
    exit 1
  fi
fi
systemctl --no-pager --full status "${SERVICE_NAME}" | sed -n '1,12p'
EOF

echo "Restart complete"

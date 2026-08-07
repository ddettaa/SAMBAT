#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
sudo install -m 0644 "$ROOT/deploy/systemd/sambat-ai.service" /etc/systemd/system/
sudo install -m 0644 "$ROOT/deploy/systemd/sambat-api.service" /etc/systemd/system/
sudo install -m 0644 "$ROOT/deploy/systemd/sambat-worker.service" /etc/systemd/system/
sudo install -m 0644 "$ROOT/deploy/systemd/sambat-worker.timer" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now sambat-ai.service sambat-api.service sambat-worker.timer
sudo systemctl --no-pager --full status sambat-ai.service sambat-api.service sambat-worker.timer

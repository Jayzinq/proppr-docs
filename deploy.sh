#!/bin/bash
set -euo pipefail

SERVER_IP="46.224.85.158"
LOCAL_DIR="/Users/zinq/PycharmProjects/Cerebro/proppr-docs"
REMOTE_DIR="/opt/proppr-docs"

echo "Deploying proppr-docs to $SERVER_IP..."

rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' "$LOCAL_DIR/" "root@$SERVER_IP:$REMOTE_DIR/"

echo "Rebuilding and restarting on server..."
# -e inside the heredoc makes the remote shell abort on the first failure, and the
# ssh exit code propagates here. Combined with the outer `set -e`, a failed server
# build (or restart) now stops the script instead of falsely reporting success.
ssh "root@$SERVER_IP" << EOF
    set -e
    cd $REMOTE_DIR
    npm install
    rm -rf .next
    npm run build
    python3 -c "from pathlib import Path
for p in Path('.next').rglob('*'):
    if not p.is_file():
        continue
    try:
        text = p.read_text(encoding='utf-8')
    except Exception:
        continue
    if chr(0x2014) in text:
        p.write_text(text.replace(chr(0x2014), r'\u2014'), encoding='utf-8')"
    # standalone output does not include static assets or public/ - copy them in
    rm -rf .next/standalone/.next/static .next/standalone/public
    cp -r .next/static .next/standalone/.next/
    cp -r public .next/standalone/
    # Ensure systemd points at the flat standalone entrypoint (build is pinned flat
    # via outputFileTracingRoot). Self-heal in case the unit drifted to a nested path.
    sed -i 's#^ExecStart=.*server.js#ExecStart=/usr/bin/node .next/standalone/server.js#' /etc/systemd/system/proppr-docs.service
    systemctl daemon-reload
    systemctl restart proppr-docs
    systemctl status proppr-docs --no-pager | head -n 10
EOF

echo "Deployment complete!"

#!/bin/bash
# ============================================================
#  Montana Capital — iniciar servidor (doble clic para abrir)
# ============================================================
cd "$(dirname "$0")/server" || exit 1
export PATH="$HOME/.local/node/bin:$PATH"

echo "Iniciando el servidor de Montana Capital..."
# abre el navegador en el sitio y en el panel
( sleep 2; open "http://localhost:5050"; open "http://localhost:5050/admin" ) &

node server.js

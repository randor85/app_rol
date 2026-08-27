#!/bin/bash
# SessionStart hook para Claude Code on the web.
#
# Este proyecto es un sitio estatico (HTML/JS/CSS sin build) que se despliega
# a Firebase Hosting/Realtime Database. Este hook deja `firebase-tools`
# instalado y, si hay credenciales disponibles, autenticado de forma NO
# interactiva -- para poder hacer `firebase deploy` (hotfixes en vivo) desde
# cualquier sesion nueva (PC, tablet, etc.) sin repetir el login OAuth cada vez.
#
# Solo corre en Claude Code on the web (entorno remoto). En local no hace nada.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# --- 1. Instalar firebase-tools (idempotente: si ya esta, npm no reinstala) ---
if ! command -v firebase >/dev/null 2>&1; then
  npm install -g firebase-tools >/dev/null 2>&1
fi

echo "firebase-tools: $(firebase --version 2>/dev/null || echo 'no se pudo instalar')"

# --- 2. Autenticacion no interactiva vía service account ---
# Se espera que el Environment tenga configurada la variable de entorno
# FIREBASE_SERVICE_ACCOUNT_JSON con el contenido completo del JSON de la
# service account (Firebase Console > Configuracion del proyecto > Cuentas
# de servicio > Generar nueva clave privada, proyecto "personajes-rol").
if [ -n "${FIREBASE_SERVICE_ACCOUNT_JSON:-}" ]; then
  CRED_DIR="${CLAUDE_PROJECT_DIR:-$PWD}/.claude"
  mkdir -p "$CRED_DIR"
  CRED_FILE="$CRED_DIR/.firebase-sa.json"
  printf '%s' "$FIREBASE_SERVICE_ACCOUNT_JSON" > "$CRED_FILE"
  chmod 600 "$CRED_FILE"

  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export GOOGLE_APPLICATION_CREDENTIALS=\"$CRED_FILE\"" >> "$CLAUDE_ENV_FILE"
  fi
  export GOOGLE_APPLICATION_CREDENTIALS="$CRED_FILE"

  if firebase projects:list >/dev/null 2>&1; then
    echo "Firebase: autenticado via service account (deploy no interactivo listo)."
  else
    echo "Firebase: se encontro FIREBASE_SERVICE_ACCOUNT_JSON pero la autenticacion fallo -- revisar el contenido de la variable."
  fi
else
  echo "Firebase: no hay FIREBASE_SERVICE_ACCOUNT_JSON configurado -- hace falta 'firebase login' manual en esta sesion para poder deployar."
fi

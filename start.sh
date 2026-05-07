#!/usr/bin/env bash
# ═══════════════════════════════════════════════════
#  StockControl — Lanzador Unificado (Linux / macOS)
# ═══════════════════════════════════════════════════
#
# Uso:
#   ./start.sh          Menú interactivo
#   ./start.sh web      Iniciar versión Web
#   ./start.sh cli      Iniciar versión CLI
#   ./start.sh status   Ver estado del sistema
#   ./start.sh setup    Instalar dependencias

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
CLI_DIR="$SCRIPT_DIR/cli_version"

# ── Colours ──────────────────────────────────────────
GREEN='\033[92m'
YELLOW='\033[93m'
RED='\033[91m'
CYAN='\033[96m'
BOLD='\033[1m'
RESET='\033[0m'

banner() {
    echo ""
    echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════╗"
    echo -e "║          STOCKCONTROL — Lanzador Unificado       ║"
    echo -e "╚══════════════════════════════════════════════════╝${RESET}"
    echo ""
}

# ── Check commands ───────────────────────────────────
check_cmd() {
    command -v "$1" &>/dev/null
}

get_python() {
    if check_cmd python3; then
        echo "python3"
    elif check_cmd python; then
        echo "python"
    else
        echo ""
    fi
}

# ── Status ───────────────────────────────────────────
show_status() {
    echo -e "\n  ${BOLD}Estado del Sistema${RESET}\n"

    echo -e "  ${BOLD}Versión Web (Node.js + MySQL)${RESET}"
    if check_cmd node; then
        echo -e "  ${GREEN}[OK]${RESET}  Node.js: $(node --version)"
    else
        echo -e "  ${RED}[NO]${RESET}  Node.js no encontrado"
    fi
    if check_cmd npm; then
        echo -e "  ${GREEN}[OK]${RESET}  npm: $(npm --version)"
    else
        echo -e "  ${RED}[NO]${RESET}  npm no encontrado"
    fi
    if [ -d "$BACKEND_DIR/node_modules" ]; then
        echo -e "  ${GREEN}[OK]${RESET}  Dependencias backend instaladas"
    else
        echo -e "  ${RED}[NO]${RESET}  Dependencias backend no instaladas"
    fi

    echo ""
    echo -e "  ${BOLD}Versión CLI (Python + SQLite)${RESET}"
    local py
    py=$(get_python)
    if [ -n "$py" ]; then
        echo -e "  ${GREEN}[OK]${RESET}  Python: $($py --version 2>&1)"
    else
        echo -e "  ${RED}[NO]${RESET}  Python 3 no encontrado"
    fi
    if [ -f "$CLI_DIR/main.py" ]; then
        echo -e "  ${GREEN}[OK]${RESET}  cli_version/main.py encontrado"
    else
        echo -e "  ${RED}[NO]${RESET}  cli_version/main.py no encontrado"
    fi
    echo ""
}

# ── Launch Web ───────────────────────────────────────
launch_web() {
    if ! check_cmd node; then
        echo -e "\n  ${RED}[ERROR]${RESET} Node.js no está instalado."
        echo "  Instálelo desde https://nodejs.org/"
        return 1
    fi

    if [ ! -d "$BACKEND_DIR/node_modules" ]; then
        echo -e "\n  ${YELLOW}[INFO]${RESET} Instalando dependencias..."
        (cd "$BACKEND_DIR" && npm install)
    fi

    if [ ! -f "$BACKEND_DIR/.env" ] && [ -f "$BACKEND_DIR/.env.example" ]; then
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
        echo -e "\n  ${YELLOW}[INFO]${RESET} Archivo .env creado. Edite backend/.env con sus credenciales MySQL."
    fi

    echo -e "\n  ${GREEN}[WEB]${RESET} Iniciando servidor en http://localhost:3000 ..."
    echo -e "  ${GREEN}[WEB]${RESET} Frontend: frontend/index.html"
    echo -e "  ${YELLOW}[INFO]${RESET} Presione Ctrl+C para detener.\n"

    (cd "$BACKEND_DIR" && node server.js)
}

# ── Launch CLI ───────────────────────────────────────
launch_cli() {
    local py
    py=$(get_python)
    if [ -z "$py" ]; then
        echo -e "\n  ${RED}[ERROR]${RESET} Python 3 no está instalado."
        return 1
    fi

    if [ ! -f "$CLI_DIR/main.py" ]; then
        echo -e "\n  ${RED}[ERROR]${RESET} cli_version/main.py no encontrado."
        return 1
    fi

    echo -e "\n  ${GREEN}[CLI]${RESET} Iniciando sistema de inventario por terminal...\n"
    (cd "$CLI_DIR" && "$py" main.py)
}

# ── Setup ────────────────────────────────────────────
run_setup() {
    local py
    py=$(get_python)
    if [ -n "$py" ] && [ -f "$SCRIPT_DIR/setup.py" ]; then
        "$py" "$SCRIPT_DIR/setup.py"
    else
        echo -e "  ${RED}[ERROR]${RESET} Python 3 o setup.py no encontrado."
    fi
}

# ── Menu ─────────────────────────────────────────────
interactive_menu() {
    while true; do
        clear
        banner
        echo -e "  ${BOLD}Seleccione una opción:${RESET}\n"
        echo -e "  ${CYAN}1.${RESET} Iniciar versión Web    (Node.js + MySQL)"
        echo -e "  ${CYAN}2.${RESET} Iniciar versión CLI    (Python + SQLite)"
        echo -e "  ${CYAN}3.${RESET} Ver estado del sistema"
        echo -e "  ${CYAN}4.${RESET} Instalar dependencias"
        echo -e "  ${CYAN}0.${RESET} Salir"
        echo ""

        read -rp "  Opción: " choice

        case "$choice" in
            1) launch_web; read -rp "  Presione Enter para volver al menú..." ;;
            2) launch_cli; read -rp "  Presione Enter para volver al menú..." ;;
            3) show_status; read -rp "  Presione Enter para volver al menú..." ;;
            4) run_setup; read -rp "  Presione Enter para volver al menú..." ;;
            0) echo -e "\n  ${GREEN}¡Hasta luego!${RESET}\n"; break ;;
            *) echo -e "\n  ${RED}[ERROR]${RESET} Opción inválida."; sleep 1 ;;
        esac
    done
}

# ── Entry point ──────────────────────────────────────
case "${1:-}" in
    web)    banner; launch_web ;;
    cli)    banner; launch_cli ;;
    status) banner; show_status ;;
    setup)  banner; run_setup ;;
    help|--help|-h)
        echo "Uso: $0 [web|cli|status|setup|help]"
        echo "  Sin argumentos: menú interactivo"
        ;;
    "") interactive_menu ;;
    *)
        echo -e "  ${RED}[ERROR]${RESET} Comando desconocido: $1"
        echo "  Uso: $0 [web|cli|status|setup|help]"
        exit 1
        ;;
esac

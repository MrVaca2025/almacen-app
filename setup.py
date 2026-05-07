#!/usr/bin/env python3
"""
StockControl — Setup Utility
==============================
Checks system prerequisites and installs dependencies for both the
Web version (Node.js backend) and the CLI version (Python).

Usage:
    python3 setup.py          Run full setup
    python3 setup.py --check  Only check prerequisites (no install)
"""

import os
import sys
import subprocess
import shutil
import platform

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
CLI_DIR = os.path.join(BASE_DIR, "cli_version")
DB_DIR = os.path.join(BASE_DIR, "database")


# ── Colours ──────────────────────────────────────────────────────────────

def _supports_color():
    if platform.system() == "Windows":
        return os.environ.get("ANSICON") or "WT_SESSION" in os.environ
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


if _supports_color():
    BOLD = "\033[1m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    CYAN = "\033[96m"
    RESET = "\033[0m"
else:
    BOLD = GREEN = YELLOW = RED = CYAN = RESET = ""


# ── Helpers ──────────────────────────────────────────────────────────────

def check_command(cmd):
    return shutil.which(cmd) is not None


def get_version(cmd, flag="--version"):
    try:
        result = subprocess.run(
            [cmd, flag], capture_output=True, text=True, timeout=10
        )
        return result.stdout.strip().split("\n")[0]
    except Exception:
        return None


def section(title):
    print(f"\n{BOLD}{'─' * 50}")
    print(f"  {title}")
    print(f"{'─' * 50}{RESET}\n")


# ── Check prerequisites ─────────────────────────────────────────────────

def check_prerequisites():
    section("Verificando requisitos del sistema")

    issues = []

    # Node.js
    if check_command("node"):
        ver = get_version("node")
        print(f"  {GREEN}[OK]{RESET}  Node.js instalado: {ver}")
    else:
        print(f"  {RED}[NO]{RESET}  Node.js no encontrado")
        issues.append("node")

    # npm
    if check_command("npm"):
        ver = get_version("npm")
        print(f"  {GREEN}[OK]{RESET}  npm instalado: {ver}")
    else:
        print(f"  {RED}[NO]{RESET}  npm no encontrado")
        issues.append("npm")

    # Python 3
    py_cmd = None
    for cmd in ("python3", "python"):
        if check_command(cmd):
            py_cmd = cmd
            break

    if py_cmd:
        ver = get_version(py_cmd)
        print(f"  {GREEN}[OK]{RESET}  Python instalado: {ver}")
    else:
        print(f"  {RED}[NO]{RESET}  Python 3 no encontrado")
        issues.append("python3")

    # SQLite (bundled with Python, but check)
    try:
        import sqlite3
        print(f"  {GREEN}[OK]{RESET}  SQLite3 disponible (incluido con Python)")
    except ImportError:
        print(f"  {RED}[NO]{RESET}  SQLite3 no disponible")
        issues.append("sqlite3")

    # Project directories
    print()
    for name, path in [("backend/", BACKEND_DIR), ("frontend/", os.path.join(BASE_DIR, "frontend")),
                        ("cli_version/", CLI_DIR), ("database/", DB_DIR)]:
        if os.path.isdir(path):
            print(f"  {GREEN}[OK]{RESET}  Directorio {name} encontrado")
        else:
            print(f"  {RED}[NO]{RESET}  Directorio {name} no encontrado")
            issues.append(name)

    return issues


# ── Install web dependencies ────────────────────────────────────────────

def setup_web():
    section("Configurando versión Web")

    if not os.path.isdir(BACKEND_DIR):
        print(f"  {RED}[ERROR]{RESET} Directorio backend/ no encontrado. Omitiendo.")
        return False

    if not check_command("npm"):
        print(f"  {RED}[ERROR]{RESET} npm no disponible. Instale Node.js primero.")
        return False

    # npm install
    node_modules = os.path.join(BACKEND_DIR, "node_modules")
    if os.path.isdir(node_modules):
        print(f"  {YELLOW}[INFO]{RESET} node_modules ya existe. Actualizando...")
    else:
        print(f"  {YELLOW}[INFO]{RESET} Instalando dependencias del backend...")

    result = subprocess.run(["npm", "install"], cwd=BACKEND_DIR, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"  {GREEN}[OK]{RESET}  Dependencias del backend instaladas correctamente")
    else:
        print(f"  {RED}[ERROR]{RESET} Error instalando dependencias:")
        print(f"  {result.stderr}")
        return False

    # .env file
    env_file = os.path.join(BACKEND_DIR, ".env")
    env_example = os.path.join(BACKEND_DIR, ".env.example")
    if not os.path.isfile(env_file) and os.path.isfile(env_example):
        shutil.copy2(env_example, env_file)
        print(f"  {GREEN}[OK]{RESET}  Archivo .env creado desde .env.example")
        print(f"  {YELLOW}[INFO]{RESET} Edite backend/.env con sus credenciales MySQL:")
        print(f"         DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT")
    elif os.path.isfile(env_file):
        print(f"  {GREEN}[OK]{RESET}  Archivo .env ya existe")

    return True


# ── Verify CLI version ──────────────────────────────────────────────────

def setup_cli():
    section("Verificando versión CLI")

    if not os.path.isdir(CLI_DIR):
        print(f"  {RED}[ERROR]{RESET} Directorio cli_version/ no encontrado. Omitiendo.")
        return False

    main_py = os.path.join(CLI_DIR, "main.py")
    if not os.path.isfile(main_py):
        print(f"  {RED}[ERROR]{RESET} cli_version/main.py no encontrado.")
        return False

    print(f"  {GREEN}[OK]{RESET}  cli_version/main.py encontrado")
    print(f"  {GREEN}[OK]{RESET}  No requiere dependencias externas (solo Python estándar)")
    print(f"  {GREEN}[OK]{RESET}  Base de datos SQLite se crea automáticamente al ejecutar")

    return True


# ── Summary ──────────────────────────────────────────────────────────────

def print_summary(web_ok, cli_ok):
    section("Resumen de Instalación")

    if web_ok:
        print(f"  {GREEN}[OK]{RESET}  Versión Web lista")
        print(f"       Iniciar: python3 launcher.py web")
    else:
        print(f"  {YELLOW}[!!]{RESET}  Versión Web necesita configuración adicional")

    print()

    if cli_ok:
        print(f"  {GREEN}[OK]{RESET}  Versión CLI lista")
        print(f"       Iniciar: python3 launcher.py cli")
    else:
        print(f"  {YELLOW}[!!]{RESET}  Versión CLI necesita configuración adicional")

    print()
    print(f"  Para iniciar el lanzador unificado:")
    print(f"  {CYAN}  python3 launcher.py{RESET}")
    print()


# ── Main ─────────────────────────────────────────────────────────────────

def main():
    print(f"\n{CYAN}{BOLD}╔══════════════════════════════════════════════════╗")
    print(f"║      STOCKCONTROL — Utilidad de Instalación      ║")
    print(f"╚══════════════════════════════════════════════════╝{RESET}")

    check_only = "--check" in sys.argv

    issues = check_prerequisites()

    if check_only:
        if issues:
            print(f"\n  {YELLOW}[INFO]{RESET} Problemas detectados: {', '.join(issues)}")
        else:
            print(f"\n  {GREEN}[OK]{RESET}  Todos los requisitos están disponibles")
        print()
        return

    web_ok = setup_web()
    cli_ok = setup_cli()
    print_summary(web_ok, cli_ok)


if __name__ == "__main__":
    main()

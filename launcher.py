#!/usr/bin/env python3
"""
StockControl — Unified Launcher
================================
Cross-platform launcher that lets you start either the Web version
(Node.js + MySQL) or the CLI version (Python + SQLite) from a single
interactive menu.

Usage:
    python3 launcher.py            Interactive menu
    python3 launcher.py web        Start web version directly
    python3 launcher.py cli        Start CLI version directly
    python3 launcher.py status     Check system dependencies
    python3 launcher.py setup      Install dependencies
"""

import os
import sys
import subprocess
import shutil
import signal
import platform

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
CLI_DIR = os.path.join(BASE_DIR, "cli_version")


# ── Colours (disabled on Windows cmd without ANSI support) ───────────────

def supports_color():
    if platform.system() == "Windows":
        return os.environ.get("ANSICON") or "WT_SESSION" in os.environ
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


if supports_color():
    BOLD = "\033[1m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    CYAN = "\033[96m"
    RESET = "\033[0m"
else:
    BOLD = GREEN = YELLOW = RED = CYAN = RESET = ""


# ── Helpers ──────────────────────────────────────────────────────────────

def clear_screen():
    os.system("cls" if platform.system() == "Windows" else "clear")


def banner():
    print(f"""
{CYAN}{BOLD}╔══════════════════════════════════════════════════╗
║          STOCKCONTROL — Lanzador Unificado       ║
╚══════════════════════════════════════════════════╝{RESET}
""")


def check_command(cmd):
    return shutil.which(cmd) is not None


def get_version(cmd, flag="--version"):
    try:
        result = subprocess.run(
            [cmd, flag],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout.strip().split("\n")[0]
    except Exception:
        return None


def print_status(label, available, version_str=None):
    if available:
        extra = f" ({version_str})" if version_str else ""
        print(f"  {GREEN}[OK]{RESET}  {label}{extra}")
    else:
        print(f"  {RED}[NO]{RESET}  {label} — no encontrado")


# ── Dependency checks ───────────────────────────────────────────────────

def check_node():
    return check_command("node")


def check_npm():
    return check_command("npm")


def check_python():
    for cmd in ("python3", "python"):
        if check_command(cmd):
            return cmd
    return None


def check_backend_deps():
    return os.path.isdir(os.path.join(BACKEND_DIR, "node_modules"))


def show_status():
    print(f"\n{BOLD}  Estado del Sistema{RESET}\n")

    node_ok = check_node()
    npm_ok = check_npm()
    py_cmd = check_python()
    backend_deps = check_backend_deps()

    print(f"  {BOLD}Versión Web (Node.js + MySQL){RESET}")
    print_status("Node.js", node_ok, get_version("node") if node_ok else None)
    print_status("npm", npm_ok, get_version("npm") if npm_ok else None)
    print_status("Dependencias backend (node_modules)", backend_deps)
    print_status("Directorio backend/", os.path.isdir(BACKEND_DIR))
    print_status("Directorio frontend/", os.path.isdir(FRONTEND_DIR))

    print()
    print(f"  {BOLD}Versión CLI (Python + SQLite){RESET}")
    print_status("Python 3", py_cmd is not None, get_version(py_cmd) if py_cmd else None)
    print_status("Directorio cli_version/", os.path.isdir(CLI_DIR))
    print_status("main.py", os.path.isfile(os.path.join(CLI_DIR, "main.py")))

    print()
    print(f"  {BOLD}Base de Datos SQL{RESET}")
    print_status("Scripts SQL (database/)", os.path.isdir(os.path.join(BASE_DIR, "database")))

    print()


# ── Launch: Web version ─────────────────────────────────────────────────

def launch_web():
    if not check_node():
        print(f"\n  {RED}[ERROR]{RESET} Node.js no está instalado.")
        print("  Instálelo desde https://nodejs.org/ o ejecute: python3 setup.py")
        return

    if not check_backend_deps():
        print(f"\n  {YELLOW}[INFO]{RESET} Instalando dependencias del backend...")
        subprocess.run(["npm", "install"], cwd=BACKEND_DIR)

    env_file = os.path.join(BACKEND_DIR, ".env")
    if not os.path.isfile(env_file):
        example = os.path.join(BACKEND_DIR, ".env.example")
        if os.path.isfile(example):
            shutil.copy2(example, env_file)
            print(f"\n  {YELLOW}[INFO]{RESET} Archivo .env creado desde .env.example")
            print(f"  {YELLOW}[INFO]{RESET} Edite backend/.env con sus credenciales MySQL antes de conectar.")

    print(f"\n  {GREEN}[WEB]{RESET} Iniciando servidor backend en http://localhost:3000 ...")
    print(f"  {GREEN}[WEB]{RESET} Frontend disponible en: frontend/index.html")
    print(f"  {YELLOW}[INFO]{RESET} Presione Ctrl+C para detener el servidor.\n")

    try:
        proc = subprocess.Popen(
            ["node", "server.js"],
            cwd=BACKEND_DIR
        )
        proc.wait()
    except KeyboardInterrupt:
        print(f"\n\n  {YELLOW}[INFO]{RESET} Servidor detenido.")
        proc.terminate()
        proc.wait()


# ── Launch: CLI version ─────────────────────────────────────────────────

def launch_cli():
    py_cmd = check_python()
    if not py_cmd:
        print(f"\n  {RED}[ERROR]{RESET} Python 3 no está instalado.")
        print("  Instálelo desde https://www.python.org/downloads/")
        return

    main_py = os.path.join(CLI_DIR, "main.py")
    if not os.path.isfile(main_py):
        print(f"\n  {RED}[ERROR]{RESET} No se encontró cli_version/main.py")
        return

    print(f"\n  {GREEN}[CLI]{RESET} Iniciando sistema de inventario por terminal...\n")

    try:
        proc = subprocess.Popen(
            [py_cmd, "main.py"],
            cwd=CLI_DIR
        )
        proc.wait()
    except KeyboardInterrupt:
        print(f"\n\n  {YELLOW}[INFO]{RESET} CLI detenido.")
        proc.terminate()
        proc.wait()


# ── Setup ────────────────────────────────────────────────────────────────

def run_setup():
    setup_script = os.path.join(BASE_DIR, "setup.py")
    if os.path.isfile(setup_script):
        py_cmd = check_python() or "python3"
        subprocess.run([py_cmd, setup_script], cwd=BASE_DIR)
    else:
        print(f"\n  {RED}[ERROR]{RESET} setup.py no encontrado.")


# ── Interactive menu ─────────────────────────────────────────────────────

def interactive_menu():
    while True:
        clear_screen()
        banner()
        print(f"  {BOLD}Seleccione una opción:{RESET}\n")
        print(f"  {CYAN}1.{RESET} Iniciar versión Web    (Node.js + MySQL)")
        print(f"  {CYAN}2.{RESET} Iniciar versión CLI    (Python + SQLite)")
        print(f"  {CYAN}3.{RESET} Ver estado del sistema")
        print(f"  {CYAN}4.{RESET} Instalar dependencias")
        print(f"  {CYAN}0.{RESET} Salir")
        print()

        choice = input(f"  Opción: ").strip()

        if choice == "1":
            launch_web()
            input(f"\n  Presione Enter para volver al menú...")
        elif choice == "2":
            launch_cli()
            input(f"\n  Presione Enter para volver al menú...")
        elif choice == "3":
            show_status()
            input(f"\n  Presione Enter para volver al menú...")
        elif choice == "4":
            run_setup()
            input(f"\n  Presione Enter para volver al menú...")
        elif choice == "0":
            print(f"\n  {GREEN}¡Hasta luego!{RESET}\n")
            break
        else:
            print(f"\n  {RED}[ERROR]{RESET} Opción inválida.")
            input(f"\n  Presione Enter para continuar...")


# ── CLI arguments ────────────────────────────────────────────────────────

def main():
    if len(sys.argv) > 1:
        cmd = sys.argv[1].lower()
        if cmd == "web":
            banner()
            launch_web()
        elif cmd == "cli":
            banner()
            launch_cli()
        elif cmd == "status":
            banner()
            show_status()
        elif cmd == "setup":
            banner()
            run_setup()
        elif cmd in ("help", "-h", "--help"):
            print(__doc__)
        else:
            print(f"  {RED}[ERROR]{RESET} Comando desconocido: {cmd}")
            print("  Uso: python3 launcher.py [web|cli|status|setup|help]")
            sys.exit(1)
    else:
        interactive_menu()


if __name__ == "__main__":
    main()

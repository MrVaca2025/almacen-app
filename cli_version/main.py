import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db import init_db
from models.productos import list_products, create_product, edit_product, toggle_product
from models.ventas import register_sale
from models.ingresos import register_ingreso
from models.kardex import view_kardex
from models.dashboard import show_dashboard
from utils.formatters import header


def main_menu():
    header("SISTEMA DE INVENTARIO (CLI)")
    print("  1. Ver productos")
    print("  2. Crear producto")
    print("  3. Editar producto")
    print("  4. Activar/Desactivar producto")
    print("  5. Registrar ingreso")
    print("  6. Registrar venta")
    print("  7. Ver kardex")
    print("  8. Dashboard")
    print("  0. Salir")
    print()


def main():
    init_db()

    actions = {
        "1": list_products,
        "2": create_product,
        "3": edit_product,
        "4": toggle_product,
        "5": register_ingreso,
        "6": register_sale,
        "7": view_kardex,
        "8": show_dashboard,
    }

    while True:
        main_menu()
        choice = input("  Seleccione una opción: ").strip()

        if choice == "0":
            print("\n  ¡Hasta luego!\n")
            break

        action = actions.get(choice)
        if action:
            try:
                action()
            except KeyboardInterrupt:
                print("\n\n  Operación cancelada.")
            except Exception as e:
                print(f"\n  [ERROR] {e}")
        else:
            print("\n  [ERROR] Opción inválida. Intente de nuevo.")

        input("\n  Presione Enter para continuar...")


if __name__ == "__main__":
    main()

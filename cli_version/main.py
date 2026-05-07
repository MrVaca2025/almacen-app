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
    header("INVENTORY SYSTEM (CLI)")
    print("  1. View products")
    print("  2. Create product")
    print("  3. Edit product")
    print("  4. Activate/Deactivate product")
    print("  5. Register ingreso (stock in)")
    print("  6. Register sale")
    print("  7. View kardex")
    print("  8. Dashboard")
    print("  0. Exit")
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
        choice = input("  Select an option: ").strip()

        if choice == "0":
            print("\n  Goodbye!\n")
            break

        action = actions.get(choice)
        if action:
            try:
                action()
            except KeyboardInterrupt:
                print("\n\n  Operation cancelled.")
            except Exception as e:
                print(f"\n  [ERROR] {e}")
        else:
            print("\n  [ERROR] Invalid option. Try again.")

        input("\n  Press Enter to continue...")


if __name__ == "__main__":
    main()

from db import get_connection
from utils.formatters import header, success, error, print_table, separator
from utils.validators import validate_name, validate_price, validate_stock
from utils.validators import input_text, input_float, input_int


def list_products():
    header("PRODUCT LIST")
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, nombre, precio_venta, stock_actual, stock_minimo, activo "
        "FROM productos ORDER BY id"
    ).fetchall()
    conn.close()

    if not rows:
        print("  No products registered yet.")
        return

    headers = ["ID", "Name", "Price", "Stock", "Min", "Active"]
    data = [
        (r["id"], r["nombre"], f"${r['precio_venta']:,.0f}",
         r["stock_actual"], r["stock_minimo"],
         "Yes" if r["activo"] else "No")
        for r in rows
    ]
    print_table(headers, data)


def create_product():
    header("CREATE PRODUCT")

    nombre = input_text("  Name: ")
    ok, msg = validate_name(nombre)
    if not ok:
        error(msg)
        return

    descripcion = input_text("  Description (optional): ", allow_empty=True)

    precio = input_float("  Sale price: ")
    ok, msg = validate_price(precio)
    if not ok:
        error(msg)
        return

    stock = input_int("  Initial stock: ")
    ok, msg = validate_stock(stock)
    if not ok:
        error(msg)
        return

    stock_min = input_int("  Minimum stock: ")
    ok, msg = validate_stock(stock_min)
    if not ok:
        error(msg)
        return

    conn = get_connection()
    conn.execute(
        "INSERT INTO productos (nombre, descripcion, precio_venta, stock_actual, stock_minimo) "
        "VALUES (?, ?, ?, ?, ?)",
        (nombre, descripcion, precio, stock, stock_min)
    )
    conn.commit()
    conn.close()
    success(f"Product '{nombre}' created successfully.")


def edit_product():
    header("EDIT PRODUCT")
    list_products()

    product_id = input_int("  Enter product ID to edit: ")

    conn = get_connection()
    product = conn.execute(
        "SELECT * FROM productos WHERE id = ?", (product_id,)
    ).fetchone()

    if not product:
        conn.close()
        error(f"Product with ID {product_id} not found.")
        return

    print(f"\n  Editing: {product['nombre']}")
    print("  (Press Enter to keep current value)\n")

    nombre = input_text(
        f"  Name [{product['nombre']}]: ", allow_empty=True
    ) or product["nombre"]

    descripcion = input_text(
        f"  Description [{product['descripcion']}]: ", allow_empty=True
    )
    if descripcion == "":
        descripcion = product["descripcion"]

    precio_raw = input_float(
        f"  Price [{product['precio_venta']}]: ", allow_empty=True
    )
    precio = precio_raw if precio_raw is not None else product["precio_venta"]
    ok, msg = validate_price(precio)
    if not ok:
        conn.close()
        error(msg)
        return

    stock_min_raw = input_int(
        f"  Min stock [{product['stock_minimo']}]: ", allow_empty=True
    )
    stock_min = stock_min_raw if stock_min_raw is not None else product["stock_minimo"]
    ok, msg = validate_stock(stock_min)
    if not ok:
        conn.close()
        error(msg)
        return

    conn.execute(
        "UPDATE productos SET nombre=?, descripcion=?, precio_venta=?, stock_minimo=? "
        "WHERE id=?",
        (nombre, descripcion, precio, stock_min, product_id)
    )
    conn.commit()
    conn.close()
    success(f"Product '{nombre}' updated successfully.")


def toggle_product():
    header("ACTIVATE / DEACTIVATE PRODUCT")
    list_products()

    product_id = input_int("  Enter product ID to toggle: ")

    conn = get_connection()
    product = conn.execute(
        "SELECT id, nombre, activo FROM productos WHERE id = ?", (product_id,)
    ).fetchone()

    if not product:
        conn.close()
        error(f"Product with ID {product_id} not found.")
        return

    new_status = 0 if product["activo"] else 1
    label = "activated" if new_status else "deactivated"

    conn.execute(
        "UPDATE productos SET activo = ? WHERE id = ?",
        (new_status, product_id)
    )
    conn.commit()
    conn.close()
    success(f"Product '{product['nombre']}' {label}.")

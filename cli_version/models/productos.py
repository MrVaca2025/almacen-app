from db import get_connection
from utils.formatters import header, success, error, print_table, separator
from utils.validators import validate_name, validate_price, validate_stock
from utils.validators import input_text, input_float, input_int


def list_products():
    header("LISTA DE PRODUCTOS")
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, nombre, precio_venta, stock_actual, stock_minimo, activo "
        "FROM productos ORDER BY id"
    ).fetchall()
    conn.close()

    if not rows:
        print("  No hay productos registrados.")
        return

    headers = ["ID", "Nombre", "Precio", "Stock", "Mín", "Activo"]
    data = [
        (r["id"], r["nombre"], f"${r['precio_venta']:,.0f}",
         r["stock_actual"], r["stock_minimo"],
         "Sí" if r["activo"] else "No")
        for r in rows
    ]
    print_table(headers, data)


def create_product():
    header("CREAR PRODUCTO")

    nombre = input_text("  Nombre: ")
    ok, msg = validate_name(nombre)
    if not ok:
        error(msg)
        return

    descripcion = input_text("  Descripción (opcional): ", allow_empty=True)

    precio = input_float("  Precio de venta: ")
    ok, msg = validate_price(precio)
    if not ok:
        error(msg)
        return

    stock = input_int("  Stock inicial: ")
    ok, msg = validate_stock(stock)
    if not ok:
        error(msg)
        return

    stock_min = input_int("  Stock mínimo: ")
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
    success(f"Producto '{nombre}' creado exitosamente.")


def edit_product():
    header("EDITAR PRODUCTO")
    list_products()

    product_id = input_int("  Ingrese ID del producto a editar: ")

    conn = get_connection()
    product = conn.execute(
        "SELECT * FROM productos WHERE id = ?", (product_id,)
    ).fetchone()

    if not product:
        conn.close()
        error(f"Producto con ID {product_id} no encontrado.")
        return

    print(f"\n  Editando: {product['nombre']}")
    print("  (Presione Enter para mantener el valor actual)\n")

    nombre = input_text(
        f"  Nombre [{product['nombre']}]: ", allow_empty=True
    ) or product["nombre"]

    descripcion = input_text(
        f"  Descripción [{product['descripcion']}]: ", allow_empty=True
    )
    if descripcion == "":
        descripcion = product["descripcion"]

    precio_raw = input_float(
        f"  Precio [{product['precio_venta']}]: ", allow_empty=True
    )
    precio = precio_raw if precio_raw is not None else product["precio_venta"]
    ok, msg = validate_price(precio)
    if not ok:
        conn.close()
        error(msg)
        return

    stock_min_raw = input_int(
        f"  Stock mínimo [{product['stock_minimo']}]: ", allow_empty=True
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
    success(f"Producto '{nombre}' actualizado exitosamente.")


def toggle_product():
    header("ACTIVAR / DESACTIVAR PRODUCTO")
    list_products()

    product_id = input_int("  Ingrese ID del producto: ")

    conn = get_connection()
    product = conn.execute(
        "SELECT id, nombre, activo FROM productos WHERE id = ?", (product_id,)
    ).fetchone()

    if not product:
        conn.close()
        error(f"Producto con ID {product_id} no encontrado.")
        return

    new_status = 0 if product["activo"] else 1
    label = "activado" if new_status else "desactivado"

    conn.execute(
        "UPDATE productos SET activo = ? WHERE id = ?",
        (new_status, product_id)
    )
    conn.commit()
    conn.close()
    success(f"Producto '{product['nombre']}' {label}.")

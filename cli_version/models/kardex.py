from db import get_connection
from utils.formatters import header, error, print_table
from utils.validators import input_int


def view_kardex():
    header("KARDEX - INVENTORY MOVEMENTS")

    conn = get_connection()
    products = conn.execute(
        "SELECT id, nombre, stock_actual FROM productos ORDER BY id"
    ).fetchall()

    if not products:
        conn.close()
        error("No products registered.")
        return

    headers = ["ID", "Name", "Current Stock"]
    data = [(p["id"], p["nombre"], p["stock_actual"]) for p in products]
    print_table(headers, data)

    product_id = input_int("  Enter product ID to view kardex: ")

    product = conn.execute(
        "SELECT id, nombre, stock_actual FROM productos WHERE id = ?",
        (product_id,)
    ).fetchone()

    if not product:
        conn.close()
        error(f"Product with ID {product_id} not found.")
        return

    header(f"KARDEX: {product['nombre']}")

    movements = []

    ingreso_rows = conn.execute(
        "SELECT i.fecha, di.cantidad, di.precio_compra "
        "FROM detalle_ingreso di "
        "JOIN ingresos i ON di.ingreso_id = i.id "
        "WHERE di.producto_id = ? "
        "ORDER BY i.fecha",
        (product_id,)
    ).fetchall()

    for row in ingreso_rows:
        movements.append({
            "fecha": row["fecha"],
            "tipo": "INGRESO",
            "cantidad": row["cantidad"],
            "precio": row["precio_compra"],
        })

    venta_rows = conn.execute(
        "SELECT v.fecha, dv.cantidad, dv.precio_unitario "
        "FROM detalle_venta dv "
        "JOIN ventas v ON dv.venta_id = v.id "
        "WHERE dv.producto_id = ? "
        "ORDER BY v.fecha",
        (product_id,)
    ).fetchall()

    for row in venta_rows:
        movements.append({
            "fecha": row["fecha"],
            "tipo": "VENTA",
            "cantidad": row["cantidad"],
            "precio": row["precio_unitario"],
        })

    movements.sort(key=lambda m: m["fecha"])

    if not movements:
        print("  No movements found for this product.")
        conn.close()
        return

    running_stock = 0
    kardex_headers = ["Date", "Type", "Qty", "Price", "Stock"]
    kardex_data = []

    for mov in movements:
        if mov["tipo"] == "INGRESO":
            running_stock += mov["cantidad"]
        else:
            running_stock -= mov["cantidad"]

        kardex_data.append((
            mov["fecha"],
            mov["tipo"],
            mov["cantidad"],
            f"${mov['precio']:,.0f}",
            running_stock,
        ))

    print_table(kardex_headers, kardex_data)
    print(f"  Current stock in DB: {product['stock_actual']}")

    conn.close()

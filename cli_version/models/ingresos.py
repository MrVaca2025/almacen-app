from db import get_connection
from utils.formatters import header, success, error, info, separator, format_currency, print_table
from utils.validators import input_int, input_float


def register_ingreso():
    header("REGISTER INGRESO (STOCK IN)")

    conn = get_connection()
    products = conn.execute(
        "SELECT id, nombre, stock_actual FROM productos WHERE activo = 1 ORDER BY id"
    ).fetchall()

    if not products:
        conn.close()
        error("No active products available.")
        return

    headers = ["ID", "Name", "Current Stock"]
    data = [(p["id"], p["nombre"], p["stock_actual"]) for p in products]
    print_table(headers, data)

    items = []
    while True:
        separator()
        product_id = input_int("  Product ID (0 to finish): ")
        if product_id == 0:
            break

        product = conn.execute(
            "SELECT id, nombre FROM productos WHERE id = ? AND activo = 1",
            (product_id,)
        ).fetchone()

        if not product:
            error("Product not found or inactive.")
            continue

        cantidad = input_int("  Quantity: ")
        if cantidad <= 0:
            error("Quantity must be greater than 0.")
            continue

        precio_compra = input_float("  Purchase price per unit: ")
        if precio_compra < 0:
            error("Purchase price must be >= 0.")
            continue

        items.append({
            "producto_id": product["id"],
            "nombre": product["nombre"],
            "cantidad": cantidad,
            "precio_compra": precio_compra,
            "subtotal": cantidad * precio_compra,
        })
        success(f"Added {cantidad}x {product['nombre']}.")

    if not items:
        conn.close()
        info("Ingreso cancelled. No products added.")
        return

    total = sum(item["subtotal"] for item in items)

    header("INGRESO SUMMARY")
    summary_headers = ["Product", "Qty", "Unit Cost", "Subtotal"]
    summary_data = [
        (item["nombre"], item["cantidad"],
         format_currency(item["precio_compra"]),
         format_currency(item["subtotal"]))
        for item in items
    ]
    print_table(summary_headers, summary_data)
    print(f"  TOTAL: {format_currency(total)}")
    separator()

    confirm = input("  Confirm ingreso? (y/n): ").strip().lower()
    if confirm != "y":
        conn.close()
        info("Ingreso cancelled.")
        return

    cursor = conn.cursor()
    cursor.execute("INSERT INTO ingresos (total) VALUES (?)", (total,))
    ingreso_id = cursor.lastrowid

    for item in items:
        cursor.execute(
            "INSERT INTO detalle_ingreso (ingreso_id, producto_id, cantidad, precio_compra, subtotal) "
            "VALUES (?, ?, ?, ?, ?)",
            (ingreso_id, item["producto_id"], item["cantidad"],
             item["precio_compra"], item["subtotal"])
        )
        cursor.execute(
            "UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?",
            (item["cantidad"], item["producto_id"])
        )

    conn.commit()
    conn.close()
    success(f"Ingreso #{ingreso_id} registered successfully. Total: {format_currency(total)}")

from db import get_connection
from utils.formatters import header, success, error, info, separator, format_currency, print_table
from utils.validators import input_int, input_float


def register_ingreso():
    header("REGISTRAR INGRESO")

    conn = get_connection()
    products = conn.execute(
        "SELECT id, nombre, stock_actual FROM productos WHERE activo = 1 ORDER BY id"
    ).fetchall()

    if not products:
        conn.close()
        error("No hay productos activos disponibles.")
        return

    headers = ["ID", "Nombre", "Stock Actual"]
    data = [(p["id"], p["nombre"], p["stock_actual"]) for p in products]
    print_table(headers, data)

    items = []
    while True:
        separator()
        product_id = input_int("  ID del producto (0 para terminar): ")
        if product_id == 0:
            break

        product = conn.execute(
            "SELECT id, nombre FROM productos WHERE id = ? AND activo = 1",
            (product_id,)
        ).fetchone()

        if not product:
            error("Producto no encontrado o inactivo.")
            continue

        cantidad = input_int("  Cantidad: ")
        if cantidad <= 0:
            error("La cantidad debe ser mayor a 0.")
            continue

        precio_compra = input_float("  Precio de compra por unidad: ")
        if precio_compra < 0:
            error("El precio de compra debe ser >= 0.")
            continue

        items.append({
            "producto_id": product["id"],
            "nombre": product["nombre"],
            "cantidad": cantidad,
            "precio_compra": precio_compra,
            "subtotal": cantidad * precio_compra,
        })
        success(f"Agregado {cantidad}x {product['nombre']}.")

    if not items:
        conn.close()
        info("Ingreso cancelado. No se agregaron productos.")
        return

    total = sum(item["subtotal"] for item in items)

    header("RESUMEN DE INGRESO")
    summary_headers = ["Producto", "Cant", "Costo Unit.", "Subtotal"]
    summary_data = [
        (item["nombre"], item["cantidad"],
         format_currency(item["precio_compra"]),
         format_currency(item["subtotal"]))
        for item in items
    ]
    print_table(summary_headers, summary_data)
    print(f"  TOTAL: {format_currency(total)}")
    separator()

    confirm = input("  ¿Confirmar ingreso? (s/n): ").strip().lower()
    if confirm != "s":
        conn.close()
        info("Ingreso cancelado.")
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
    success(f"Ingreso #{ingreso_id} registrado exitosamente. Total: {format_currency(total)}")

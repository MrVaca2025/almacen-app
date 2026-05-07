from db import get_connection
from utils.formatters import header, success, error, info, separator, format_currency, print_table
from utils.validators import input_int


def register_sale():
    header("REGISTRAR VENTA")

    conn = get_connection()
    products = conn.execute(
        "SELECT id, nombre, precio_venta, stock_actual "
        "FROM productos WHERE activo = 1 ORDER BY id"
    ).fetchall()

    if not products:
        conn.close()
        error("No hay productos activos disponibles.")
        return

    headers = ["ID", "Nombre", "Precio", "Stock"]
    data = [
        (p["id"], p["nombre"], format_currency(p["precio_venta"]), p["stock_actual"])
        for p in products
    ]
    print_table(headers, data)

    cart = []
    while True:
        separator()
        product_id = input_int("  ID del producto (0 para terminar): ")
        if product_id == 0:
            break

        product = conn.execute(
            "SELECT id, nombre, precio_venta, stock_actual "
            "FROM productos WHERE id = ? AND activo = 1",
            (product_id,)
        ).fetchone()

        if not product:
            error("Producto no encontrado o inactivo.")
            continue

        cantidad = input_int("  Cantidad: ")
        if cantidad <= 0:
            error("La cantidad debe ser mayor a 0.")
            continue

        already_in_cart = sum(
            item["cantidad"] for item in cart if item["producto_id"] == product_id
        )
        available = product["stock_actual"] - already_in_cart

        if cantidad > available:
            error(
                f"Stock insuficiente. Disponible: {available} "
                f"(total: {product['stock_actual']}, en carrito: {already_in_cart})"
            )
            continue

        cart.append({
            "producto_id": product["id"],
            "nombre": product["nombre"],
            "cantidad": cantidad,
            "precio_unitario": product["precio_venta"],
            "subtotal": cantidad * product["precio_venta"],
        })
        success(f"Agregado {cantidad}x {product['nombre']} al carrito.")

    if not cart:
        conn.close()
        info("Venta cancelada. No se agregaron productos.")
        return

    total = sum(item["subtotal"] for item in cart)

    header("BOLETA DE VENTA")
    receipt_headers = ["Producto", "Cant", "Precio Unit.", "Subtotal"]
    receipt_data = [
        (item["nombre"], item["cantidad"],
         format_currency(item["precio_unitario"]),
         format_currency(item["subtotal"]))
        for item in cart
    ]
    print_table(receipt_headers, receipt_data)
    print(f"  TOTAL: {format_currency(total)}")
    separator()

    confirm = input("  ¿Confirmar venta? (s/n): ").strip().lower()
    if confirm != "s":
        conn.close()
        info("Venta cancelada.")
        return

    cursor = conn.cursor()
    cursor.execute("INSERT INTO ventas (total) VALUES (?)", (total,))
    venta_id = cursor.lastrowid

    for item in cart:
        cursor.execute(
            "INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal) "
            "VALUES (?, ?, ?, ?, ?)",
            (venta_id, item["producto_id"], item["cantidad"],
             item["precio_unitario"], item["subtotal"])
        )
        cursor.execute(
            "UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?",
            (item["cantidad"], item["producto_id"])
        )

    conn.commit()
    conn.close()
    success(f"Venta #{venta_id} registrada exitosamente. Total: {format_currency(total)}")

from db import get_connection
from utils.formatters import header, format_currency, separator, print_table


def show_dashboard():
    header("PANEL DE CONTROL")
    conn = get_connection()

    # Total revenue (sales)
    row = conn.execute("SELECT COALESCE(SUM(total), 0) AS total FROM ventas").fetchone()
    total_revenue = row["total"]

    # Total ingresos (purchases)
    row = conn.execute("SELECT COALESCE(SUM(total), 0) AS total FROM ingresos").fetchone()
    total_ingresos = row["total"]

    # Estimated profit
    estimated_profit = total_revenue - total_ingresos

    # Number of sales
    row = conn.execute("SELECT COUNT(*) AS cnt FROM ventas").fetchone()
    num_sales = row["cnt"]

    # Number of ingresos
    row = conn.execute("SELECT COUNT(*) AS cnt FROM ingresos").fetchone()
    num_ingresos = row["cnt"]

    # Active / Inactive products
    row = conn.execute(
        "SELECT "
        "SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) AS active, "
        "SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) AS inactive "
        "FROM productos"
    ).fetchone()
    active_products = row["active"] or 0
    inactive_products = row["inactive"] or 0

    print(f"""
  Ingresos por Ventas:   {format_currency(total_revenue)}
  Total Ingresos:        {format_currency(total_ingresos)}
  Ganancia Estimada:     {format_currency(estimated_profit)}
  Cantidad de Ventas:    {num_sales}
  Cantidad de Ingresos:  {num_ingresos}
  Productos Activos:     {active_products}
  Productos Inactivos:   {inactive_products}
    """)

    separator()

    # Most sold product
    most_sold = conn.execute(
        "SELECT p.nombre, SUM(dv.cantidad) AS total_qty "
        "FROM detalle_venta dv "
        "JOIN productos p ON dv.producto_id = p.id "
        "GROUP BY dv.producto_id "
        "ORDER BY total_qty DESC LIMIT 1"
    ).fetchone()

    if most_sold:
        print(f"  Producto Más Vendido:  {most_sold['nombre']} ({most_sold['total_qty']} unidades)")
    else:
        print("  Producto Más Vendido:  N/A (sin ventas aún)")

    separator()

    # Low stock products
    low_stock = conn.execute(
        "SELECT id, nombre, stock_actual, stock_minimo "
        "FROM productos "
        "WHERE activo = 1 AND stock_actual <= stock_minimo "
        "ORDER BY stock_actual"
    ).fetchall()

    if low_stock:
        print("\n  PRODUCTOS CON STOCK BAJO:")
        ls_headers = ["ID", "Nombre", "Stock", "Mín"]
        ls_data = [
            (r["id"], r["nombre"], r["stock_actual"], r["stock_minimo"])
            for r in low_stock
        ]
        print_table(ls_headers, ls_data)
    else:
        print("\n  No hay productos bajo stock mínimo.")

    separator()

    # Top 5 products by revenue
    top_revenue = conn.execute(
        "SELECT p.nombre, SUM(dv.subtotal) AS revenue "
        "FROM detalle_venta dv "
        "JOIN productos p ON dv.producto_id = p.id "
        "GROUP BY dv.producto_id "
        "ORDER BY revenue DESC LIMIT 5"
    ).fetchall()

    if top_revenue:
        print("\n  TOP 5 PRODUCTOS POR INGRESOS:")
        tr_headers = ["Producto", "Ingresos"]
        tr_data = [
            (r["nombre"], format_currency(r["revenue"]))
            for r in top_revenue
        ]
        print_table(tr_headers, tr_data)

    conn.close()
    print()

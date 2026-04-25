// routes/dashboard.js — Business KPI endpoint
// Queries are based on the dashboard SQL in database/04_consultas_dashboard.sql.
// Returns a summary object with general KPIs, sales metrics, low-stock products,
// and top-selling products.

const { Router } = require('express');
const pool = require('../db');

const router = Router();

// GET /api/dashboard — General business indicators
router.get('/', async (_req, res) => {
  try {
    // General KPIs: active products, total sales count, total ingresos count,
    // total revenue, and count of products below minimum stock
    const [[kpis]] = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM producto WHERE activo = TRUE) AS productos_activos,
         (SELECT COUNT(*) FROM venta) AS total_ventas,
         (SELECT COUNT(*) FROM ingreso) AS total_ingresos,
         (SELECT COALESCE(SUM(total_venta), 0) FROM venta) AS monto_total_vendido,
         (SELECT COUNT(*) FROM producto
            WHERE stock_actual <= stock_minimo AND activo = TRUE) AS productos_bajo_stock`
    );

    // Sales KPIs: total revenue, number of sales, average ticket
    const [ventasKpi] = await pool.query(
      `SELECT
         COALESCE(SUM(total_venta), 0) AS ventas_totales,
         COUNT(DISTINCT id_venta) AS numero_ventas,
         CASE WHEN COUNT(DISTINCT id_venta) > 0
              THEN ROUND(SUM(total_venta) / COUNT(DISTINCT id_venta), 0)
              ELSE 0 END AS ticket_promedio
       FROM venta`
    );

    // Products below minimum stock, ordered by deficit (most critical first)
    const [productosBajoStock] = await pool.query(
      `SELECT nombre, stock_actual, stock_minimo,
              (stock_minimo - stock_actual) AS deficit
       FROM producto
       WHERE stock_actual <= stock_minimo AND activo = TRUE
       ORDER BY deficit DESC`
    );

    // Top 10 best-selling products by units sold
    const [masVendidos] = await pool.query(
      `SELECT p.nombre, SUM(dv.cantidad_vendida) AS total_vendido
       FROM detalle_venta dv
       JOIN producto p ON dv.id_producto = p.id_producto
       GROUP BY p.nombre
       ORDER BY total_vendido DESC
       LIMIT 10`
    );

    res.json({
      kpis,
      ventas: ventasKpi[0] || {},
      productos_bajo_stock: productosBajoStock,
      mas_vendidos: masVendidos
    });
  } catch (err) {
    res.status(500).json({ error: err.message || err.code || 'Error interno del servidor' });
  }
});

module.exports = router;

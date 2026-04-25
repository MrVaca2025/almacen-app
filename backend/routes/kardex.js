// routes/kardex.js — Inventory movement history per product
// Combines ingresos and ventas into a chronological movement log.
// Calculates running stock balance.

const { Router } = require('express');
const pool = require('../db');

const router = Router();

// GET /api/kardex/:productoId — Full movement history for a product
router.get('/:productoId', async (req, res) => {
  try {
    const productoId = Number(req.params.productoId);
    if (!productoId || isNaN(productoId)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    // Get product info
    const [prodRows] = await pool.query(
      'SELECT id_producto, nombre, stock_actual FROM producto WHERE id_producto = ?',
      [productoId]
    );
    if (prodRows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Get all ingresos for this product
    const [ingresos] = await pool.query(
      `SELECT i.fecha_ingreso AS fecha, di.cantidad_ingresada AS cantidad,
              di.precio_compra AS precio, 'Ingreso' AS tipo
       FROM detalle_ingreso di
       JOIN ingreso i ON di.id_ingreso = i.id_ingreso
       WHERE di.id_producto = ? AND di.estado_recepcion = 'aceptado'
       ORDER BY i.fecha_ingreso ASC`,
      [productoId]
    );

    // Get all ventas for this product
    const [ventas] = await pool.query(
      `SELECT v.fecha_venta AS fecha, dv.cantidad_vendida AS cantidad,
              dv.precio_unitario AS precio, 'Venta' AS tipo
       FROM detalle_venta dv
       JOIN venta v ON dv.id_venta = v.id_venta
       WHERE dv.id_producto = ?
       ORDER BY v.fecha_venta ASC`,
      [productoId]
    );

    // Merge and sort by date
    const movements = [];
    for (const ing of ingresos) {
      movements.push({
        fecha: ing.fecha,
        tipo: 'Ingreso',
        cantidad: ing.cantidad,
        precio: ing.precio || 0
      });
    }
    for (const ven of ventas) {
      movements.push({
        fecha: ven.fecha,
        tipo: 'Venta',
        cantidad: ven.cantidad,
        precio: ven.precio || 0
      });
    }

    movements.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // Calculate running stock
    let runningStock = 0;
    for (const mov of movements) {
      if (mov.tipo === 'Ingreso') {
        runningStock += mov.cantidad;
      } else {
        runningStock -= mov.cantidad;
      }
      mov.stock_resultante = runningStock;
    }

    res.json({
      producto: prodRows[0],
      movimientos: movements
    });
  } catch (err) {
    res.status(500).json({ error: err.message || err.code || 'Error interno del servidor' });
  }
});

module.exports = router;

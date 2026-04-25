const { Router } = require('express');
const pool = require('../db');

const router = Router();

// POST /api/ventas - create venta with details
// Stock is updated automatically by trigger (trg_disminuir_stock_venta)
// Insufficient stock is blocked by trigger (trg_no_stock_negativo) with SQLSTATE 45000
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { fecha_venta, observacion, id_interlocutor, id_medio_pago, detalles } = req.body;

    if (!detalles || !detalles.length) {
      return res.status(400).json({ error: 'Debe incluir al menos un detalle de venta' });
    }

    await conn.beginTransaction();

    let total_venta = 0;
    for (const detalle of detalles) {
      total_venta += detalle.cantidad_vendida * detalle.precio_unitario;
    }

    const [ventaResult] = await conn.query(
      `INSERT INTO venta (fecha_venta, total_venta, observacion, id_interlocutor, id_medio_pago)
       VALUES (?, ?, ?, ?, ?)`,
      [fecha_venta || new Date(), total_venta, observacion || null, id_interlocutor || null, id_medio_pago]
    );

    const id_venta = ventaResult.insertId;

    for (const detalle of detalles) {
      const subtotal = detalle.cantidad_vendida * detalle.precio_unitario;
      await conn.query(
        `INSERT INTO detalle_venta
           (cantidad_vendida, precio_unitario, subtotal, id_venta, id_producto)
         VALUES (?, ?, ?, ?, ?)`,
        [detalle.cantidad_vendida, detalle.precio_unitario, subtotal, id_venta, detalle.id_producto]
      );
    }

    await conn.commit();
    res.status(201).json({ id_venta, total_venta, message: 'Venta registrada correctamente' });
  } catch (err) {
    await conn.rollback();

    if (err.sqlState === '45000') {
      return res.status(400).json({ error: 'Stock insuficiente: ' + err.message });
    }

    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;

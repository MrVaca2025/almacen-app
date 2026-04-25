const { Router } = require('express');
const pool = require('../db');

const router = Router();

// POST /api/ingresos - create ingreso with details
// Stock is updated automatically by trigger (trg_aumentar_stock_ingreso)
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { fecha_ingreso, observacion, id_interlocutor, detalles } = req.body;

    if (!detalles || !detalles.length) {
      return res.status(400).json({ error: 'Debe incluir al menos un detalle de ingreso' });
    }

    await conn.beginTransaction();

    const [ingresoResult] = await conn.query(
      `INSERT INTO ingreso (fecha_ingreso, observacion, id_interlocutor)
       VALUES (?, ?, ?)`,
      [fecha_ingreso || new Date(), observacion || null, id_interlocutor]
    );

    const id_ingreso = ingresoResult.insertId;

    for (const detalle of detalles) {
      await conn.query(
        `INSERT INTO detalle_ingreso
           (cantidad_ingresada, precio_compra, estado_recepcion, motivo_rechazo, id_ingreso, id_producto)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          detalle.cantidad_ingresada,
          detalle.precio_compra || null,
          detalle.estado_recepcion || 'aceptado',
          detalle.motivo_rechazo || null,
          id_ingreso,
          detalle.id_producto
        ]
      );
    }

    await conn.commit();
    res.status(201).json({ id_ingreso, message: 'Ingreso registrado correctamente' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;

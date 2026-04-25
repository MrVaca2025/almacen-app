INSERT INTO producto 
(nombre, descripcion, precio_venta, stock_actual, stock_minimo, unidad_venta, unidad_compra, factor_conversion, activo, id_categoria)
VALUES
('Coca Cola 350ml', 'Bebida lata', 800, 0, 10, 'unidad', 'caja', 24, TRUE, 1),
('Pan hallulla', 'Pan fresco', 200, 0, 20, 'unidad', 'unidad', 1, TRUE, 3),
('Leche 1L', 'Leche entera', 1200, 0, 15, 'unidad', 'caja', 12, TRUE, 4);

SELECT * FROM producto;
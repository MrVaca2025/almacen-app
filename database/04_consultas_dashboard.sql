USE almacen_db;

-- =====================================
-- DASHBOARD GENERAL (KPIs)
-- =====================================
SELECT 
    (SELECT COUNT(*) FROM producto WHERE activo = TRUE) AS productos_activos,
    (SELECT COUNT(*) FROM venta) AS total_ventas,
    (SELECT COUNT(*) FROM ingreso) AS total_ingresos,
    (SELECT SUM(total_venta) FROM venta) AS monto_total_vendido,
    (SELECT COUNT(*) FROM producto 
        WHERE stock_actual <= stock_minimo AND activo = TRUE) AS productos_bajo_stock;

-- =====================================
-- KPI AVANZADO (VENTAS)
-- =====================================
SELECT 
    SUM(total_venta) AS ventas_totales,
    COUNT(DISTINCT id_venta) AS numero_ventas,
    ROUND(SUM(total_venta) / COUNT(DISTINCT id_venta), 0) AS ticket_promedio
FROM venta;

-- =====================================
-- PRODUCTOS BAJO STOCK (DETALLE)
-- =====================================
SELECT 
    nombre,
    stock_actual,
    stock_minimo
FROM producto
WHERE stock_actual <= stock_minimo;

-- =====================================
-- PRODUCTOS CRÍTICOS (PRIORIDAD)
-- =====================================
SELECT 
    nombre,
    stock_actual,
    stock_minimo,
    (stock_minimo - stock_actual) AS deficit
FROM producto
WHERE stock_actual <= stock_minimo
ORDER BY deficit DESC;

-- =====================================
-- VALORIZACIÓN DE INVENTARIO
-- =====================================
SELECT 
    nombre,
    stock_actual,
    precio_venta,
    stock_actual * precio_venta AS valor_total_stock
FROM producto;

-- =====================================
-- HISTORIAL DE VENTAS
-- =====================================
SELECT 
    v.id_venta,
    v.fecha_venta,
    v.total_venta,
    mp.nombre_medio_pago
FROM venta v
JOIN medio_pago mp ON v.id_medio_pago = mp.id_medio_pago;

-- =====================================
-- DETALLE DE VENTAS
-- =====================================
SELECT 
    v.id_venta,
    v.fecha_venta,
    p.nombre AS producto,
    dv.cantidad_vendida,
    dv.precio_unitario,
    dv.subtotal
FROM detalle_venta dv
JOIN venta v ON dv.id_venta = v.id_venta
JOIN producto p ON dv.id_producto = p.id_producto;

-- =====================================
-- PRODUCTOS MÁS VENDIDOS (UNIDADES)
-- =====================================
SELECT 
    p.nombre,
    SUM(dv.cantidad_vendida) AS total_vendido
FROM detalle_venta dv
JOIN producto p ON dv.id_producto = p.id_producto
GROUP BY p.nombre
ORDER BY total_vendido DESC;

-- =====================================
-- PRODUCTOS MÁS RENTABLES
-- =====================================
SELECT 
    p.nombre,
    SUM(dv.cantidad_vendida) AS unidades_vendidas,
    SUM(dv.subtotal) AS ingreso_generado
FROM detalle_venta dv
JOIN producto p ON dv.id_producto = p.id_producto
GROUP BY p.nombre
ORDER BY ingreso_generado DESC;

-- =====================================
-- HISTORIAL DE INGRESOS (COMPRAS)
-- =====================================
SELECT 
    i.id_ingreso,
    i.fecha_ingreso,
    ic.nombre AS proveedor,
    i.observacion
FROM ingreso i
JOIN interlocutor_comercial ic 
    ON i.id_interlocutor = ic.id_interlocutor;
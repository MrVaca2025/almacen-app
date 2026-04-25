USE almacen_db;

DELIMITER $$

CREATE TRIGGER trg_aumentar_stock_ingreso
AFTER INSERT ON detalle_ingreso
FOR EACH ROW
BEGIN
    IF NEW.estado_recepcion = 'aceptado' THEN
        UPDATE producto
        SET stock_actual = stock_actual + NEW.cantidad_ingresada
        WHERE id_producto = NEW.id_producto;
    END IF;
END$$

CREATE TRIGGER trg_disminuir_stock_venta
AFTER INSERT ON detalle_venta
FOR EACH ROW
BEGIN
    UPDATE producto
    SET stock_actual = stock_actual - NEW.cantidad_vendida
    WHERE id_producto = NEW.id_producto;
END$$

DELIMITER ;
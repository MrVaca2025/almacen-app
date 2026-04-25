DROP TRIGGER IF EXISTS trg_no_stock_negativo;

DELIMITER $$

CREATE TRIGGER trg_no_stock_negativo
BEFORE UPDATE ON producto
FOR EACH ROW
BEGIN
    IF NEW.stock_actual < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El stock no puede ser negativo';
    END IF;
END$$

DELIMITER ;
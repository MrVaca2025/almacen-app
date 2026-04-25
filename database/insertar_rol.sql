USE almacen_db;

-- =====================
-- ROLES
-- =====================
INSERT INTO rol (nombre_rol) VALUES
('Cliente'),
('Proveedor');

-- =====================
-- MEDIOS DE PAGO
-- =====================
INSERT INTO medio_pago (nombre_medio_pago) VALUES
('Efectivo'),
('Tarjeta'),
('Transferencia');

-- =====================
-- CATEGORIAS
-- =====================
INSERT INTO categoria (nombre, descripcion) VALUES
('Bebidas', 'Bebidas en general'),
('Snacks', 'Galletas, papas fritas, etc'),
('Alimentos no perecibles', 'Productos de larga duración'),
('Lácteos', 'Leche, yogurt, queso'),
('Aseo y limpieza', 'Productos de limpieza'),
('Higiene personal', 'Uso personal'),
('Mascotas', 'Alimentos y accesorios'),
('Librería', 'Útiles escolares'),
('Otros', 'Otros productos');

-- =====================
-- INTERLOCUTORES
-- =====================
INSERT INTO interlocutor_comercial 
(rut, tipo_interlocutor, nombre, apellido_paterno, apellido_materno, telefono)
VALUES
('11111111-1', 'Persona', 'Juan', 'Perez', 'Soto', '987654321'),
('22222222-2', 'Empresa', 'Distribuidora Central', NULL, NULL, '912345678');

-- =====================
-- ASIGNAR ROLES
-- =====================
-- Juan = Cliente
INSERT INTO interlocutor_rol (id_interlocutor, id_rol)
VALUES (1, 1);

-- Distribuidora = Proveedor
INSERT INTO interlocutor_rol (id_interlocutor, id_rol)
VALUES (2, 2);

SELECT * FROM categoria;
SELECT * FROM medio_pago;
SELECT * FROM interlocutor_comercial;
SELECT * FROM rol;
SELECT * FROM interlocutor_rol;
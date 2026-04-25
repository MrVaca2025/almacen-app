CREATE DATABASE almacen_db;
USE almacen_db;

-- =====================
-- INTERLOCUTOR
-- =====================
CREATE TABLE interlocutor_comercial (
    id_interlocutor INT AUTO_INCREMENT PRIMARY KEY,
    rut VARCHAR(12) NOT NULL UNIQUE,
    tipo_interlocutor VARCHAR(20) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(80),
    apellido_materno VARCHAR(80),
    telefono VARCHAR(20),
    direccion VARCHAR(150),
    correo VARCHAR(100)
);

CREATE TABLE rol (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE interlocutor_rol (
    id_interlocutor_rol INT AUTO_INCREMENT PRIMARY KEY,
    id_interlocutor INT NOT NULL,
    id_rol INT NOT NULL,
    UNIQUE(id_interlocutor, id_rol),
    FOREIGN KEY (id_interlocutor) REFERENCES interlocutor_comercial(id_interlocutor),
    FOREIGN KEY (id_rol) REFERENCES rol(id_rol)
);

-- =====================
-- CATEGORIA Y PRODUCTO
-- =====================
CREATE TABLE categoria (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    descripcion VARCHAR(200)
);

CREATE TABLE producto (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(200),
    precio_venta DECIMAL(10,2) NOT NULL,
    stock_actual INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL,
    unidad_venta VARCHAR(30) NOT NULL,
    unidad_compra VARCHAR(30) NOT NULL,
    factor_conversion INT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    id_categoria INT NOT NULL,
    FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria)
);

-- =====================
-- MEDIO DE PAGO
-- =====================
CREATE TABLE medio_pago (
    id_medio_pago INT AUTO_INCREMENT PRIMARY KEY,
    nombre_medio_pago VARCHAR(50) NOT NULL UNIQUE
);

-- =====================
-- INGRESO
-- =====================
CREATE TABLE ingreso (
    id_ingreso INT AUTO_INCREMENT PRIMARY KEY,
    fecha_ingreso DATETIME NOT NULL,
    observacion VARCHAR(250),
    id_interlocutor INT NOT NULL,
    FOREIGN KEY (id_interlocutor) REFERENCES interlocutor_comercial(id_interlocutor)
);

CREATE TABLE detalle_ingreso (
    id_detalle_ingreso INT AUTO_INCREMENT PRIMARY KEY,
    cantidad_ingresada INT NOT NULL,
    precio_compra DECIMAL(10,2),
    estado_recepcion VARCHAR(30) NOT NULL,
    motivo_rechazo VARCHAR(200),
    id_ingreso INT NOT NULL,
    id_producto INT NOT NULL,
    FOREIGN KEY (id_ingreso) REFERENCES ingreso(id_ingreso),
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
);

-- =====================
-- VENTA
-- =====================
CREATE TABLE venta (
    id_venta INT AUTO_INCREMENT PRIMARY KEY,
    fecha_venta DATETIME NOT NULL,
    total_venta DECIMAL(10,2) NOT NULL,
    observacion VARCHAR(250),
    id_interlocutor INT,
    id_medio_pago INT NOT NULL,
    FOREIGN KEY (id_interlocutor) REFERENCES interlocutor_comercial(id_interlocutor),
    FOREIGN KEY (id_medio_pago) REFERENCES medio_pago(id_medio_pago)
);

CREATE TABLE detalle_venta (
    id_detalle_venta INT AUTO_INCREMENT PRIMARY KEY,
    cantidad_vendida INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    id_venta INT NOT NULL,
    id_producto INT NOT NULL,
    FOREIGN KEY (id_venta) REFERENCES venta(id_venta),
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
);

-- =====================
-- INVENTARIO
-- =====================
CREATE TABLE conteo_inventario (
    id_conteo INT AUTO_INCREMENT PRIMARY KEY,
    fecha_conteo DATETIME NOT NULL,
    observacion VARCHAR(250)
);

CREATE TABLE detalle_conteo (
    id_detalle_conteo INT AUTO_INCREMENT PRIMARY KEY,
    stock_sistema INT NOT NULL,
    stock_fisico INT NOT NULL,
    diferencia_stock INT NOT NULL,
    id_conteo INT NOT NULL,
    id_producto INT NOT NULL,
    FOREIGN KEY (id_conteo) REFERENCES conteo_inventario(id_conteo),
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
);
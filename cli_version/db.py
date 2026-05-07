import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            descripcion TEXT DEFAULT '',
            precio_venta REAL NOT NULL DEFAULT 0,
            stock_actual INTEGER NOT NULL DEFAULT 0,
            stock_minimo INTEGER NOT NULL DEFAULT 0,
            activo INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS ventas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            total REAL NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS detalle_venta (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venta_id INTEGER NOT NULL,
            producto_id INTEGER NOT NULL,
            cantidad INTEGER NOT NULL,
            precio_unitario REAL NOT NULL,
            subtotal REAL NOT NULL,
            FOREIGN KEY (venta_id) REFERENCES ventas(id),
            FOREIGN KEY (producto_id) REFERENCES productos(id)
        );

        CREATE TABLE IF NOT EXISTS ingresos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            total REAL NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS detalle_ingreso (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ingreso_id INTEGER NOT NULL,
            producto_id INTEGER NOT NULL,
            cantidad INTEGER NOT NULL,
            precio_compra REAL NOT NULL,
            subtotal REAL NOT NULL,
            FOREIGN KEY (ingreso_id) REFERENCES ingresos(id),
            FOREIGN KEY (producto_id) REFERENCES productos(id)
        );
    """)

    conn.commit()
    conn.close()

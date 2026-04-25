Readme.md

# Sistema de Gestión de Almacén

## 1. Descripción general

Este proyecto corresponde a un sistema de gestión para un almacén de barrio profesionalizado. Su objetivo es apoyar el registro de productos, ingresos de mercadería, ventas, control de stock e identificación de productos bajo stock mínimo.

El sistema utiliza una base de datos MySQL llamada `almacen_db`, diseñada a partir de un modelo de clases y un modelo relacional previamente definidos.

## 2. Objetivo del sistema

Permitir que el dueño o encargado del almacén pueda:

- Registrar productos.
- Clasificar productos por categoría.
- Registrar ingresos de mercadería.
- Registrar ventas.
- Actualizar automáticamente el stock.
- Evitar ventas con stock insuficiente.
- Consultar productos bajo stock mínimo.
- Revisar indicadores básicos del negocio.

## 3. Modelo general

El sistema utiliza las siguientes tablas principales:

- `interlocutor_comercial`
- `rol`
- `interlocutor_rol`
- `categoria`
- `producto`
- `medio_pago`
- `ingreso`
- `detalle_ingreso`
- `venta`
- `detalle_venta`
- `conteo_inventario`
- `detalle_conteo`

## 4. Decisiones de diseño importantes

### Interlocutor comercial

Se utiliza la entidad `interlocutor_comercial` para representar tanto personas naturales como empresas. Esto permite que un mismo actor pueda tener distintos roles, por ejemplo cliente y proveedor.

Los roles se gestionan mediante:

- `rol`
- `interlocutor_rol`

De esta forma se evita duplicar información creando tablas separadas para clientes y proveedores.

### Producto

La tabla `producto` es la entidad central del sistema. Contiene información como precio, stock actual, stock mínimo, unidad de venta, unidad de compra y factor de conversión.

El stock se controla en la unidad de venta.

### Stock mínimo

El campo `stock_minimo` permite detectar productos que requieren reposición.

### Producto activo

El campo `activo` permite mantener productos en la base de datos sin borrarlos, aunque ya no se vendan.

## 5. Reglas de negocio

- Todo producto debe pertenecer a una categoría.
- Solo productos activos deben estar disponibles para venta.
- Una venta puede registrarse sin cliente identificado.
- Si una venta tiene cliente, este debe existir como interlocutor comercial.
- Un ingreso debe estar asociado a un interlocutor comercial con rol proveedor.
- Una venta puede contener varios productos.
- Un ingreso puede contener varios productos.
- El stock aumenta automáticamente al insertar un detalle de ingreso aceptado.
- El stock disminuye automáticamente al insertar un detalle de venta.
- No se permite vender más cantidad que el stock disponible.
- No se permite que el stock quede negativo.
- El sistema permite consultar productos bajo stock mínimo.

## 6. Scripts SQL del proyecto

Los scripts se encuentran separados para mayor orden:

- `crear_db.sql`: crea la base de datos y las tablas.
- `insertar_rol.sql`: inserta roles, medios de pago, categorías e interlocutores iniciales.
- `insertar_producto.sql`: inserta productos de prueba.
- `trigger_detalle.sql`: crea triggers para actualizar stock automáticamente.
- `trigger_no_negative_stock.sql`: evita stock negativo.
- `04_consultas_dashboard.sql`: contiene consultas para visualizar indicadores y reportes básicos.

## 7. Funcionamiento del stock

El sistema utiliza triggers en MySQL para automatizar el stock.

Cuando se inserta un registro en `detalle_ingreso`, el stock del producto aumenta automáticamente si el estado de recepción es aceptado.

Cuando se inserta un registro en `detalle_venta`, el stock del producto disminuye automáticamente.

Además, si se intenta vender más cantidad que el stock disponible, MySQL bloquea la operación y muestra un error de stock insuficiente.

## 8. MVP de la aplicación

La primera versión de la aplicación debe incluir:

- Listado de productos.
- Creación y edición de productos.
- Registro de ingresos de mercadería.
- Registro de ventas con múltiples productos.
- Consulta de stock actual.
- Consulta de productos bajo stock mínimo.
- Dashboard básico con ventas, ingresos, productos activos y productos críticos.

No se considera en la primera versión:

- Login de usuarios.
- Predicción de stock.
- Boletas.
- Códigos de barra.
- Reportes avanzados.
- Gestión de permisos.

## 9. Tecnologías sugeridas

- Base de datos: MySQL
- Backend: Node.js + Express
- Frontend: HTML, CSS y JavaScript simple
- Editor: Visual Studio Code

## 10. Backend (Node.js + Express)

### Requisitos previos (Windows)

- [Node.js](https://nodejs.org/) v18 o superior instalado.
- MySQL 8 corriendo en `localhost:3306` con la base de datos `almacen_db` creada (ejecutar los scripts en `/database` en orden).

### Instalación

```bash
cd backend
npm install
```

### Configuración

Crear un archivo `.env` dentro de `backend/` basado en `.env.example`:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=almacen_db
DB_PORT=3306
PORT=3000
```

### Ejecutar en modo desarrollo

```bash
cd backend
npm run dev
```

### Verificar que funciona

Abrir en el navegador o con `curl`:

```
GET http://localhost:3000/api/health
```

Respuesta esperada:
```json
{ "status": "OK", "timestamp": "2025-04-25T..." }
```

### Endpoints disponibles

| Método | Ruta                      | Descripción                          |
|--------|---------------------------|--------------------------------------|
| GET    | /api/health               | Health check                         |
| GET    | /api/productos            | Listar todos los productos           |
| POST   | /api/productos            | Crear un producto                    |
| GET    | /api/productos/bajo-stock | Productos bajo stock mínimo          |
| POST   | /api/ingresos             | Registrar ingreso de mercadería      |
| POST   | /api/ventas               | Registrar una venta                  |
| GET    | /api/dashboard            | KPIs y resumen del negocio           |

### Ejemplos de peticiones

#### Crear un producto

```bash
curl -X POST http://localhost:3000/api/productos \
  -H "Content-Type: application/json" \
  -d "{\"nombre\": \"Galletas\", \"descripcion\": \"Galletas de chocolate\", \"precio_venta\": 500, \"stock_minimo\": 10, \"unidad_venta\": \"unidad\", \"unidad_compra\": \"caja\", \"factor_conversion\": 12, \"activo\": true, \"id_categoria\": 2}"
```

#### Registrar un ingreso de mercadería

```bash
curl -X POST http://localhost:3000/api/ingresos \
  -H "Content-Type: application/json" \
  -d "{\"id_interlocutor\": 2, \"observacion\": \"Compra semanal\", \"detalles\": [{\"id_producto\": 1, \"cantidad_ingresada\": 48, \"precio_compra\": 500, \"estado_recepcion\": \"aceptado\"}]}"
```

#### Registrar una venta

```bash
curl -X POST http://localhost:3000/api/ventas \
  -H "Content-Type: application/json" \
  -d "{\"id_medio_pago\": 1, \"observacion\": \"Venta al contado\", \"detalles\": [{\"id_producto\": 1, \"cantidad_vendida\": 2, \"precio_unitario\": 800}]}"
```

#### Consultar dashboard

```bash
curl http://localhost:3000/api/dashboard
```

## 11. Próximos pasos

1. Crear frontend simple para operar el sistema.
2. Probar flujo completo: ingreso, venta y actualización automática de stock.
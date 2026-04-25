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

### 10.1 Requisitos previos (Windows)

1. Instalar [Node.js](https://nodejs.org/) v18 o superior.
2. Tener MySQL 8 corriendo en `localhost:3306`.
3. Crear la base de datos ejecutando los scripts SQL en orden:
   ```sql
   source database/crear_db.sql;
   source database/insertar_rol.sql;
   source database/insertar_producto.sql;
   source database/trigger_detalles.sql;
   source database/trigger_no_negative_stock.sql;
   ```

### 10.2 Instalación paso a paso

**Paso 1** — Instalar dependencias:

```bash
cd backend
npm install
```

**Paso 2** — Crear archivo de configuración:

```bash
copy .env.example .env
```

**Paso 3** — Editar `.env` con tus credenciales de MySQL:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=almacen_db
DB_PORT=3306
PORT=3000
```

> **Nota:** Nunca subas el archivo `.env` al repositorio. Ya está incluido en `.gitignore`.

**Paso 4** — Iniciar el servidor en modo desarrollo:

```bash
npm run dev
```

**Paso 5** — Verificar que funciona:

Abrir en el navegador: `http://localhost:3000/api/health`

Respuesta esperada:

```json
{ "status": "OK", "timestamp": "2025-04-25T..." }
```

### 10.3 Estructura del backend

```
backend/
├── server.js              # Punto de entrada, configura Express y monta rutas
├── db.js                  # Pool de conexiones MySQL (mysql2/promise)
├── routes/
│   ├── productos.js       # CRUD de productos y consulta bajo stock
│   ├── ingresos.js        # Registro de ingresos (stock vía trigger)
│   ├── ventas.js          # Registro de ventas (stock vía trigger)
│   └── dashboard.js       # KPIs del negocio
├── .env.example           # Plantilla de variables de entorno
├── .gitignore             # Ignora node_modules/ y .env
└── package.json           # Dependencias y scripts
```

### 10.4 Endpoints disponibles

| Método | Ruta                      | Descripción                          |
|--------|---------------------------|--------------------------------------|
| GET    | /api/health               | Health check                         |
| GET    | /api/productos            | Listar todos los productos           |
| POST   | /api/productos            | Crear un producto                    |
| GET    | /api/productos/bajo-stock | Productos bajo stock mínimo          |
| POST   | /api/ingresos             | Registrar ingreso de mercadería      |
| POST   | /api/ventas               | Registrar una venta                  |
| GET    | /api/dashboard            | KPIs y resumen del negocio           |

### 10.5 Interacción con triggers de MySQL

El backend **no modifica el stock directamente**. Todo se maneja con triggers en la base de datos:

| Trigger                        | Tabla afectada     | Efecto                                                         |
|-------------------------------|--------------------|----------------------------------------------------------------|
| `trg_aumentar_stock_ingreso`  | `detalle_ingreso`  | Aumenta `stock_actual` si `estado_recepcion = 'aceptado'`      |
| `trg_disminuir_stock_venta`   | `detalle_venta`    | Disminuye `stock_actual` por `cantidad_vendida`                |
| `trg_no_stock_negativo`       | `producto`         | Bloquea UPDATE si `stock_actual` quedaría negativo (SQLSTATE 45000) |

Cuando una venta intenta vender más stock del disponible, el trigger lanza un error que el backend captura y devuelve como HTTP 400.

### 10.6 Ejemplos de peticiones

#### Crear un producto

```bash
curl -X POST http://localhost:3000/api/productos ^
  -H "Content-Type: application/json" ^
  -d "{\"nombre\": \"Galletas\", \"descripcion\": \"Galletas de chocolate\", \"precio_venta\": 500, \"stock_minimo\": 10, \"unidad_venta\": \"unidad\", \"unidad_compra\": \"caja\", \"factor_conversion\": 12, \"activo\": true, \"id_categoria\": 2}"
```

#### Registrar un ingreso de mercadería

```bash
curl -X POST http://localhost:3000/api/ingresos ^
  -H "Content-Type: application/json" ^
  -d "{\"id_interlocutor\": 2, \"observacion\": \"Compra semanal\", \"detalles\": [{\"id_producto\": 1, \"cantidad_ingresada\": 48, \"precio_compra\": 500, \"estado_recepcion\": \"aceptado\"}]}"
```

> Esto aumentará automáticamente el stock del producto 1 en 48 unidades (vía trigger).

#### Registrar una venta

```bash
curl -X POST http://localhost:3000/api/ventas ^
  -H "Content-Type: application/json" ^
  -d "{\"id_medio_pago\": 1, \"observacion\": \"Venta al contado\", \"detalles\": [{\"id_producto\": 1, \"cantidad_vendida\": 2, \"precio_unitario\": 800}]}"
```

> Esto disminuirá automáticamente el stock del producto 1 en 2 unidades (vía trigger).
> Si no hay stock suficiente, retorna error 400.

#### Consultar productos bajo stock

```bash
curl http://localhost:3000/api/productos/bajo-stock
```

#### Consultar dashboard

```bash
curl http://localhost:3000/api/dashboard
```

> **Nota para Windows:** Los ejemplos de la sección anterior usan `^` (CMD). En PowerShell, usar `` ` `` o escribir el comando en una sola línea.

### 10.7 Guía de pruebas con PowerShell (Windows)

Abrir PowerShell y ejecutar cada comando. Se incluye la respuesta esperada.

**Paso 1 — Verificar que el servidor está corriendo:**

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Respuesta esperada:

```
status timestamp
------ ---------
OK     2025-04-25T12:00:00.000Z
```

**Paso 2 — Listar productos:**

```powershell
Invoke-RestMethod http://localhost:3000/api/productos
```

Respuesta esperada (si ejecutaste `insertar_producto.sql`):

```
id_producto : 1
nombre      : Coca Cola 350ml
precio_venta: 800.00
stock_actual: 0
...
```

**Paso 3 — Crear un producto:**

```powershell
$body = @{
    nombre = "Galletas"
    descripcion = "Galletas de chocolate"
    precio_venta = 500
    stock_minimo = 10
    unidad_venta = "unidad"
    unidad_compra = "caja"
    factor_conversion = 12
    activo = $true
    id_categoria = 2
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/productos -ContentType "application/json" -Body $body
```

Respuesta esperada:

```
id_producto message
----------- -------
4           Producto creado
```

**Paso 4 — Registrar un ingreso (stock aumenta automáticamente):**

```powershell
$body = @{
    id_interlocutor = 2
    observacion = "Compra semanal"
    detalles = @(
        @{
            id_producto = 1
            cantidad_ingresada = 48
            precio_compra = 500
            estado_recepcion = "aceptado"
        }
    )
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/ingresos -ContentType "application/json" -Body $body
```

Respuesta esperada:

```
id_ingreso message
---------- -------
1          Ingreso registrado correctamente
```

> Verificar que el stock aumentó: `Invoke-RestMethod http://localhost:3000/api/productos`
> El producto 1 (Coca Cola) debería tener `stock_actual = 48`.

**Paso 5 — Registrar una venta (stock disminuye automáticamente):**

```powershell
$body = @{
    id_medio_pago = 1
    observacion = "Venta al contado"
    detalles = @(
        @{
            id_producto = 1
            cantidad_vendida = 2
            precio_unitario = 800
        }
    )
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/ventas -ContentType "application/json" -Body $body
```

Respuesta esperada:

```
id_venta total_venta message
-------- ----------- -------
1        1600        Venta registrada correctamente
```

> Verificar que el stock bajó: `Invoke-RestMethod http://localhost:3000/api/productos`
> El producto 1 debería tener `stock_actual = 46`.

**Paso 6 — Probar error de stock insuficiente:**

```powershell
$body = @{
    id_medio_pago = 1
    detalles = @(
        @{
            id_producto = 1
            cantidad_vendida = 9999
            precio_unitario = 800
        }
    )
} | ConvertTo-Json -Depth 3

try {
    Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/ventas -ContentType "application/json" -Body $body
} catch {
    $_.ErrorDetails.Message
}
```

Respuesta esperada (error 400):

```json
{"error":"Stock insuficiente: El stock no puede ser negativo"}
```

**Paso 7 — Consultar productos bajo stock:**

```powershell
Invoke-RestMethod http://localhost:3000/api/productos/bajo-stock
```

**Paso 8 — Consultar dashboard:**

```powershell
Invoke-RestMethod http://localhost:3000/api/dashboard
```

Respuesta esperada:

```
kpis                : @{productos_activos=3; total_ventas=1; ...}
ventas              : @{ventas_totales=1600; numero_ventas=1; ticket_promedio=1600}
productos_bajo_stock: {...}
mas_vendidos        : {...}
```

### 10.8 Errores comunes y soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| `ECONNREFUSED` | MySQL no está corriendo o el puerto es incorrecto | Verificar que MySQL está activo: `net start MySQL80` (Windows). Revisar `DB_PORT` en `.env` |
| `ER_ACCESS_DENIED_ERROR` | Usuario o contraseña incorrectos | Revisar `DB_USER` y `DB_PASSWORD` en `.env` |
| `ER_BAD_DB_ERROR` | La base de datos `almacen_db` no existe | Ejecutar `source database/crear_db.sql` en MySQL |
| `ER_NO_SUCH_TABLE` | Las tablas no fueron creadas | Ejecutar todos los scripts SQL en orden (ver sección 10.1) |
| `EADDRINUSE` | El puerto 3000 ya está en uso | Cambiar `PORT` en `.env` a otro valor (ej: 3001) o cerrar el proceso que usa el puerto: `netstat -ano \| findstr :3000` |
| `MODULE_NOT_FOUND` | Dependencias no instaladas | Ejecutar `npm install` dentro de la carpeta `backend/` |
| `Error: Cannot find module 'dotenv'` | Falta ejecutar `npm install` | Ejecutar `cd backend && npm install` |
| `Faltan campos obligatorios` | El cuerpo de la petición POST está incompleto | Revisar que el JSON incluye todos los campos requeridos |
| `El campo id_interlocutor es obligatorio` | POST `/api/ingresos` requiere un proveedor | Incluir `id_interlocutor` con un ID de proveedor válido |
| `El campo id_medio_pago es obligatorio` | POST `/api/ventas` requiere medio de pago | Incluir `id_medio_pago` (1=Efectivo, 2=Tarjeta, 3=Transferencia) |
| `Stock insuficiente` | Se intentó vender más de lo disponible | Verificar stock con GET `/api/productos`. Registrar un ingreso primero |

### 10.9 Flujo de prueba recomendado

Para probar el sistema completo, seguir este orden:

```
1. GET  /api/health              → Verificar que el servidor funciona
2. GET  /api/productos           → Ver productos iniciales (stock = 0)
3. POST /api/productos           → Crear un producto nuevo
4. POST /api/ingresos            → Ingresar mercadería (stock sube vía trigger)
5. GET  /api/productos           → Verificar que el stock aumentó
6. POST /api/ventas              → Vender productos (stock baja vía trigger)
7. GET  /api/productos           → Verificar que el stock bajó
8. POST /api/ventas (exceso)     → Intentar vender más del stock → error 400
9. GET  /api/productos/bajo-stock→ Ver productos bajo stock mínimo
10. GET /api/dashboard            → Ver KPIs del negocio
```

## 11. Frontend (HTML + CSS + JavaScript)

### 11.1 Estructura

```
frontend/
├── index.html    # Página principal con formularios y botones
├── styles.css    # Estilos básicos (layout, tablas, botones, KPIs)
└── app.js        # Lógica con fetch() para comunicarse con la API
```

### 11.2 Cómo funciona

El frontend se comunica con el backend usando `fetch()` (JavaScript vanilla). Todas las peticiones van a `http://localhost:3000` (el servidor Express).

No usa React, Angular ni Vue — solo HTML, CSS y JavaScript puro.

### 11.3 Cómo abrir el frontend

**Requisito:** El backend debe estar corriendo (`npm run dev` en la carpeta `backend/`).

**Opción 1 — Abrir directamente:**

Hacer doble clic en `frontend/index.html` desde el explorador de archivos de Windows.

**Opción 2 — Desde la terminal:**

```powershell
start frontend\index.html
```

### 11.4 Funcionalidades

| Botón / Formulario     | Acción                                      | Endpoint usado              |
|------------------------|---------------------------------------------|-----------------------------|
| Cargar productos       | Muestra todos los productos en una tabla    | GET /api/productos          |
| Ver bajo stock         | Muestra productos bajo stock mínimo         | GET /api/productos/bajo-stock |
| Ver dashboard          | Muestra KPIs del negocio                    | GET /api/dashboard          |
| Registrar venta        | Registra una venta con un producto          | POST /api/ventas            |
| Registrar ingreso      | Registra un ingreso de mercadería           | POST /api/ingresos          |

### 11.5 Flujo de prueba recomendado

Seguir estos pasos en orden para probar el sistema completo:

**Paso 1** — Abrir `frontend/index.html` en el navegador.

**Paso 2** — Hacer clic en **"Cargar productos"**.
- Deberías ver los 3 productos iniciales (Coca Cola, Pan hallulla, Leche) con stock = 0.

**Paso 3** — Registrar un ingreso de mercadería:
- Proveedor (ID): `2` (Distribuidora Central)
- Producto (ID): `1` (Coca Cola)
- Cantidad: `48`
- Precio de compra: `500`
- Clic en **"Registrar ingreso"**
- Debería aparecer: "Ingreso registrado. ID: 1"

**Paso 4** — Hacer clic en **"Cargar productos"** de nuevo.
- Coca Cola debería tener stock_actual = 48 (aumentó por el trigger).

**Paso 5** — Registrar una venta:
- Medio de pago (ID): `1` (Efectivo)
- Producto (ID): `1`
- Cantidad: `5`
- Precio unitario: `800`
- Clic en **"Registrar venta"**
- Debería aparecer: "Venta registrada. ID: 1 | Total: $4000"

**Paso 6** — Hacer clic en **"Cargar productos"**.
- Coca Cola debería tener stock_actual = 43 (bajó por el trigger).

**Paso 7** — Intentar vender más del stock disponible:
- Producto: `1`, Cantidad: `9999`, Precio: `800`
- Debería aparecer un error rojo: "Stock insuficiente"

**Paso 8** — Hacer clic en **"Ver bajo stock"**.
- Muestra los productos que necesitan reposición.

**Paso 9** — Hacer clic en **"Ver dashboard"**.
- Muestra KPIs: productos activos, ventas, ingresos, monto total, etc.

### 11.6 Datos de referencia para pruebas

| Dato | Valores disponibles |
|------|-------------------|
| Medios de pago | 1 = Efectivo, 2 = Tarjeta, 3 = Transferencia |
| Proveedores | 2 = Distribuidora Central |
| Clientes | 1 = Juan Perez |
| Productos | 1 = Coca Cola, 2 = Pan hallulla, 3 = Leche 1L |
| Categorías | 1 = Bebidas, 2 = Snacks, 3 = Alimentos, 4 = Lácteos, ... |

## 12. Próximos pasos

1. Agregar edición de productos desde el frontend.
2. Agregar formulario para crear productos nuevos.
3. Mejorar diseño visual del frontend.
4. Probar flujo completo con múltiples usuarios.
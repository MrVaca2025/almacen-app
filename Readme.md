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
| Ver historial de ventas| Muestra ventas con detalle de productos     | GET /api/ventas             |
| Registrar venta        | Registra una venta con carrito              | POST /api/ventas            |
| Registrar ingreso      | Registra un ingreso de mercadería           | POST /api/ingresos          |

### 11.5 Características UX

**Dropdowns de productos:**
- Los formularios de venta e ingreso usan `<select>` en vez de inputs manuales de ID.
- Al abrir la página, se cargan automáticamente los productos desde `GET /api/productos`.
- Cada opción muestra: `ID — Nombre (Stock: X, $Precio)`.
- Al seleccionar un producto en ventas, el precio se auto-completa.

**Carrito de venta:**
- Permite agregar múltiples productos antes de registrar la venta.
- Botón **"Agregar al carrito"** valida y agrega el producto a una tabla.
- La tabla del carrito muestra: producto, cantidad, precio unitario, subtotal.
- Botón **"X"** rojo para eliminar un item del carrito.
- Botón **"Registrar venta"** envía todos los items del carrito como una sola venta.
- El carrito se limpia después de una venta exitosa.

**Mensajes visuales:**
- **Verde**: operación exitosa (venta registrada, ingreso registrado, producto agregado al carrito).
- **Rojo**: error de validación, stock insuficiente, o error de conexión.
- Después de una venta o ingreso exitoso, los dropdowns y la tabla de productos se actualizan automáticamente.

**Filtro de ventas por fecha:**
- Campos **"Desde"** y **"Hasta"** con selectores de fecha (`<input type="date">`).
- Botón **"Filtrar ventas"** llama a `GET /api/ventas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`.
- Si no se seleccionan fechas, muestra todas las ventas.
- Se pueden usar solo "Desde", solo "Hasta", o ambos.

**Exportar a CSV (Excel):**
- Botón **"Exportar a Excel (CSV)"** genera un archivo `ventas.csv` desde el navegador.
- Se exportan las ventas actualmente mostradas (todas o filtradas).
- Primero se debe cargar el historial con "Ver historial de ventas" o "Filtrar ventas".
- Usa separador `;` y BOM UTF-8 para compatibilidad con Excel en español.
- Columnas: ID venta, Fecha, Medio de pago, Producto, Cantidad, Precio unitario, Subtotal, Total venta.
- Ejemplo de CSV generado:
  ```
  ID venta;Fecha;Medio de pago;Producto;Cantidad;Precio unitario;Subtotal;Total venta
  1;25-04-2026 10:30;Efectivo;Coca Cola;5;800;4000;4000
  2;25-04-2026 11:00;Tarjeta;Pan hallulla;3;600;1800;1800
  ```

### 11.6 Flujo de prueba recomendado

Seguir estos pasos en orden para probar el sistema completo:

**Paso 1** — Abrir `frontend/index.html` en el navegador.
- Los dropdowns de productos se cargan automáticamente.

**Paso 2** — Hacer clic en **"Cargar productos"**.
- Deberías ver los 3 productos iniciales (Coca Cola, Pan hallulla, Leche) con stock = 0.

**Paso 3** — Registrar un ingreso de mercadería:
- Proveedor (ID): `2`
- Seleccionar "Coca Cola" del dropdown de producto.
- Cantidad: `48`
- Precio de compra: `500`
- Clic en **"Registrar ingreso"**
- Debería aparecer mensaje verde: "Ingreso registrado. ID: 1"
- La tabla de productos se actualiza automáticamente (stock = 48).

**Paso 4** — Registrar una venta con carrito:
- Medio de pago: seleccionar "Efectivo"
- Seleccionar "Coca Cola" del dropdown (precio se auto-completa).
- Cantidad: `5`
- Clic en **"Agregar al carrito"** → aparece mensaje verde y tabla del carrito.
- Agregar otro producto si se desea (ej: Pan hallulla).
- Clic en **"Registrar venta"**
- Debería aparecer mensaje verde: "Venta registrada. ID: 1 | Total: $4000"
- El carrito se limpia y la tabla de productos se actualiza.

**Paso 5** — Hacer clic en **"Cargar productos"**.
- Coca Cola debería tener stock_actual = 43 (bajó por el trigger).

**Paso 6** — Intentar vender más del stock disponible:
- Agregar al carrito: Coca Cola, Cantidad: `9999`, Precio: `800`
- Clic en **"Registrar venta"**
- Debería aparecer mensaje rojo: "Error: Stock insuficiente: ..."

**Paso 7** — Ver historial de ventas:
- Clic en **"Ver historial de ventas"**
- La tabla muestra cada venta con sus productos inline: `Coca Cola x5 ($4000)`
- Verificar que la venta registrada en el paso 4 aparece con los detalles correctos.

**Paso 8** — Hacer clic en **"Ver bajo stock"** y **"Ver dashboard"**.
- Verificar que los datos reflejan las operaciones realizadas.

### 11.7 Datos de referencia para pruebas

| Dato | Valores disponibles |
|------|-------------------|
| Medios de pago | Efectivo, Tarjeta, Transferencia (seleccionar del dropdown) |
| Proveedores | 2 = Distribuidora Central |
| Clientes | 1 = Juan Perez |
| Productos | Se cargan automáticamente en los dropdowns |
| Categorías | 1 = Bebidas, 2 = Snacks, 3 = Alimentos, 4 = Lácteos, ... |

### 11.8 localStorage (persistencia local)

El sistema guarda el estado del usuario en `localStorage` para sobrevivir recargas de página:

| Clave localStorage | Dato persistido |
|---|---|
| `almacen_carrito` | Carrito de ventas (array JSON) |
| `almacen_carritoIngreso` | Carrito de ingreso (array JSON) |
| `almacen_filtroDesde` | Filtro "Desde" del historial |
| `almacen_filtroHasta` | Filtro "Hasta" del historial |
| `almacen_medioPago` | Último medio de pago seleccionado |
| `almacen_operador` | Nombre del operador |

**Comportamiento al recargar:**
- Los carritos se restauran con sus productos.
- Los filtros de fecha se restauran.
- El medio de pago se restaura.
- El nombre del operador se restaura.

**Para probar:**
1. Agregar productos al carrito de ventas.
2. Escribir un nombre de operador.
3. Seleccionar un medio de pago.
4. Recargar la página (F5).
5. Verificar que todo se mantiene.

**Para limpiar:** Abrir la consola del navegador (F12) y ejecutar `localStorage.clear()`.

### 11.9 Comprobante de venta (recibo interno)

Después de registrar una venta exitosa, se muestra automáticamente un modal con el comprobante:

- **Venta ID** — identificador de la venta.
- **Fecha** — fecha y hora de registro.
- **Medio de pago** — efectivo, tarjeta o transferencia.
- **Operador** — nombre ingresado en el campo "Operador" (o "—" si está vacío).
- **Tabla de productos** — nombre, cantidad, precio unitario y subtotal por producto.
- **Total** — monto total de la venta.

**Botones:**
- **"Imprimir comprobante"** — abre el diálogo de impresión del navegador (solo se imprime el recibo).
- **"Cerrar"** — cierra el modal.

Este comprobante es **solo interno** y no tiene validez como boleta o factura.

### 11.10 Campo Operador

En la parte superior de la página hay un campo de texto **"Operador"** para ingresar el nombre de quien opera el sistema. Este nombre:
- Se guarda en localStorage automáticamente.
- Se muestra en el comprobante de venta.
- No requiere login ni contraseña.

### 11.11 Gestión de productos (Phase 2)

Desde la tabla de productos se puede:
- **Editar**: click en "✏️ Editar" → abre modal con nombre, precio, stock mínimo y categoría. Los cambios se guardan vía `PUT /api/productos/:id`.
- **Activar/Desactivar**: click en "Activar"/"Desactivar" → cambia el estado del producto vía `PATCH /api/productos/:id/toggle`. Productos inactivos no aparecen en los dropdowns de venta/ingreso.

Validaciones: precio >= 0, stock mínimo >= 0, nombre obligatorio, categoría obligatoria.

### 11.12 Dashboard mejorado (Phase 2)

El dashboard incluye:
- **6 KPI cards**: productos activos, ventas, ingresos, monto total, bajo stock, producto más rentable
- **Gráfico de línea**: ventas por día con curva suavizada y tooltips en CLP
- **Gráfico de barras**: ingresos por producto (top 10 por revenue)
- **Gráfico de torta**: ventas por categoría

### 11.13 Smart alerts (Phase 2)

- **Banner superior**: muestra productos críticos y bajo stock con click para ver detalles
- **Toast notifications**: después de una venta, si algún producto queda en stock bajo o crítico, aparece una notificación temporal en la esquina superior derecha

### 11.14 Endpoints agregados (Phase 2)

| Método | Ruta | Descripción |
|--------|------|-------------|
| PUT | `/api/productos/:id` | Editar nombre, precio, stock mínimo, categoría |
| PATCH | `/api/productos/:id/toggle` | Activar/desactivar producto |
| GET | `/api/productos/categorias` | Listar categorías (para edit modal) |

### 11.15 Crear producto (Phase 3)

Desde "Cargar productos" → click **"➕ Agregar producto"** → modal con campos:
- Nombre, descripción, precio venta, stock mínimo, unidad venta, unidad compra, factor conversión, categoría, estado
- Validaciones: nombre obligatorio, precio >= 0, stock mínimo >= 0, factor > 0, categoría obligatoria
- Se envía via `POST /api/productos`
- Al crear: se cierra modal, se actualiza tabla y dropdowns

### 11.16 Historial de ingresos (Phase 3)

Click **"📥 Historial ingresos"** para ver todos los ingresos registrados.
- Muestra: ID, fecha, proveedor, productos ingresados (inline), total
- Filtrando por fecha: usa los mismos inputs Desde/Hasta + botón "Filtrar ingresos"
- Endpoint: `GET /api/ingresos` con `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` opcionales

### 11.17 Ganancia estimada (Phase 3)

El dashboard muestra "Ganancia estimada" calculada como:
```
ganancia = ingresos_por_ventas - costo_estimado_productos_vendidos
```
- El costo se calcula usando el **precio promedio de compra** de los ingresos registrados
- Se muestra un disclaimer: "Margen estimado usando precio promedio de compra"
- Gráfico adicional: "Rentabilidad estimada por producto" (barras verdes/rojas)

### 11.18 Alertas de recuperación de stock (Phase 3)

Después de un ingreso, si un producto sale de estado "bajo stock" a "OK", aparece un toast:
- "✅ Coca Cola volvió a stock OK (25)"

### 11.19 Endpoints agregados (Phase 3)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/ingresos` | Listar ingresos con detalles |
| GET | `/api/ingresos?desde=&hasta=` | Filtrar ingresos por fecha |

### 11.20 Cómo probar Phase 3

1. **Crear producto**: Cargar productos → "Agregar producto" → llenar campos → "Añadir producto" → verificar en tabla
2. **Historial ingresos**: "Historial ingresos" → verificar tabla con ingresos
3. **Filtrar ingresos**: Poner fechas → "Filtrar ingresos"
4. **Ganancia estimada**: "Ver dashboard" → verificar KPI "Ganancia estimada" y gráfico de rentabilidad
5. **Alerta recovery**: Registrar ingreso de producto bajo stock → verificar toast verde

### 11.21 Login / Autenticación (Phase 4)

El sistema requiere login antes de usar cualquier funcionalidad.

**Usuarios predefinidos:**
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | 1234 | Administrador |
| vendedor | 1234 | Vendedor |

**Flujo:**
1. Se muestra pantalla de login al abrir la app
2. El usuario ingresa credenciales → `POST /api/login`
3. Sesión se guarda en `localStorage` como `almacen_session`
4. Se muestra nombre de usuario y rol en el header
5. "Cerrar sesión" limpia la sesión y vuelve al login
6. Al recargar página, la sesión se restaura automáticamente

### 11.22 Kardex (Movimientos de inventario) (Phase 4)

Cada producto tiene un botón "📋 Kardex" que muestra el historial completo de movimientos:
- **Ingresos** (verde): +cantidad, precio de compra
- **Ventas** (rojo): -cantidad, precio de venta
- Stock resultante acumulado
- Exportable a PDF

**Endpoint:** `GET /api/kardex/:productoId`

### 11.23 Validación estricta de stock (Phase 4)

La validación de stock se aplica en dos niveles:
1. **Frontend**: Verifica stock disponible antes de agregar al carrito
2. **Backend**: Pre-valida stock antes de iniciar la transacción → `"Stock insuficiente para {producto}. Disponible: X, solicitado: Y"`
3. **Trigger DB**: Validación final a nivel de base de datos (ya existente)

### 11.24 Dashboard avanzado (Phase 4)

Nuevos KPIs:
- **Producto más rotado**: Producto con más transacciones de venta
- **Días de stock estimados**: `stock_actual ÷ ventas_diarias_promedio`
- Tooltip sobre margen estimado

### 11.25 Export PDF (Phase 4)

Se puede exportar a PDF:
- Historial de ventas
- Historial de ingresos
- Comprobante de venta (recibo)
- Kardex por producto

Usa `window.open()` + `window.print()` en ventana separada con estilos limpios.

### 11.26 Modularización del código (Phase 4)

`frontend/app.js` se dividió en módulos independientes:

| Archivo | Responsabilidad |
|---------|----------------|
| `js/config.js` | Configuración global, API base, formatCLP, localStorage keys |
| `js/ui.js` | Toasts, mensajes, skeletons, badges, modals, PDF helper |
| `js/auth.js` | Login, logout, session management |
| `js/productos.js` | CRUD de productos, Kardex, bajo stock, alert banner |
| `js/ventas.js` | Carrito de ventas, registro, historial, CSV/PDF export |
| `js/ingresos.js` | Carrito de ingresos, registro, historial, PDF export |
| `js/dashboard.js` | Dashboard, KPIs, Chart.js charts, margin analysis |
| `app.js` | Entry point, localStorage persistence, initialization |

### 11.27 Endpoints agregados (Phase 4)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/login` | Autenticación con usuarios hardcoded |
| GET | `/api/kardex/:productoId` | Movimientos de inventario por producto |

### 11.28 Cómo probar Phase 4

1. **Login**: Abrir app → login con `admin` / `1234` → verificar header muestra usuario
2. **Logout**: Click "Cerrar sesión" → vuelve a pantalla de login
3. **Session restore**: Login → recargar página → sesión se mantiene
4. **Kardex**: Cargar productos → click "📋 Kardex" en un producto → ver movimientos
5. **Stock validation**: Intentar vender más de lo disponible → error "Stock insuficiente"
6. **Dashboard avanzado**: Ver dashboard → verificar "Producto más rotado" y "Días de stock"
7. **PDF export**: Historial ventas → "Exportar PDF" → se abre ventana para imprimir

## 12. Lanzador Unificado (Unified Launcher)

El proyecto incluye un **lanzador unificado** que permite iniciar cualquiera de los dos sistemas desde un solo punto de entrada, sin modificar la lógica de negocio existente.

### 12.1 Estructura del lanzador

```
├── launcher.py     # Lanzador principal (Python, cross-platform)
├── setup.py        # Utilidad de instalación de dependencias
├── start.sh        # Script de inicio para Linux / macOS
└── start.bat       # Script de inicio para Windows
```

### 12.2 Inicio rápido

**Linux / macOS:**

```bash
./start.sh
```

**Windows:**

```bat
start.bat
```

**Cualquier plataforma (con Python 3):**

```bash
python3 launcher.py
```

### 12.3 Menú interactivo

Al ejecutar el lanzador sin argumentos se muestra:

```
╔══════════════════════════════════════════════════╗
║          STOCKCONTROL — Lanzador Unificado       ║
╚══════════════════════════════════════════════════╝

  1. Iniciar versión Web    (Node.js + MySQL)
  2. Iniciar versión CLI    (Python + SQLite)
  3. Ver estado del sistema
  4. Instalar dependencias
  0. Salir
```

### 12.4 Comandos directos (sin menú)

| Comando | Descripción |
|---------|-------------|
| `python3 launcher.py web` | Inicia la versión Web directamente |
| `python3 launcher.py cli` | Inicia la versión CLI directamente |
| `python3 launcher.py status` | Muestra el estado de dependencias |
| `python3 launcher.py setup` | Ejecuta la instalación de dependencias |
| `./start.sh web` | Inicia versión Web (Linux/macOS) |
| `./start.sh cli` | Inicia versión CLI (Linux/macOS) |
| `start.bat web` | Inicia versión Web (Windows) |
| `start.bat cli` | Inicia versión CLI (Windows) |

### 12.5 Instalación de dependencias

```bash
python3 setup.py
```

Esto verifica:
- Node.js y npm (para versión Web)
- Python 3 (para versión CLI)
- Ejecuta `npm install` en `backend/`
- Crea `.env` desde `.env.example` si no existe
- Verifica que `cli_version/main.py` existe

Para solo verificar sin instalar:

```bash
python3 setup.py --check
```

### 12.6 Sistemas disponibles

| Sistema | Tecnología | Base de datos | Interfaz |
|---------|-----------|---------------|----------|
| **Web** | Node.js + Express | MySQL | Navegador (HTML/CSS/JS) |
| **CLI** | Python 3 | SQLite | Terminal |

Ambos sistemas son **completamente independientes** y pueden ejecutarse por separado.

## 13. Próximos pasos

1. Implementar roles con permisos diferenciados.
2. Agregar gestión de proveedores.
3. Probar flujo completo con múltiples usuarios.

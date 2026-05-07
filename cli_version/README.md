# CLI Inventory Management System

A standalone Python console-based inventory management system. This project is completely independent and does not depend on any other codebase or web framework.

## Features

- **Product Management**: Create, edit, activate/deactivate, and list products
- **Sales System**: Register multi-product sales with stock validation and receipt printing
- **Ingresos (Stock In)**: Register multi-product stock entries with purchase price tracking
- **Kardex**: View complete inventory movement history per product with running stock calculation
- **Dashboard**: Analytics overview with revenue, profit, most sold products, and low stock alerts

## Tech Stack

- Python 3
- SQLite3 (standard library)
- No external dependencies required

## Project Structure

```
cli_version/
├── main.py              # Entry point and CLI menu
├── db.py                # Database connection and initialization
├── database.db          # SQLite database (auto-created)
├── README.md            # This file
├── models/
│   ├── productos.py     # Product CRUD operations
│   ├── ventas.py        # Sales registration and receipt
│   ├── ingresos.py      # Stock-in registration
│   ├── kardex.py        # Inventory movement history
│   └── dashboard.py     # Analytics and reporting
└── utils/
    ├── formatters.py    # Console output formatting
    └── validators.py    # Input validation helpers
```

## Installation

No installation needed. Just make sure you have Python 3 installed.

```bash
python3 --version
```

## How to Run

```bash
cd cli_version
python3 main.py
```

The database file (`database.db`) is created automatically on first run.

## Main Menu

```
==================================================
          INVENTORY SYSTEM (CLI)
==================================================
  1. View products
  2. Create product
  3. Edit product
  4. Activate/Deactivate product
  5. Register ingreso (stock in)
  6. Register sale
  7. View kardex
  8. Dashboard
  0. Exit
```

## Example Workflow

### 1. Create Products

Select option `2` and enter product details:
- Name, description, sale price, initial stock, and minimum stock level

### 2. Register an Ingreso (Stock In)

Select option `5` to add stock:
- Choose products by ID
- Enter quantity and purchase price per unit
- Confirm to update stock automatically

### 3. Register a Sale

Select option `6` to register a sale:
- Choose active products by ID
- Enter quantity (validated against available stock)
- Add multiple products to the cart
- Review receipt with subtotals and total
- Confirm to finalize and update stock

### 4. View Kardex

Select option `7` to view movement history:
- Choose a product to see all ingresos and sales
- Running stock is calculated dynamically
- Shows date, type, quantity, price, and resulting stock

### 5. Dashboard

Select option `8` to see analytics:
- Total revenue and total ingresos
- Estimated profit
- Most sold product
- Low stock alerts
- Top 5 products by revenue

## Database Schema

### productos
| Column       | Type    | Description              |
|-------------|---------|--------------------------|
| id          | INTEGER | Primary key              |
| nombre      | TEXT    | Product name (required)  |
| descripcion | TEXT    | Description              |
| precio_venta| REAL    | Sale price               |
| stock_actual| INTEGER | Current stock            |
| stock_minimo| INTEGER | Minimum stock threshold  |
| activo      | INTEGER | Active flag (1/0)        |

### ventas
| Column | Type    | Description         |
|--------|---------|---------------------|
| id     | INTEGER | Primary key         |
| fecha  | TEXT    | Date/time of sale   |
| total  | REAL    | Sale total          |

### detalle_venta
| Column          | Type    | Description          |
|----------------|---------|----------------------|
| id             | INTEGER | Primary key          |
| venta_id       | INTEGER | FK to ventas         |
| producto_id    | INTEGER | FK to productos      |
| cantidad       | INTEGER | Quantity sold        |
| precio_unitario| REAL    | Unit price at sale   |
| subtotal       | REAL    | Line total           |

### ingresos
| Column | Type    | Description           |
|--------|---------|----------------------|
| id     | INTEGER | Primary key           |
| fecha  | TEXT    | Date/time of ingreso  |
| total  | REAL    | Ingreso total         |

### detalle_ingreso
| Column        | Type    | Description            |
|--------------|---------|------------------------|
| id           | INTEGER | Primary key            |
| ingreso_id   | INTEGER | FK to ingresos         |
| producto_id  | INTEGER | FK to productos        |
| cantidad     | INTEGER | Quantity received      |
| precio_compra| REAL    | Purchase price per unit|
| subtotal     | REAL    | Line total             |

## Stock Validation

- Sales check available stock BEFORE confirming
- Stock in cart is accounted for (same product added multiple times)
- Negative stock is never allowed
- Stock updates happen atomically within the sale/ingreso transaction

## How Kardex Works

The Kardex reconstructs the full movement history of a product by:

1. Querying all `detalle_ingreso` entries (stock increases)
2. Querying all `detalle_venta` entries (stock decreases)
3. Sorting all movements chronologically
4. Calculating a running stock balance from zero

This provides a complete audit trail of every unit that entered or left inventory.

## Standalone Confirmation

This project is **completely standalone**:
- No dependency on any web framework or existing codebase
- Uses only Python standard library (sqlite3, os, sys)
- Self-contained database created at runtime
- Can be copied and run on any machine with Python 3

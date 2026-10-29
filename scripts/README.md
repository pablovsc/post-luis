# Guía de Mantenimiento y Reinicio de Transacciones (Docker)

Esta guía explica las herramientas disponibles para personal de sistemas para **borrar registros de prueba (ventas y/o compras)** y **reiniciar las secuencias correlativas (IDs) a 1**.

---

## 1. Vía Interfaz Web (Recomendado)

En la barra superior de la aplicación, al lado del botón **"BD Conectada"**, verás un icono de escudo rojo (**Consola de Mantenimiento / Sistemas**).

1. Haz clic en el botón con icono de escudo rojo.
2. Observarás las estadísticas actuales de la base de datos (cantidad de pedidos, compras, artículos).
3. Selecciona la opción deseada:
   - **Vaciar Ventas y Compras (Reinicio Completo de Pruebas)**
   - **Vaciar sólo Ventas (Pedidos del POS)**
   - **Vaciar sólo Compras (Facturas a Proveedores)**
4. Opcionalmente marca la casilla si deseas resetear el inventario de los productos a un valor fijo (ej. 0).
5. Escribe la palabra de seguridad `REINICIAR` y haz clic en **"Ejecutar y Reiniciar Secuencias"**.
6. El sistema ejecutará de forma atómica:
   ```sql
   TRUNCATE TABLE t_pedidolinea, t_pedido RESTART IDENTITY CASCADE;
   TRUNCATE TABLE t_compralinea, t_compra RESTART IDENTITY CASCADE;
   ```
7. El próximo pedido o compra generará el correlativo `#1`.

---

## 2. Vía PowerShell (Windows)

Si prefieres ejecutarlo por línea de comandos desde la terminal de Windows:

```powershell
# Reiniciar tanto compras como ventas (por defecto):
.\scripts\reset-transacciones.ps1

# Reiniciar únicamente las ventas:
.\scripts\reset-transacciones.ps1 -Accion ventas

# Reiniciar únicamente las compras:
.\scripts\reset-transacciones.ps1 -Accion compras

# Reiniciar todo y dejar el stock de todos los productos en 0:
.\scripts\reset-transacciones.ps1 -Accion ambos -ResetStock -StockValor 0
```

---

## 3. Vía Bash / Shell (Linux / WSL / Docker Host)

```bash
# Otorgar permisos de ejecución
chmod +x ./scripts/reset-transacciones.sh

# Ejecutar limpieza completa de pruebas
./scripts/reset-transacciones.sh pos_postgres adempiere luis ambos
```

---

## 4. Vía SQL Directo en PostgreSQL

Si entras directamente a través de pgAdmin, DBeaver o CLI con `docker exec -it pos_postgres psql -U adempiere -d luis`:

```sql
BEGIN;

-- 1. Vaciar ventas y reiniciar correlativos a 1
TRUNCATE TABLE t_pedidolinea, t_pedido RESTART IDENTITY CASCADE;

-- 2. Vaciar compras y reiniciar correlativos a 1
TRUNCATE TABLE t_compralinea, t_compra RESTART IDENTITY CASCADE;

COMMIT;
```


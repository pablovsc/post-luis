# 🛒 Tienda Express - Sistema POS & Gestión de Ventas Multimoneda

Aplicativo web moderno, rápido y minimalista diseñado para tiendas físicas que operan con precios en dólares (USD) y cobran en moneda local mediante la tasa de cambio oficial del día.

---

## 🗄️ 1. Estructura de la Base de Datos (PostgreSQL)

El archivo [database.sql](file:///c:/app/luis/database.sql) contiene las definiciones exactas de las tablas requeridas:

```sql
-- 1. Tabla de Productos (m_producto)
CREATE TABLE IF NOT EXISTS m_producto (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    precio_usd NUMERIC(12, 2) NOT NULL CHECK (precio_usd >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Tasa de Cambio (m_tasa)
CREATE TABLE IF NOT EXISTS m_tasa (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    tasa NUMERIC(14, 4) NOT NULL CHECK (tasa > 0),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Pedidos de Ventas (t_pedido)
CREATE TABLE IF NOT EXISTS t_pedido (
    id SERIAL PRIMARY KEY,
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    cliente_nombre VARCHAR(255),
    tasa_cambio_aplicada NUMERIC(14, 4) NOT NULL,
    total_usd NUMERIC(14, 2) NOT NULL CHECK (total_usd >= 0),
    total_moneda_local NUMERIC(16, 2) NOT NULL CHECK (total_moneda_local >= 0)
);

-- 4. Tabla de Líneas de Pedido (t_pedidolinea)
CREATE TABLE IF NOT EXISTS t_pedidolinea (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL REFERENCES t_pedido(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES m_producto(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario_usd NUMERIC(12, 2) NOT NULL CHECK (precio_unitario_usd >= 0),
    subtotal_usd NUMERIC(14, 2) NOT NULL CHECK (subtotal_usd >= 0)
);

-- Índices de optimización
CREATE INDEX IF NOT EXISTS idx_producto_activo ON m_producto(activo);
CREATE INDEX IF NOT EXISTS idx_tasa_fecha ON m_tasa(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_pedido_fecha ON t_pedido(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_pedidolinea_pedido ON t_pedidolinea(pedido_id);
```

---

## ⚙️ 2. Configuración de Base de Datos

Las credenciales están configuradas en [.env](file:///c:/app/luis/.env):

```env
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=luis
DB_USER=adempiere
DB_PASSWORD=adempiere
```

> **Nota:** La aplicación cuenta además con un modal en la barra superior (**"Configurar BD"** o **"BD Conectada"**) para probar conexiones, cambiar credenciales en caliente o conectarse a bases de datos remotas con SSL.

---

## 🚀 3. Funcionalidades Desarrolladas

1. **Punto de Venta Rápido (POS):**
   - Catálogo interactivo de productos con precios en USD y conversión en tiempo real.
   - Carrito de compras con selector de cantidad, cálculo de subtotales y total general en USD y Moneda Local (Bs.).
   - Registro de pedidos con control de transacciones (`BEGIN` / `COMMIT`) para garantizar consistencia entre `t_pedido` y `t_pedidolinea`.
   - Generación de comprobante rápido de venta.

2. **Módulo de Productos (`m_producto`):**
   - CRUD completo: Registrar nuevos productos, editar precios/nombres y alternar estado activo/inactivo.
   - Filtro de búsqueda en tiempo real.

3. **Módulo de Tasa de Cambio (`m_tasa`):**
   - Registro y actualización de la tasa del día con detección de conflictos por fecha (`ON CONFLICT (fecha) DO UPDATE`).
   - Widget con la tasa activa y tabla histórica de tasas.

4. **Dashboard de Gestión:**
   - **Widget destacado** con la tasa de cambio vigente.
   - Resumen de ventas del día y ventas acumuladas.
   - **Gráficos interactivos (Chart.js):**
     - Ventas diarias (últimos 7 días con gráfico de línea suave).
     - Ventas semanales (gráfico de barras).
     - Ventas mensuales (gráfico de barras).
   - Selector dinámico para alternar entre ver las cifras en **Dólares ($)** o en **Moneda Local (Bs.)**.
   - Tabla de Top 5 productos más vendidos.

---

## 📦 4. Instrucciones de Ejecución

### Opción A: Con Docker (Recomendado - 1 Solo Paso)
Levanta los 3 servicios integrados: PostgreSQL, la aplicación web Next.js y el servicio autónomo de scraping del BCV:

```bash
docker compose up -d --build
```

- **Web App:** [http://localhost:3000](http://localhost:3000)
- **PostgreSQL:** `localhost:5432` (Base de datos: `luis`, Usuario: `adempiere`, Password: `adempiere`)
- **BCV Scraper Autónomo (`pos_bcv_scraper`):** Extrae la tasa del div `#dolar` y la fecha valor de `<span class="date-display-single">` cada 1 hora. Si la tasa no ha variado para esa fecha, evita duplicaciones innecesarias.
- Para ver los logs del scraper en tiempo real:
  ```bash
  docker compose logs -f bcv-scraper
  ```
- Para detener los contenedores:
  ```bash
  docker compose down
  ```

---

### Opción B: Ejecución Local Directa

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Ejecutar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
3. Abrir en el navegador:
   [http://localhost:3000](http://localhost:3000)

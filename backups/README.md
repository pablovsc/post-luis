# Carpeta de Respaldos de Base de Datos (PostgreSQL)

Esta carpeta física contiene las copias de seguridad automáticas generadas periódicamente por Docker.

## Formatos disponibles generados automáticamente:
1. **`.backup` (Formato Custom / Binario PostgreSQL `-Fc`):**
   - Compatible nativamente con **pgAdmin** (botón derecho en la BD -> "Restore").
   - Compatible con la herramienta oficial `pg_restore`.
   - Permite restauración granular (restaurar tablas específicas, restauración en paralelo, etc.).
2. **`.sql.gz` (Formato SQL plano comprimido con gzip):**
   - Texto SQL legible que contiene sentencias `CREATE TABLE`, `INSERT INTO...`.
   - Compatible con cualquier cliente SQL (`psql`, DBeaver, etc.).

---

## Programación y Retención:
- **Frecuencia:** Se ejecutan **cada 4 horas** (`00:00`, `04:00`, `08:00`, `12:00`, `16:00`, `20:00` hora de Venezuela).
- **Subcarpetas organizadas:**
  - `daily/`: Respaldos diarios (conserva los últimos 7 días).
  - `weekly/`: Respaldos semanales (conserva las últimas 4 semanas).
  - `monthly/`: Respaldos mensuales (conserva los últimos 6 meses).
  - `last/`: El respaldo más reciente.

---

## ¿Cómo restaurar en caso de emergencia?

### 1. Restaurar archivo `.backup` (con `pg_restore` o pgAdmin)
Desde la terminal PowerShell en `c:\app\luis`:

```powershell
# Reemplaza 'NOMBRE_DEL_ARCHIVO.backup' con el nombre de tu archivo
docker exec -i pos_postgres pg_restore -U adempiere -d luis -c -v /backups/daily/NOMBRE_DEL_ARCHIVO.backup
```

*(O en pgAdmin: clic derecho en la base de datos `luis` -> **Restore** -> seleccionar el archivo `.backup`).*

### 2. Restaurar archivo `.sql.gz` (con `psql`)
Desde la terminal PowerShell en `c:\app\luis`:

```powershell
docker exec -i pos_postgres /bin/sh -c "gunzip -c /backups/daily/NOMBRE_DEL_ARCHIVO.sql.gz | psql -U adempiere -d luis"
```

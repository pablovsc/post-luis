import { NextResponse } from 'next/server';
import { query, ensureAuthTables } from '@/lib/db';

// GET: Listar todos los roles y cantidad de usuarios asignados
export async function GET() {
  try {
    await ensureAuthTables();
    const roles = await query(
      `SELECT r.id, r.nombre, r.descripcion, r.permisos, r.activo,
              COUNT(u.id)::int as total_usuarios
       FROM m_rol r
       LEFT JOIN m_usuario u ON u.rol_id = r.id
       GROUP BY r.id, r.nombre, r.descripcion, r.permisos, r.activo
       ORDER BY r.id ASC`
    );

    const formatted = roles.map((r) => ({
      ...r,
      permisos: Array.isArray(r.permisos)
        ? r.permisos
        : typeof r.permisos === 'string'
        ? JSON.parse(r.permisos)
        : [],
    }));

    return NextResponse.json({ success: true, roles: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al obtener roles' },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo rol
export async function POST(req: Request) {
  try {
    await ensureAuthTables();
    const body = await req.json();
    const { nombre, descripcion, permisos } = body;

    if (!nombre) {
      return NextResponse.json({ success: false, message: 'El nombre del rol es requerido' }, { status: 400 });
    }

    const cleanNombre = String(nombre).trim().toUpperCase();
    const permisosJson = JSON.stringify(Array.isArray(permisos) ? permisos : []);

    const inserted = await query(
      `INSERT INTO m_rol (nombre, descripcion, permisos, activo)
       VALUES ($1, $2, $3::jsonb, true)
       RETURNING id, nombre, descripcion, permisos, activo`,
      [cleanNombre, descripcion ? String(descripcion).trim() : null, permisosJson]
    );

    return NextResponse.json({
      success: true,
      message: 'Rol creado exitosamente',
      rol: inserted[0],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al crear rol' },
      { status: 500 }
    );
  }
}

// PUT: Modificar un rol
export async function PUT(req: Request) {
  try {
    await ensureAuthTables();
    const body = await req.json();
    const { id, nombre, descripcion, permisos, activo } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID de rol requerido' }, { status: 400 });
    }

    const rolId = Number(id);

    // No permitir desactivar ni quitar todos los permisos al rol de ADMINISTRADOR (id 1)
    if (rolId === 1 && activo === false) {
      return NextResponse.json(
        { success: false, message: 'No se puede desactivar el rol de ADMINISTRADOR' },
        { status: 400 }
      );
    }

    const cleanNombre = nombre ? String(nombre).trim().toUpperCase() : null;
    const permisosJson = permisos ? JSON.stringify(Array.isArray(permisos) ? permisos : []) : null;

    const updated = await query(
      `UPDATE m_rol
       SET nombre = COALESCE($1, nombre),
           descripcion = COALESCE($2, descripcion),
           permisos = COALESCE($3::jsonb, permisos),
           activo = COALESCE($4, activo)
       WHERE id = $5
       RETURNING id, nombre, descripcion, permisos, activo`,
      [
        cleanNombre,
        descripcion !== undefined ? String(descripcion).trim() : null,
        permisosJson,
        typeof activo === 'boolean' ? activo : null,
        rolId,
      ]
    );

    if (updated.length === 0) {
      return NextResponse.json({ success: false, message: 'Rol no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Rol actualizado exitosamente',
      rol: updated[0],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al actualizar rol' },
      { status: 500 }
    );
  }
}


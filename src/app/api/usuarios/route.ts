import { NextResponse } from 'next/server';
import { query, ensureAuthTables } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// GET: Listar usuarios
export async function GET() {
  try {
    await ensureAuthTables();
    const users = await query(
      `SELECT u.id, u.username, u.nombre_completo, u.email,
              u.rol_id, r.nombre as rol_nombre, r.permisos, u.activo,
              TO_CHAR(u.ultimo_acceso, 'YYYY-MM-DD HH24:MI') as ultimo_acceso,
              TO_CHAR(u.creado_en, 'YYYY-MM-DD HH24:MI') as creado_en
       FROM m_usuario u
       JOIN m_rol r ON r.id = u.rol_id
       ORDER BY u.id ASC`
    );

    const formatted = users.map((u) => ({
      ...u,
      permisos: Array.isArray(u.permisos)
        ? u.permisos
        : typeof u.permisos === 'string'
        ? JSON.parse(u.permisos)
        : [],
    }));

    return NextResponse.json({ success: true, users: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// POST: Crear usuario
export async function POST(req: Request) {
  try {
    await ensureAuthTables();
    const body = await req.json();
    const { username, password, nombre_completo, email, rol_id } = body;

    if (!username || !password || !nombre_completo || !rol_id) {
      return NextResponse.json(
        { success: false, message: 'Nombre, usuario, contraseña y rol son obligatorios' },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanNombre = String(nombre_completo).trim();
    const cleanEmail = email ? String(email).trim() : null;

    // Verificar existencia previa
    const existing = await query(`SELECT id FROM m_usuario WHERE LOWER(username) = $1`, [cleanUsername]);
    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: `El nombre de usuario "${cleanUsername}" ya existe` },
        { status: 409 }
      );
    }

    const passHash = hashPassword(password);

    const inserted = await query(
      `INSERT INTO m_usuario (username, password_hash, nombre_completo, email, rol_id, activo)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, username, nombre_completo, email, rol_id, activo`,
      [cleanUsername, passHash, cleanNombre, cleanEmail, Number(rol_id)]
    );

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: inserted[0],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al crear usuario' },
      { status: 500 }
    );
  }
}

// PUT: Modificar usuario (datos, rol, contraseña opcional, activo/inactivo)
export async function PUT(req: Request) {
  try {
    await ensureAuthTables();
    const body = await req.json();
    const { id, username, password, nombre_completo, email, rol_id, activo } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID de usuario requerido' }, { status: 400 });
    }

    const userId = Number(id);

    // Evitar desactivar o cambiar a rol no-admin al usuario 1 (admin principal) si es el único
    if (userId === 1 && activo === false) {
      return NextResponse.json(
        { success: false, message: 'No se puede desactivar al usuario administrador principal' },
        { status: 400 }
      );
    }

    let updateSql = `
      UPDATE m_usuario 
      SET nombre_completo = COALESCE($1, nombre_completo),
          email = $2,
          rol_id = COALESCE($3, rol_id),
          activo = COALESCE($4, activo)
    `;
    const params: any[] = [
      nombre_completo ? String(nombre_completo).trim() : null,
      email ? String(email).trim() : null,
      rol_id ? Number(rol_id) : null,
      typeof activo === 'boolean' ? activo : null,
    ];

    let paramIdx = 5;

    if (username) {
      const cleanUsername = String(username).trim().toLowerCase();
      // Validar si otro usuario ya tiene ese username
      const dup = await query(`SELECT id FROM m_usuario WHERE LOWER(username) = $1 AND id <> $2`, [
        cleanUsername,
        userId,
      ]);
      if (dup.length > 0) {
        return NextResponse.json(
          { success: false, message: 'Ese nombre de usuario ya está en uso' },
          { status: 409 }
        );
      }
      updateSql += `, username = $${paramIdx}`;
      params.push(cleanUsername);
      paramIdx++;
    }

    if (password && String(password).trim().length > 0) {
      const passHash = hashPassword(password);
      updateSql += `, password_hash = $${paramIdx}`;
      params.push(passHash);
      paramIdx++;
    }

    updateSql += ` WHERE id = $${paramIdx} RETURNING id, username, nombre_completo, email, rol_id, activo;`;
    params.push(userId);

    const updated = await query(updateSql, params);
    if (updated.length === 0) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      user: updated[0],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar usuario
export async function DELETE(req: Request) {
  try {
    await ensureAuthTables();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID no proporcionado' }, { status: 400 });
    }

    const userId = Number(id);
    if (userId === 1) {
      return NextResponse.json(
        { success: false, message: 'El usuario administrador principal no puede ser eliminado' },
        { status: 400 }
      );
    }

    await query(`DELETE FROM m_usuario WHERE id = $1`, [userId]);

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
}


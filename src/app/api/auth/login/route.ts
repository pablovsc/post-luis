import { NextResponse } from 'next/server';
import { query, ensureAuthTables } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await ensureAuthTables();
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim().toLowerCase();

    const users = await query(
      `SELECT u.id, u.username, u.password_hash, u.nombre_completo, u.email,
              u.rol_id, r.nombre as rol_nombre, r.permisos, u.activo
       FROM m_usuario u
       JOIN m_rol r ON r.id = u.rol_id
       WHERE LOWER(u.username) = $1`,
      [cleanUsername]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      );
    }

    const user = users[0];

    if (!user.activo) {
      return NextResponse.json(
        { success: false, message: 'Este usuario está desactivado. Contacta al administrador.' },
        { status: 403 }
      );
    }

    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      );
    }

    // Actualizar último acceso
    await query(`UPDATE m_usuario SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);

    const permisosParsed = Array.isArray(user.permisos)
      ? user.permisos
      : typeof user.permisos === 'string'
      ? JSON.parse(user.permisos)
      : [];

    return NextResponse.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        username: user.username,
        nombre_completo: user.nombre_completo,
        email: user.email,
        rol_id: user.rol_id,
        rol_nombre: user.rol_nombre,
        permisos: permisosParsed,
        activo: user.activo,
      },
    });
  } catch (error: any) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Error en el servidor al autenticar' },
      { status: 500 }
    );
  }
}


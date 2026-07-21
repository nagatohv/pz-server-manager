import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-pz-token-key-change-me';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

// Si la contraseña provista en entorno no está hasheada, podemos compararla directamente
// o dar soporte a hashes bcrypt para mayor seguridad.
export function verifyPassword(plainPassword) {
  if (ADMIN_PASSWORD.startsWith('$2a$') || ADMIN_PASSWORD.startsWith('$2b$')) {
    return bcrypt.compareSync(plainPassword, ADMIN_PASSWORD);
  }
  return plainPassword === ADMIN_PASSWORD;
}

export function generateToken() {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
}

export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Token no provisto' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Formato de token inválido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
}

// Middleware de autenticación para WebSockets
export function authenticateWS(info, cb) {
  // Extraer token de los query params, ej: ws://host?token=XYZ
  const url = new URL(info.req.url, `http://${info.req.headers.host}`);
  const token = url.searchParams.get('token');

  if (!token) {
    cb(false, 401, 'No autorizado');
    return;
  }

  try {
    jwt.verify(token, JWT_SECRET);
    cb(true);
  } catch (err) {
    cb(false, 403, 'Token inválido');
  }
}

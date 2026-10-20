import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { getPool, getDbMode, readLocalUsers, writeLocalUsers } from './db.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'memomeir_super_secure_jwt_secret_key_2026';

/**
 * Generates JWT token for authenticated user
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      color: user.color
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

/**
 * Middleware to protect endpoints and attach req.user
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Akses ditolak: Silakan login terlebih dahulu.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Sesi login telah kedaluwarsa atau tidak valid. Silakan login kembali.'
    });
  }
}

/**
 * Optional Auth middleware - if token present, sets req.user; otherwise continues
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch {
      // ignore invalid token in optional mode
    }
  }
  next();
}

/**
 * Register a new user with Email (Gmail) and Password
 */
export async function registerUser({ name, email, password, phone }) {
  if (!name || !name.trim()) throw new Error('Nama lengkap wajib diisi');
  if (!email || !email.trim()) throw new Error('Email (Gmail) wajib diisi');
  if (!password || password.length < 6) throw new Error('Password minimal 6 karakter');

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new Error('Format email tidak valid (contoh: user@gmail.com)');
  }

  const cleanPhone = phone ? phone.trim().replace(/[^0-9]/g, '') : '';
  const pool = getPool();
  const dbMode = getDbMode();

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const userId = `usr_${cleanEmail.split('@')[0].replace(/[^a-z0-9]/g, '')}_${Date.now().toString(36)}`;
  const userColor = ['#3b82f6', '#ec4899', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#6366f1'][Math.floor(Math.random() * 7)];

  if (dbMode === 'postgres' && pool) {
    // Check if email already registered
    const existing = await pool.query(
      'SELECT id, email, phone FROM users WHERE LOWER(email) = $1 OR (phone = $2 AND phone != \'\')',
      [cleanEmail, cleanPhone]
    );

    if (existing.rows.length > 0) {
      if (existing.rows.some(u => u.email?.toLowerCase() === cleanEmail)) {
        throw new Error(`Email "${cleanEmail}" sudah terdaftar. Silakan login.`);
      }
      if (cleanPhone && existing.rows.some(u => u.phone === cleanPhone)) {
        throw new Error(`Nomor HP "${cleanPhone}" sudah terdaftar.`);
      }
    }

    const res = await pool.query(`
      INSERT INTO users (id, name, email, phone, password_hash, color)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, phone, color, created_at
    `, [userId, name.trim(), cleanEmail, cleanPhone, passwordHash, userColor]);

    const user = res.rows[0];
    const token = generateToken(user);
    return { user, token };
  } else {
    // Local fallback
    const users = readLocalUsers();
    if (users.some(u => u.email?.toLowerCase() === cleanEmail)) {
      throw new Error(`Email "${cleanEmail}" sudah terdaftar.`);
    }
    const newUser = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password_hash: passwordHash,
      color: userColor,
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    writeLocalUsers(users);

    const safeUser = { ...newUser };
    delete safeUser.password_hash;
    const token = generateToken(safeUser);
    return { user: safeUser, token };
  }
}

/**
 * Login user with Email (Gmail) and Password
 */
export async function loginUser({ email, identifier, password }) {
  const inputEmail = (email || identifier || '').trim().toLowerCase();
  if (!inputEmail) throw new Error('Email (Gmail) wajib diisi');
  if (!password) throw new Error('Password wajib diisi');

  const pool = getPool();
  const dbMode = getDbMode();

  let user = null;

  if (dbMode === 'postgres' && pool) {
    const res = await pool.query(
      'SELECT id, name, email, phone, color, password_hash FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [inputEmail]
    );
    if (res.rows.length === 0) {
      throw new Error('Akun dengan email ini belum terdaftar. Silakan daftar terlebih dahulu.');
    }
    user = res.rows[0];
  } else {
    const users = readLocalUsers();
    user = users.find(u => u.email?.toLowerCase() === inputEmail);
    if (!user) {
      throw new Error('Akun dengan email ini belum terdaftar.');
    }
  }

  // Verify password
  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    throw new Error('Password yang Anda masukkan salah.');
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    color: user.color
  };

  const token = generateToken(safeUser);
  return { user: safeUser, token };
}

/**
 * Get user profile by ID
 */
export async function getUserById(id) {
  const pool = getPool();
  const dbMode = getDbMode();

  if (dbMode === 'postgres' && pool) {
    const res = await pool.query(
      'SELECT id, name, email, phone, color, created_at FROM users WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  } else {
    const users = readLocalUsers();
    const u = users.find(item => item.id === id);
    if (u) {
      const copy = { ...u };
      delete copy.password_hash;
      return copy;
    }
    return null;
  }
}

/**
 * Find user by phone, email, or id (used for WhatsApp webhook matching)
 */
export async function findUserByPhoneOrName(identifier) {
  if (!identifier) return null;
  const cleanStr = String(identifier).trim().toLowerCase();
  const cleanPhone = String(identifier).trim().replace(/[^0-9]/g, '');
  const pool = getPool();
  const dbMode = getDbMode();

  if (dbMode === 'postgres' && pool) {
    const res = await pool.query(
      `SELECT id, name, email, phone, color, created_at FROM users 
       WHERE LOWER(email) = $1 
          OR (phone = $2 AND phone != '') 
          OR id = $3 
          OR LOWER(name) = $1
       LIMIT 1`,
      [cleanStr, cleanPhone, cleanStr]
    );
    return res.rows[0] || null;
  } else {
    const users = readLocalUsers();
    const u = users.find(item => 
      item.id === cleanStr || 
      item.email?.toLowerCase() === cleanStr || 
      item.name?.toLowerCase() === cleanStr || 
      (cleanPhone && item.phone === cleanPhone)
    );
    if (u) {
      const copy = { ...u };
      delete copy.password_hash;
      return copy;
    }
    return null;
  }
}

/**
 * Verify Google ID Token & Register/Login user automatically
 */
export async function authenticateGoogleUser(credential) {
  if (!credential) throw new Error('Token Google tidak ditemukan');

  // Verify with Google's official public tokeninfo endpoint
  const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
  const res = await fetch(verifyUrl);
  if (!res.ok) {
    throw new Error('Verifikasi akun Google gagal atau sesi telah kedaluwarsa.');
  }

  const payload = await res.json();
  const { email, name, sub: googleId } = payload;
  if (!email) throw new Error('Gagal mendapatkan email dari akun Google.');

  const cleanEmail = email.trim().toLowerCase();
  const pool = getPool();
  const dbMode = getDbMode();

  let user = null;

  if (dbMode === 'postgres' && pool) {
    const existing = await pool.query(
      'SELECT id, name, email, phone, color FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [cleanEmail]
    );

    if (existing.rows.length > 0) {
      user = existing.rows[0];
    } else {
      // Create new user for this Google account
      const userId = `usr_g_${googleId.slice(0, 10)}_${Date.now().toString(36)}`;
      const userColor = ['#3b82f6', '#ec4899', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#6366f1'][Math.floor(Math.random() * 7)];
      const insertRes = await pool.query(`
        INSERT INTO users (id, name, email, password_hash, color)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, email, phone, color, created_at
      `, [userId, name || cleanEmail.split('@')[0], cleanEmail, 'oauth_google', userColor]);
      user = insertRes.rows[0];
    }
  } else {
    // Local fallback
    const users = readLocalUsers();
    user = users.find(u => u.email?.toLowerCase() === cleanEmail);
    if (!user) {
      const userId = `usr_g_${googleId.slice(0, 10)}_${Date.now().toString(36)}`;
      const userColor = '#3b82f6';
      user = {
        id: userId,
        name: name || cleanEmail.split('@')[0],
        email: cleanEmail,
        password_hash: 'oauth_google',
        color: userColor,
        created_at: new Date().toISOString()
      };
      users.push(user);
      writeLocalUsers(users);
    }
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    color: user.color || '#3b82f6'
  };

  const token = generateToken(safeUser);
  return { user: safeUser, token };
}

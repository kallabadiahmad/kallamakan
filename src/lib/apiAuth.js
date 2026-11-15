import { NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db';
import Admin from '@/models/Admin';

/* =============================================
   KALLA MAKAN - KEAMANAN ADMIN
   =============================================
   Setelah login, server memberi cookie httpOnly berisi token yang
   ditandatangani (HMAC). Token tidak bisa dipalsukan dari browser,
   tidak bisa dibaca JavaScript, dan kedaluwarsa setelah 7 hari.

   Kunci tanda tangan: ADMIN_SESSION_SECRET di .env.local / Vercel.
   Kalau belum diisi, kunci diturunkan dari MONGODB_URI (tetap rahasia).
*/

// Password awal hanya dipakai kalau akun admin belum ada di database.
// Disimpan di server saja (tidak ikut ke browser).
export const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || '@Kalla123';

export const SESSION_COOKIE = 'kalla_admin_token';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

function getSecret() {
  const base = process.env.ADMIN_SESSION_SECRET || process.env.MONGODB_URI || '';
  if (!base) throw new Error('ADMIN_SESSION_SECRET / MONGODB_URI belum diisi');
  return crypto.createHash('sha256').update('kalla-admin-session:' + base).digest();
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/** Token sesi: "<exp>.<versiPassword>.<tandaTangan>" */
export function createSessionToken(passwordVersion = '') {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = `${exp}.${passwordVersion}`;
  return `${payload}.${sign(payload)}`;
}

/** Cek tanda tangan & masa berlaku. Mengembalikan versi password di token, atau null. */
export function readSessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [exp, pv, sig] = parts;
  if (!safeEqual(sig, sign(`${exp}.${pv}`))) return null;
  if (!(Number(exp) > Math.floor(Date.now() / 1000))) return null;
  return pv;
}

// Versi password admin saat ini (disimpan sebentar supaya tidak query DB tiap request)
const pvCache = global.__kallaPvCache || (global.__kallaPvCache = { value: null, at: 0 });

export function forgetPasswordVersionCache() {
  pvCache.value = null;
  pvCache.at = 0;
}

async function currentPasswordVersion() {
  if (pvCache.value && Date.now() - pvCache.at < 30 * 1000) return pvCache.value;
  await connectDB();
  const admin = await Admin.findOne({ username: 'admin' }).lean();
  pvCache.value = passwordVersion(admin?.password || '');
  pvCache.at = Date.now();
  return pvCache.value;
}

export async function isAdminRequest(req) {
  const apiKey = req.headers.get('x-api-key');
  if (apiKey && process.env.ADMIN_API_KEY && safeEqual(apiKey, process.env.ADMIN_API_KEY)) {
    return true;
  }
  const pv = readSessionToken(req.cookies?.get(SESSION_COOKIE)?.value);
  if (pv === null) return false;
  // Kalau password sudah diganti, sesi lama tidak berlaku lagi
  return safeEqual(pv, await currentPasswordVersion());
}

/**
 * Pakai di route API:
 *   const authError = await requireAdmin(req);
 *   if (authError) return authError;
 */
export async function requireAdmin(req) {
  if (await isAdminRequest(req)) return null;
  return NextResponse.json(
    { success: false, error: 'Sesi admin habis atau belum login. Silakan login ulang.' },
    { status: 401 }
  );
}

export function setSessionCookie(response, token) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  // Hapus cookie lama (format lama yang gampang dipalsukan)
  response.cookies.set({ name: 'kalla_admin_session', value: '', path: '/', maxAge: 0 });
  return response;
}

export function clearSessionCookie(response) {
  response.cookies.set({ name: SESSION_COOKIE, value: '', path: '/', maxAge: 0 });
  response.cookies.set({ name: 'kalla_admin_session', value: '', path: '/', maxAge: 0 });
  return response;
}

/* ---------- Password: disimpan sebagai hash scrypt ---------- */

export function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(plain), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function isHashed(stored) {
  return typeof stored === 'string' && stored.startsWith('scrypt$');
}

export function checkPassword(plain, stored) {
  if (!stored) return false;
  if (!isHashed(stored)) return safeEqual(plain, stored); // password lama (belum di-hash)
  const [, salt, hash] = stored.split('$');
  const test = crypto.scryptSync(String(plain), salt, 64).toString('hex');
  return safeEqual(test, hash);
}

/** Versi pendek dari hash password. Ganti password = semua sesi lama otomatis tidak berlaku. */
export function passwordVersion(stored) {
  return crypto.createHash('sha256').update(String(stored || '')).digest('hex').slice(0, 10);
}

/* ---------- Batas percobaan login (anti tebak password) ---------- */

const attempts = global.__kallaLoginAttempts || (global.__kallaLoginAttempts = new Map());
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function clientKey(req) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
}

export function loginBlocked(req) {
  const rec = attempts.get(clientKey(req));
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) {
    attempts.delete(clientKey(req));
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

export function recordLoginFail(req) {
  const key = clientKey(req);
  const rec = attempts.get(key);
  if (!rec || Date.now() - rec.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: Date.now() });
  } else {
    rec.count += 1;
  }
}

export function clearLoginFails(req) {
  attempts.delete(clientKey(req));
}

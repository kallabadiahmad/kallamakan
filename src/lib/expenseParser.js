/* =============================================
   KALLA MAKAN - BACA PENGELUARAN DARI TEKS BEBAS
   =============================================
   Contoh yang bisa dibaca:
     iklan fb 50rb
     beli mangga 2kg 40rb, bengkoang 15rb
     cup 100pcs 35.000
     kemarin: es batu 10rb
     tgl 12 gas 3kg 22rb
     topup iklan 1,5jt
   Tiap baris (atau bagian yang dipisah koma / "+" / ";") yang punya nominal
   jadi satu pengeluaran. Kategori dipilih dari kata kunci.
*/

import { toDateKey } from './finance';

// Urutan = prioritas kalau skor sama
export const CATEGORY_KEYWORDS = {
  ads_ctwa: [
    'iklan', 'ads', 'ad', 'adv', 'fb', 'facebook', 'meta', 'ig', 'instagram', 'tiktok', 'tik tok',
    'boost', 'promosi', 'promo', 'ctwa', 'endorse', 'endorsement', 'saldo iklan', 'topup iklan',
    'top up iklan', 'google ads', 'marketplace ads', 'spanduk', 'banner', 'brosur',
  ],
  alat_packaging: [
    'cup', 'cups', 'gelas', 'toples', 'botol', 'plastik', 'kantong', 'kresek', 'segel', 'stiker',
    'sticker', 'label', 'sendok', 'garpu', 'sedotan', 'tutup', 'mika', 'kemasan', 'packaging',
    'box', 'kotak', 'thinwall', 'lakban', 'karet', 'paper bag', 'tas', 'pouch', 'pisau',
    'talenan', 'baskom', 'wadah', 'container', 'cool box', 'coolbox', 'ice gel', 'ice pack',
    'tisu', 'tissue', 'print', 'cetak',
  ],
  bahan_baku: [
    'mangga', 'kedondong', 'jambu', 'bengkoang', 'bengkuang', 'nanas', 'nenas', 'salak', 'pepaya',
    'timun', 'mentimun', 'ubi', 'delima', 'pomegranate', 'melon', 'semangka', 'apel', 'anggur',
    'kiwi', 'jeruk', 'lemon', 'nata', 'nata de coco', 'jelly', 'jeli', 'agar', 'kolang kaling',
    'kolang-kaling', 'buah', 'buahan', 'gula', 'garam', 'cabai', 'cabe', 'cabe rawit', 'rawit',
    'cuka', 'asam', 'kiamboy', 'kiambo', 'ebi', 'kacang', 'terasi', 'sirup', 'mayo', 'mayones',
    'mayonaise', 'mayonnaise', 'keju', 'susu', 'skm', 'saus', 'pewarna', 'perasa', 'bumbu',
    'bahan', 'bahan baku', 'pasar', 'belanja pasar', 'kerupuk', 'krupuk', 'yakult', 'yogurt',
    'madu', 'jahe', 'serai', 'sereh', 'daun jeruk', 'kayu manis', 'cengkeh',
    // nama toko & bahan yang sering dicatat
    'buh', 'bit', 'pir', 'songkit', 'jeruk songkit', 'natade', 'natadecoco', 'nata de', 'jus', 'juice',
    'boga kita', 'boga', 'istana', 'istana buah', 'buah istana', 'central', 'central buah', 'duta', 'duta buah',
    'diamond', 'diamond jus', 'pome', 'jus pome', 'jambu kristal', 'mangga muda', 'krim', 'cream',
  ],
  operasional: [
    'listrik', 'token', 'pln', 'air', 'pdam', 'galon', 'es batu', 'es', 'gas', 'elpiji', 'lpg',
    'bensin', 'bbm', 'pertalite', 'pertamax', 'solar', 'ongkir', 'kurir', 'gojek', 'grab',
    'maxim', 'paxel', 'lalamove', 'transport', 'parkir', 'pulsa', 'kuota', 'internet', 'wifi',
    'indihome', 'sewa', 'gaji', 'upah', 'bonus', 'cuci', 'sabun', 'servis', 'service', 'kulkas',
    'freezer', 'dapur', 'admin', 'biaya admin', 'tol',
  ],
};

const CATEGORY_ORDER = ['ads_ctwa', 'alat_packaging', 'bahan_baku', 'operasional'];

// Kata yang sangat menentukan kategori (bobot lebih besar).
// Contoh: "gaji bantu potong buah" tetap masuk Operasional, bukan Bahan Baku.
const STRONG_KEYWORDS = new Set([
  'iklan', 'ads', 'boost', 'ctwa', 'endorse', 'saldo iklan', 'topup iklan', 'top up iklan',
  'gaji', 'upah', 'bonus', 'sewa', 'listrik', 'token', 'pln', 'ongkir', 'bensin', 'bbm',
  'cup', 'toples', 'packaging', 'kemasan', 'thinwall', 'segel', 'stiker', 'sticker',
]);

// Satuan jumlah barang -> angka di depannya BUKAN nominal uang
const QTY_UNITS = [
  'kg', 'kilo', 'g', 'gr', 'gram', 'ons', 'pcs', 'pc', 'biji', 'buah', 'bh', 'ml', 'l', 'lt',
  'liter', 'ltr', 'bks', 'bungkus', 'pack', 'pak', 'lusin', 'x', 'kali', 'ikat', 'sisir',
  'karung', 'dus', 'box', 'roll', 'lembar', 'lbr', 'botol', 'btl', 'cup', 'cups', 'sachet',
  'renteng', 'tabung', 'galon', 'hari', 'minggu', 'bulan', 'porsi', 'kotak', 'kantong', 'meter', 'm',
];

const MONTHS = {
  jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4, mei: 5,
  jun: 6, juni: 6, jul: 7, juli: 7, agu: 8, agt: 8, agustus: 8, ags: 8, sep: 9, sept: 9,
  september: 9, okt: 10, oktober: 10, nov: 11, november: 11, des: 12, desember: 12,
};

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWord(text, word) {
  return new RegExp(`(^|[^a-z0-9])${escapeRe(word)}([^a-z0-9]|$)`, 'i').test(text);
}

/** Ubah "1,5" / "35.000" / "1.250.000" jadi angka */
function toNumber(raw) {
  let s = String(raw).trim();
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, '')); // pemisah ribuan
  return Number(s.replace(',', '.'));
}

/**
 * Cari nominal uang di teks. Mengembalikan { amount, start, end } atau null.
 * Prioritas: angka + rb/k/jt, lalu "Rp ...", lalu angka polos >= 1000.
 */
export function findAmount(text) {
  const t = text.toLowerCase();
  const candidates = [];

  // 50rb, 50 rb, 50ribu, 50k, 1,5jt, 2 juta, 1.5jt, 7rban
  const unitRe = /(rp\.?\s*)?(\d+(?:[.,]\d+)*)\s*(rb|rbu|ribu|rban|k|jt|juta|jeti)(?![a-z])/gi;
  let m;
  while ((m = unitRe.exec(t))) {
    const n = toNumber(m[2]);
    const unit = m[3];
    const mult = /^(jt|juta|jeti)$/.test(unit) ? 1_000_000 : 1_000;
    if (n > 0) candidates.push({ amount: Math.round(n * mult), start: m.index, end: m.index + m[0].length, rank: 3 });
  }

  // Rp 35.000 / Rp35000 / rp. 35,000
  const rpRe = /rp\.?\s*(\d+(?:[.,]\d+)*)/gi;
  while ((m = rpRe.exec(t))) {
    const overlap = candidates.some((c) => m.index >= c.start && m.index < c.end);
    if (overlap) continue;
    const n = toNumber(m[1]);
    if (n > 0) candidates.push({ amount: Math.round(n), start: m.index, end: m.index + m[0].length, rank: 2 });
  }

  // Angka polos: 35000 / 35.000 (bukan jumlah barang seperti 2kg, 100pcs)
  const plainRe = /(\d+(?:[.,]\d+)*)(\s*)([a-z]*)/gi;
  while ((m = plainRe.exec(t))) {
    if (!m[1]) continue;
    const start = m.index;
    if (candidates.some((c) => start >= c.start && start < c.end)) continue;
    const unit = m[3];
    if (unit && QTY_UNITS.includes(unit)) continue;
    // angka yang menempel ke huruf di depannya (mis. "a4") dilewati
    if (start > 0 && /[a-z]/i.test(t[start - 1])) continue;
    const n = toNumber(m[1]);
    if (n >= 1000) {
      candidates.push({ amount: Math.round(n), start, end: start + m[1].length, rank: 1 });
    } else if (/^\d{1,3}\.\d{2}$/.test(m[1]) && !unit) {
      // "35.00" -> kemungkinan maksudnya 35.000 (kurang satu nol)
      candidates.push({ amount: Number(m[1].replace('.', '')) * 10, start, end: start + m[1].length, rank: 0, warn: true });
    }
  }

  if (candidates.length === 0) return null;
  // Pilih peringkat tertinggi; kalau sama, yang paling akhir (biasanya harga ditulis di belakang)
  candidates.sort((a, b) => b.rank - a.rank || b.start - a.start);
  return candidates[0];
}

/** Baca kata tanggal: hari ini, kemarin, 2 hari lalu, tgl 12, 12/11, 12 nov */
export function findDate(text, today = new Date()) {
  const t = text.toLowerCase();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const shift = (days) => {
    const d = new Date(base);
    d.setDate(d.getDate() - days);
    return d;
  };
  let m;

  if (/\b(kemarin\s+lusa|kemaren\s+lusa)\b/.test(t)) return { date: toDateKey(shift(2)), match: m?.[0] };
  if ((m = t.match(/\b(kemarin|kemaren|kmrn|kmarin|kmren)\b/))) return { date: toDateKey(shift(1)), match: m[0] };
  if ((m = t.match(/\b(\d{1,2})\s*(hari|hr)\s*(yang\s*)?(lalu|lalu|kemarin|yg lalu)\b/))) {
    return { date: toDateKey(shift(Number(m[1]))), match: m[0] };
  }
  if ((m = t.match(/\b(hari\s*ini|hr\s*ini|tadi(\s*pagi|\s*siang|\s*sore|\s*malam)?)\b/))) {
    return { date: toDateKey(base), match: m[0] };
  }

  const build = (day, month, year) => {
    let y = year || base.getFullYear();
    if (y < 100) y += 2000;
    const d = new Date(y, month - 1, day);
    if (d.getMonth() !== month - 1) return null; // tanggal tidak valid
    if (!year && d > base) d.setFullYear(y - 1); // "12/12" di bulan November = tahun lalu
    return d;
  };

  // 12/11, 12-11, 12/11/26
  if ((m = t.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b(?!\s*(?:kg|kilo|g|gr|gram|ons|l|lt|liter|ml|lusin|bagian))/))) {
    const d = build(Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : 0);
    if (d) return { date: toDateKey(d), match: m[0] };
  }
  // 12 nov / 12 november
  const monthNames = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
  if ((m = t.match(new RegExp(`\\b(?:tgl\\.?\\s*|tanggal\\s*)?(\\d{1,2})\\s*(${monthNames})\\b(?:\\s*(\\d{4})\\b)?`)))) {
    const d = build(Number(m[1]), MONTHS[m[2]], m[3] ? Number(m[3]) : 0);
    if (d) return { date: toDateKey(d), match: m[0] };
  }
  // tgl 12 / tanggal 12 (bulan ini, atau bulan lalu kalau tanggalnya belum lewat)
  if ((m = t.match(/\b(?:tgl\.?|tanggal)\s*(\d{1,2})\b/))) {
    const day = Number(m[1]);
    let d = new Date(base.getFullYear(), base.getMonth(), day);
    if (d.getDate() !== day) return null;
    if (d > base) d = new Date(base.getFullYear(), base.getMonth() - 1, day);
    return { date: toDateKey(d), match: m[0] };
  }
  return null;
}

/** Tebak kategori dari kata kunci */
export function guessCategory(text) {
  const t = text.toLowerCase();
  let best = 'lainnya';
  let bestScore = 0;
  for (const cat of CATEGORY_ORDER) {
    let score = 0;
    for (const kw of CATEGORY_KEYWORDS[cat]) {
      if (!hasWord(t, kw)) continue;
      if (STRONG_KEYWORDS.has(kw)) score += 3;
      else score += kw.includes(' ') ? 2 : 1; // frasa dua kata lebih kuat
    }
    if (score > bestScore) {
      best = cat;
      bestScore = score;
    }
  }
  return best;
}

function cleanTitle(text, removeRanges) {
  let t = text;
  // hapus dari belakang supaya posisi tidak bergeser
  [...removeRanges].sort((a, b) => b.start - a.start).forEach((r) => {
    t = t.slice(0, r.start) + ' ' + t.slice(r.end);
  });
  t = t
    .replace(/\b(rp\.?|harga|total|bayar|seharga|sebesar)\b/gi, ' ')
    .replace(/[=:@]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.;\-+•*·▪–]+|[\s,.;\-+•*·▪–]+$/g, '')
    .replace(/\s+(dan|sama|&)$/i, '')
    .trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

// Baris pemasukan / pendapatan harian
const INCOME_RE = /^(pendapatan|pemasukan|omset|omzet|penjualan|jualan|income|hasil\s+jualan|uang\s+masuk|masuk)\b/i;
// Baris hitungan total yang tidak perlu disimpan
const TOTAL_RE = /^(total|sisa|saldo|untung|laba|profit|bersih|jumlah)\b/i;
const MONTH_WORDS = new RegExp(`\\b(${Object.keys(MONTHS).join('|')})\\b`, 'i');
const ALL_KEYWORDS = Object.values(CATEGORY_KEYWORDS).flat();

function stripNoise(text) {
  return String(text)
    .replace(/[​-‏‪-‮⁦-⁩﻿]/g, '') // karakter tak terlihat dari WhatsApp
    .replace(/\[([^\]]*)\]\(tel:[^)]*\)/gi, '$1') // "[825000-57000](tel:...)" -> "825000-57000"
    .trim();
}

/**
 * Ubah teks bebas jadi daftar pengeluaran (dan pendapatan harian).
 * Hasil: [{ key, type: 'expense'|'income', raw, title, amount, category, date, ok, warn }]
 * Juga mengembalikan baris yang dilewati lewat properti `skipped` pada array.
 */
export function parseExpenseText(input, today = new Date()) {
  const results = [];
  const skipped = [];
  let contextDate = toDateKey(today);

  const lines = String(input || '').split(/\r?\n/);
  lines.forEach((rawLine, lineIdx) => {
    const trimmed = stripNoise(rawLine);
    if (!trimmed) return;
    if (TOTAL_RE.test(trimmed.replace(/^[\s\-•*]+/, ''))) return; // "Total: 1060-385 = 332"

    // Tanggal di baris yang berisi barang -> berlaku untuk baris itu saja.
    // Baris yang isinya cuma tanggal ("kemarin:", "04 oktober 2026") -> berlaku untuk baris di bawahnya.
    const lineDate = findDate(trimmed, today);
    let lineText = trimmed;
    let rowDate = contextDate;
    if (lineDate && lineDate.match) {
      lineText = lineText.replace(new RegExp(escapeRe(lineDate.match), 'i'), ' ');
    }
    // Tahun di judul seperti "KALLA nov 2026" bukan nominal
    if (MONTH_WORDS.test(lineText)) lineText = lineText.replace(/\b20\d{2}\b/g, ' ');

    const lettersOnly = lineText.replace(/\b(tgl|tanggal|belanja|pengeluaran|catatan|kalla|makan)\b/gi, '').replace(/[^a-z]/gi, '');
    if (lineDate && !findAmount(lineText) && lettersOnly.length < 3) {
      contextDate = lineDate.date;
      return;
    }
    if (lineDate) rowDate = lineDate.date;

    // Satu baris bisa berisi beberapa item: "Pendapatan: 685.000 -buah bit 100.000 -jeruk 45.000"
    const chunks = lineText.split(/\s+-\s*(?=[a-z])/i).map((c) => c.trim()).filter(Boolean);

    chunks.forEach((chunk, chunkIdx) => {
      const isIncome = INCOME_RE.test(chunk.replace(/^[\s\-•*]+/, ''));

      // "buah 85+25+105 = 215" -> pakai angka setelah "=" (ditulis dalam ribuan kalau kecil)
      let segments;
      let eqAmount = null;
      if (chunk.includes('=')) {
        const right = chunk.split('=').pop();
        const amt = findAmount(right);
        const n = amt ? amt.amount : Number(String(right).replace(/[^\d]/g, ''));
        if (n > 0) eqAmount = { amount: n < 1000 ? n * 1000 : n, warn: n < 1000 };
        segments = [chunk.split('=')[0]];
      } else if (isIncome) {
        segments = [chunk];
      } else {
        // Pecah per koma / titik koma / "+" / " dan " kalau tiap bagian punya nominal sendiri
        const parts = chunk.split(/\s*(?:;|\+|,(?!\d{3})|\bdan\b|\bsama\b|\btrus\b|\blalu\b)\s*/i).filter(Boolean);
        const partsWithAmount = parts.filter((p) => findAmount(p));
        segments = partsWithAmount.length > 1 ? parts : [chunk];
      }

      segments.forEach((seg, segIdx) => {
        const text = seg.trim();
        if (!text) return;
        const key = `${lineIdx}-${chunkIdx}-${segIdx}`;
        const amt = eqAmount ? null : findAmount(text);
        const amount = eqAmount ? eqAmount.amount : amt ? amt.amount : 0;
        let title = cleanTitle(text, amt ? [amt] : []);
        if (eqAmount) title = cleanTitle(text.replace(/[\d+.,\s]+$/, ''), []) || title;

        if (!amount) {
          const hasKeyword = ALL_KEYWORDS.some((kw) => hasWord(text.toLowerCase(), kw));
          // Baris judul / catatan tanpa angka (mis. "Kalla makan") dilewati, tapi dicatat
          if (segments.length > 1) return;
          if (!hasKeyword && !isIncome) {
            if (/[a-z]{3,}/i.test(text)) skipped.push(trimmed);
            return;
          }
        }

        if (isIncome) {
          results.push({
            key,
            type: 'income',
            raw: trimmed,
            title: 'Pendapatan harian',
            amount,
            category: 'pendapatan',
            date: rowDate,
            ok: amount > 0,
            // "Pendapatan: 1.870" kemungkinan maksudnya 1.870.000
            warn: amount > 0 && amount < 10000,
          });
          return;
        }

        results.push({
          key,
          type: 'expense',
          raw: trimmed,
          title: title || 'Pengeluaran',
          amount,
          category: guessCategory(text),
          date: rowDate,
          ok: amount > 0,
          warn: (eqAmount && eqAmount.warn) || (amt && amt.warn) || (amount > 0 && amount < 1000),
        });
      });
    });
  });

  results.skipped = skipped;
  return results;
}

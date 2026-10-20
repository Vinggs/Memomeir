/**
 * Intelligent Indonesian Receipt & Invoice Text Parser
 */

const KNOWN_MERCHANTS = [
  { pattern: /indomaret/i, name: 'Indomaret', category: 'Shopping' },
  { pattern: /alfamart|alfa\s*midi/i, name: 'Alfamart', category: 'Shopping' },
  { pattern: /starbucks/i, name: 'Starbucks Coffee', category: 'Food & Dining' },
  { pattern: /kopi\s*kenangan/i, name: 'Kopi Kenangan', category: 'Food & Dining' },
  { pattern: /janji\s*jiwa/i, name: 'Kopi Janji Jiwa', category: 'Food & Dining' },
  { pattern: /tuku/i, name: 'Toko Kopi Tuku', category: 'Food & Dining' },
  { pattern: /fore\s*coffee/i, name: 'Fore Coffee', category: 'Food & Dining' },
  { pattern: /point\s*coffee/i, name: 'Point Coffee', category: 'Food & Dining' },
  { pattern: /mcdonald|mcd\b/i, name: "McDonald's", category: 'Food & Dining' },
  { pattern: /kfc\b/i, name: 'KFC', category: 'Food & Dining' },
  { pattern: /hokben|hoka\s*hoka/i, name: 'HokBen', category: 'Food & Dining' },
  { pattern: /mie\s*gacoan/i, name: 'Mie Gacoan', category: 'Food & Dining' },
  { pattern: /solaria/i, name: 'Solaria', category: 'Food & Dining' },
  { pattern: /j\.?co\b/i, name: 'J.CO Donuts', category: 'Food & Dining' },
  { pattern: /chatime/i, name: 'Chatime', category: 'Food & Dining' },
  { pattern: /superindo/i, name: 'Super Indo Supermarket', category: 'Shopping' },
  { pattern: /hypermart/i, name: 'Hypermart', category: 'Shopping' },
  { pattern: /transmart/i, name: 'Transmart', category: 'Shopping' },
  { pattern: /uniqlo/i, name: 'Uniqlo', category: 'Shopping' },
  { pattern: /pertamina|spbu/i, name: 'SPBU Pertamina', category: 'Transport' },
  { pattern: /shell\b/i, name: 'SPBU Shell', category: 'Transport' },
  { pattern: /guardian/i, name: 'Guardian Pharmacy', category: 'Health & Wellness' },
  { pattern: /watsons/i, name: 'Watsons', category: 'Health & Wellness' },
  { pattern: /kimia\s*farma/i, name: 'Apotek Kimia Farma', category: 'Health & Wellness' },
  { pattern: /cinema\s*xxi|xxi\b/i, name: 'Cinema XXI', category: 'Entertainment' },
  { pattern: /cgv/i, name: 'CGV Cinemas', category: 'Entertainment' }
];

export function parseReceiptText(rawText = '') {
  if (!rawText || typeof rawText !== 'string') {
    return {
      amount: 0,
      merchant: 'Struk Belanja',
      category: 'Miscellaneous',
      payment_method: 'Cash / Tunai',
      date: new Date().toISOString()
    };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // 1. Detect Merchant Name
  let detectedMerchant = '';
  let detectedCategory = 'Food & Dining';

  for (const m of KNOWN_MERCHANTS) {
    if (m.pattern.test(rawText)) {
      detectedMerchant = m.name;
      detectedCategory = m.category;
      break;
    }
  }

  if (!detectedMerchant && lines.length > 0) {
    // Pick the most prominent top line as store name (skip pure numbers, dates, times)
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (line.length >= 3 && !/^\d+$/.test(line) && !/tanggal|struk|nota|invoice|receipt|selamat|welcome/i.test(line)) {
        detectedMerchant = line.slice(0, 40);
        break;
      }
    }
  }

  if (!detectedMerchant) {
    detectedMerchant = 'Struk Belanja';
  }

  // 2. Detect Amount (Total)
  let detectedAmount = 0;
  const amountCandidates = [];

  // Look for lines containing "TOTAL", "GRAND TOTAL", "JUMLAH", "SUBTOTAL", "BAYAR", "HARGA"
  for (const line of lines) {
    const isExplicitTotal = /total\s*harga|grand\s*total|\btotal\b|tagihan|netto|jumlah\s*total/i.test(line);
    const isSubtotalOrBayar = /subtotal|jumlah|bayar|tunai/i.test(line);

    // Regex for amounts: Rp 12.345, 12.345, 12,345, 12345
    const matches = [...line.matchAll(/(?:rp\.?|idr)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?|[0-9]{4,8})\b/gi)];

    for (const match of matches) {
      let numStr = match[1];
      // If ends with ,00 or .00 (cents), strip
      numStr = numStr.replace(/[.,]00$/, '');
      const cleanNum = parseInt(numStr.replace(/[.,]/g, ''), 10);

      if (!isNaN(cleanNum) && cleanNum >= 500 && cleanNum <= 100000000) {
        let weight = 10;
        if (isExplicitTotal) weight = 200;
        else if (isSubtotalOrBayar) weight = 80;

        amountCandidates.push({
          val: cleanNum,
          weight
        });
      }
    }
  }

  if (amountCandidates.length > 0) {
    // Prioritize high-weight (explicit total line), then highest realistic value
    amountCandidates.sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return b.val - a.val;
    });
    detectedAmount = amountCandidates[0].val;
  }

  // 3. Detect Payment Method
  let detectedPaymentMethod = 'BCA QRIS';
  const lower = rawText.toLowerCase();

  if (/qris/i.test(lower)) detectedPaymentMethod = 'BCA QRIS';
  else if (/gopay/i.test(lower)) detectedPaymentMethod = 'GoPay';
  else if (/ovo/i.test(lower)) detectedPaymentMethod = 'OVO';
  else if (/shopeepay|shopee/i.test(lower)) detectedPaymentMethod = 'ShopeePay';
  else if (/dana/i.test(lower)) detectedPaymentMethod = 'DANA';
  else if (/bca/i.test(lower)) detectedPaymentMethod = 'BCA Transfer';
  else if (/mandiri/i.test(lower)) detectedPaymentMethod = 'Mandiri Livin';
  else if (/kartu kredit|credit|visa|mastercard/i.test(lower)) detectedPaymentMethod = 'Kartu Kredit';
  else if (/debit|kartu debit/i.test(lower)) detectedPaymentMethod = 'Kartu Debit';
  else if (/cash|tunai/i.test(lower)) detectedPaymentMethod = 'Cash / Tunai';

  // 4. Refine Category if not set by known merchant
  if (detectedCategory === 'Miscellaneous' || !detectedCategory) {
    if (/kopi|coffee|tea|cafe|resto|nasi|mie|roti|ayam|bakso|soto|makan|minum/i.test(lower)) {
      detectedCategory = 'Food & Dining';
    } else if (/belanja|minimarket|supermarket|mart|toko|shampoo|sabun/i.test(lower)) {
      detectedCategory = 'Shopping';
    } else if (/bensin|pertalite|pertamax|solar|parkir|ojol|taxi|toll/i.test(lower)) {
      detectedCategory = 'Transport';
    } else if (/listrik|pln|pulsa|paket data|wifi|internet/i.test(lower)) {
      detectedCategory = 'Utilities';
    } else if (/obat|vitamin|apotek|dokter|klinik/i.test(lower)) {
      detectedCategory = 'Health & Wellness';
    } else if (/bioskop|tiket|nonton|game/i.test(lower)) {
      detectedCategory = 'Entertainment';
    }
  }

  return {
    amount: detectedAmount,
    merchant: detectedMerchant,
    category: detectedCategory,
    payment_method: detectedPaymentMethod,
    date: new Date().toISOString()
  };
}

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('ind+eng');
      return worker;
    })();
  }
  return workerPromise;
}

export async function recognizeReceiptImage(imageInput) {
  let buffer;
  if (Buffer.isBuffer(imageInput)) {
    buffer = imageInput;
  } else if (typeof imageInput === 'string') {
    const base64Data = imageInput.replace(/^data:image\/\w+;base64,/, '');
    buffer = Buffer.from(base64Data, 'base64');
  } else {
    throw new Error('Format gambar tidak didukung.');
  }

  const worker = await getWorker();
  const ret = await worker.recognize(buffer);
  const rawText = ret?.data?.text || '';
  const parsed = parseReceiptText(rawText);

  return {
    rawText,
    confidence: ret?.data?.confidence || 0,
    ...parsed
  };
}

/**
 * Memomeir Push Notification Parser
 * Accurately extracts transactions from Android push notifications:
 * - GoPay / Gojek (com.gojek.app)
 * - Livin' by Mandiri (id.co.bankmandiri.livin)
 * - Bank Jago (com.jago.app)
 * - BCA (com.bca, myBCA, Blu)
 * - Dana, OVO, ShopeePay, BRI, BNI
 */

export function parsePushNotification({ app = '', title = '', text = '', package: pkgName = '' }) {
  const combinedText = `${title} ${text}`.trim();
  const lower = combinedText.toLowerCase();
  const lowerApp = `${app} ${pkgName}`.toLowerCase();

  // 1. Detect Payment Method & App Source
  let paymentMethod = 'Lainnya';
  if (lowerApp.includes('gojek') || lowerApp.includes('gopay') || lower.includes('gopay') || lower.includes('go-pay')) {
    paymentMethod = 'GoPay';
  } else if (lowerApp.includes('mandiri') || lowerApp.includes('livin') || lower.includes('mandiri') || lower.includes('livin')) {
    paymentMethod = 'Mandiri Livin';
  } else if (lowerApp.includes('jago') || lower.includes('bank jago') || lower.includes('kantong')) {
    paymentMethod = 'Bank Jago';
  } else if (lowerApp.includes('bca') || lower.includes('mybca') || lower.includes('bca mobile') || lower.includes('blu by bca') || lower.includes('m-transfer') || /\bbca\b/.test(lower)) {
    paymentMethod = 'BCA';
  } else if (lowerApp.includes('dana') || (/\bdana\b/.test(lower) && !/dana\s*(?:masuk|keluar|tabungan|darurat|pensiun)/.test(lower))) {
    paymentMethod = 'DANA';
  } else if (lowerApp.includes('ovo') || /\bovo\b/.test(lower)) {
    paymentMethod = 'OVO';
  } else if (lowerApp.includes('shopee') || lower.includes('shopeepay')) {
    paymentMethod = 'ShopeePay';
  } else if (lowerApp.includes('bri') || lowerApp.includes('brimo') || /\bbri\b/.test(lower) || lower.includes('brimo')) {
    paymentMethod = 'Bank BRI';
  } else if (lowerApp.includes('bni') || lowerApp.includes('wondr') || /\bbni\b/.test(lower) || lower.includes('wondr')) {
    paymentMethod = 'Bank BNI';
  } else if (lower.includes('qris')) {
    paymentMethod = 'QRIS';
  }

  // 2. Detect Transaction Type (Expense vs Income)
  let type = 'expense';
  const isIncome =
    lower.includes('dana masuk') ||
    lower.includes('uang masuk') ||
    lower.includes('transfer masuk') ||
    lower.includes('menerima') ||
    lower.includes('diterima') ||
    lower.includes('dikreditkan') ||
    lower.includes('kredit') ||
    lower.includes('cashback') ||
    lower.includes('gaji') ||
    lower.includes('salary') ||
    lower.includes('top up berhasil') ||
    lower.includes('topup berhasil') ||
    lower.includes('terima uang') ||
    lower.includes('masuk ke rekening') ||
    lower.includes('masuk ke kantong');

  if (isIncome) {
    type = 'income';
  }

  // 3. Pre-clean text: Remove trailing currency cents (,00 or .00) common in Indonesian banking
  // e.g. "Rp 25.000,00" -> "Rp 25.000"
  const sanitizedText = text.replace(/([.,]00)(?!\d)/g, '');
  const sanitizedTitle = title.replace(/([.,]00)(?!\d)/g, '');

  // 4. Extract Monetary Amount
  let amount = 0;

  // Pattern 1: Explicit "Rp" or "IDR" (e.g. "Rp15.500", "Rp 16.700", "Rp. 50.000", "Rp 15 500")
  const rpMatch = sanitizedText.match(/(?:rp\.?|idr)\s*(\d{1,3}(?:[., ]\d{3})+|\d+)/i) ||
                  sanitizedTitle.match(/(?:rp\.?|idr)\s*(\d{1,3}(?:[., ]\d{3})+|\d+)/i);

  if (rpMatch) {
    const rawNum = rpMatch[1].replace(/[., ]/g, '');
    const parsed = parseInt(rawNum, 10);
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  // Pattern 2: "sebesar 50.000", "sebesar Rp...", "senilai Rp..."
  if (!amount) {
    const sebesarMatch = sanitizedText.match(/(?:sebesar|senilai)\s*(?:rp\.?)?\s*(\d{1,3}(?:[., ]\d{3})+|\d+)/i);
    if (sebesarMatch) {
      const rawNum = sebesarMatch[1].replace(/[., ]/g, '');
      const parsed = parseInt(rawNum, 10);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
      }
    }
  }

  // Pattern 3: Standard thousand-separated digits (e.g. "15.500" or "1.500.000")
  if (!amount) {
    const thousandMatch = sanitizedText.match(/\b(\d{1,3}(?:[.,]\d{3})+)\b/);
    if (thousandMatch) {
      const rawNum = thousandMatch[1].replace(/[.,]/g, '');
      const parsed = parseInt(rawNum, 10);
      if (!isNaN(parsed) && parsed >= 1000) {
        amount = parsed;
      }
    }
  }

  // If no amount was found, it's not a financial transaction notification (e.g. promo/marketing)
  if (!amount || amount <= 0) {
    return {
      isValid: false,
      reason: 'Tidak ditemukan nominal uang (kemungkinan pesan promo atau informasi non-transaksi).'
    };
  }

  // 5. Extract Merchant / Recipient / Description
  let merchant = '';

  // Match "ke QRIS <Merchant>", "ke <Merchant>", or "di <Merchant>"
  const merchantMatch = sanitizedText.match(/(?:ke\s+qris|ke|di)\s+(?:qris\s+)?([A-Za-z0-9\s&'.-]+?)(?:\s+(?:berhasil|sukses|via|menggunakan|\.|$))/i);
  if (merchantMatch && merchantMatch[1].trim().length > 1) {
    merchant = merchantMatch[1].trim().replace(/^qris\s+/i, '');
  }

  // Match Jago "untuk pembayaran ... di <Merchant>"
  const jagoMerchantMatch = sanitizedText.match(/untuk pembayaran.*?\s+di\s+([A-Za-z0-9\s&'.-]+?)(?:\s*\.|$)/i);
  if (jagoMerchantMatch && jagoMerchantMatch[1].trim().length > 1) {
    merchant = jagoMerchantMatch[1].trim();
  }

  // Match Income sender "dari <Sender>"
  if (type === 'income') {
    const senderMatch = sanitizedText.match(/dari\s+([A-Za-z0-9\s&'.-]+?)(?:\s+(?:ke|\.|$))/i);
    if (senderMatch && senderMatch[1].trim().length > 1) {
      merchant = `Dari ${senderMatch[1].trim()}`;
    }
  }

  // 6. Categorize based on merchant or description
  let category = 'Miscellaneous';
  if (type === 'income') {
    category = 'Salary';
  } else if (/solaria|warteg|warung|kopi|coffee|starbucks|makan|resto|kuliner|cafe|kafe|kenangan|tuku|bakso|soto|padang|mcd|mcdonald|kfc|hokben|burger|pizza|bread|roti|jajan|snack|mie|chatime|mixue|fore|janji jiwa|point coffee|kopitiam/i.test(lower)) {
    category = 'Food & Dining';
  } else if (/spbu|pertamina|shell|\bbensin\b|\bpertamax\b|\bpertalite\b|\bsolar\b|parkir|toll|\btol\b|gojek|goride|gocar|grab|bluebird|transjakarta|kereta|kai|krl|mrt|lrt/i.test(lower)) {
    category = 'Transport';
  } else if (/indomaret|alfamart|alfamidi|superindo|hypermart|transmart|shopee|tokopedia|lazada|tiktok|belanja|pasar|fashion|uniqlo|zara|h&m|miniso|mr diy|ace hardware|gramedia/i.test(lower)) {
    category = 'Shopping';
  } else if (/pln|listrik|pdam|air|wifi|indihome|biznet|myrepublic|pulsa|paket data|bpjs|tagihan|telkom|pajak/i.test(lower)) {
    category = 'Utilities';
  } else if (/apotek|kimia farma|guardian|watsons|klinik|dokter|rumah sakit|rs|obat|vitamin|halodoc|alodokter/i.test(lower)) {
    category = 'Health & Wellness';
  } else if (/bioskop|cinema|xxi|cgv|cinepolis|netflix|spotify|steam|playstation|youtube|disney|game|voucher game/i.test(lower)) {
    category = 'Entertainment';
  } else if (/bibit|ajaib|bareksa|reksadana|saham|crypto|pluang|binance|tokocrypto|indodax/i.test(lower)) {
    category = 'Investments';
  } else {
    // Sensible default for mobile transactions
    category = 'Food & Dining';
  }

  // Formulate concise human-readable description
  const cleanMerchant = merchant ? merchant.replace(/[.]+$/, '').trim() : '';
  const finalDescription = cleanMerchant
    ? `[${paymentMethod}] ${cleanMerchant}`
    : `[${paymentMethod}] ${text.slice(0, 80)}`;

  return {
    isValid: true,
    type,
    amount,
    category,
    payment_method: paymentMethod,
    merchant: cleanMerchant,
    description: finalDescription,
    rawText: text,
    date: new Date().toISOString()
  };
}

/**
 * Natural Language & Receipt Text Parser for Memomeir WhatsApp Bot
 * Tailored for Indonesian informal language, slang, abbreviations, and store receipts.
 */

export function parseChatText(rawText = '') {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. Check for Bot Commands
  if (/^(saldo|cek saldo|total saldo|sisa saldo|uang saya|info saldo)$/i.test(lower)) {
    return { isCommand: true, command: 'check_balance' };
  }

  if (/^(help|bantuan|menu|cara pakai|format)$/i.test(lower)) {
    return { isCommand: true, command: 'help' };
  }

  if (/^(riwayat|riwayat transaksi|mutasi|terakhir)$/i.test(lower)) {
    return { isCommand: true, command: 'recent_history' };
  }

  if (/^(#?status|#?keamanan|#?infobot)$/i.test(lower)) {
    return { isCommand: true, command: 'bot_status' };
  }

  if (/^(#?kunci|#?lock|#?lockhere|#?kuncidisini|#?verifikasi)$/i.test(lower)) {
    return { isCommand: true, command: 'lock_room' };
  }

  if (/^(#?self|#?selfonly|#?sendiri|#?nomorsendiri)$/i.test(lower)) {
    return { isCommand: true, command: 'mode_self' };
  }

  if (/^(#?semua|#?all|#?unlock)$/i.test(lower)) {
    return { isCommand: true, command: 'mode_all' };
  }

  // 2. Strict Financial Intent Check
  // A message MUST have a financial currency indicator (rp, idr, k, rb, jt) OR an explicit financial action verb!
  const hasCurrencyIndicator = /(?:rp\.?|idr|\$)\s*\d+|\d+\s*(?:k|rb|ribu|jt|juta)\b/i.test(lower);
  const hasFinancialKeyword = /\b(beli|jajan|bayar|ongkos|habis|belanja|makan|ngopi|bensin|gaji|transfer|topup|top up|isi saldo|pemasukan|pengeluaran|tf|checkout|pesan|order|struk|qris|biaya|tagihan|sewa|indomaret|alfamart|supermarket|warung|resto|cafe|kopi|pulsa|listrik|token|dana|gopay|ovo|shopeepay|cash|tunai)\b/i.test(lower);

  // If a message has NEITHER a currency unit NOR a financial keyword, reject immediately!
  if (!hasCurrencyIndicator && !hasFinancialKeyword) {
    return {
      isValidTransaction: false,
      rawText: text,
      message: 'Bukan pesan transaksi keuangan.'
    };
  }

  // 3. Pre-clean Non-Financial Numbers (Times, Dates, Phone Numbers, Measurements)
  let cleanText = lower;

  // Remove clock times (e.g. "jam 10.30", "jam 10:30", "pukul 10.30", "10.30 wib", "jam 10")
  cleanText = cleanText.replace(/(?:jam|pukul)\s*[0-2]?[0-9](?:[.:][0-5][0-9])?/gi, ' ');
  cleanText = cleanText.replace(/\b[0-2]?[0-9][.:][0-5][0-9]\s*(?:wib|wita|wit|am|pm)?\b/gi, ' ');

  // Remove dates (e.g. "tgl 10", "tanggal 19", "19/10/2026", "19-10-2026")
  cleanText = cleanText.replace(/(?:tgl|tanggal)\s*[0-3]?[0-9](?:\s*(?:jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des|\w+))?/gi, ' ');
  cleanText = cleanText.replace(/\b[0-3]?[0-9][\/-][0-1]?[0-9][\/-](?:20)?[0-9]{2}\b/g, ' ');

  // Remove phone numbers
  cleanText = cleanText.replace(/\+?[0-9]{9,15}\b/g, ' ');

  // Remove counting and measurement units (e.g. "10 menit", "5 orang", "no 10")
  cleanText = cleanText.replace(/\b\d+\s*(?:menit|detik|jam|hari|minggu|bulan|tahun|orang|pcs|buah|lembar|porsi|kali|kg|gram|meter|cm|km)\b/gi, ' ');
  cleanText = cleanText.replace(/\b(?:nomor|no|bab|pasal|hal|halaman|ruang|lantai|kamar|kelas)\s*\d+\b/gi, ' ');

  // 4. Extract Monetary Amount from Cleaned Text
  let detectedAmount = 0;

  // Pattern A: Number with Indonesian slang unit (e.g., 30k, 30rb, 30 ribu, 10jt, 1.5jt)
  const unitMatch = cleanText.match(/\b(\d+(?:[.,]\d+)?)\s*(k|rb|ribu|jt|juta)\b/i);
  if (unitMatch) {
    let numStr = unitMatch[1].replace(/,/g, '.');
    let val = parseFloat(numStr);
    const unit = unitMatch[2].toLowerCase();
    if (unit === 'jt' || unit === 'juta') {
      val = Math.round(val * 1000000);
    } else if (unit === 'k' || unit === 'rb' || unit === 'ribu') {
      val = Math.round(val * 1000);
    }
    if (!isNaN(val) && val > 0) {
      detectedAmount = val;
    }
  }

  // Pattern B: Number with currency prefix (e.g., Rp 50.000, Rp50000, IDR 30.000)
  if (detectedAmount === 0) {
    const rpMatch = cleanText.match(/(?:rp\.?|idr|\$)\s*(\d{1,3}(?:[.,]\d{3})*|\d+)/i);
    if (rpMatch) {
      let numStr = rpMatch[1].replace(/[.,]/g, '');
      let val = parseInt(numStr, 10);
      if (!isNaN(val) && val > 0) {
        detectedAmount = val;
      }
    }
  }

  // Pattern C: Full thousands formatted number (e.g., 30.000, 150.000, 1.500.000)
  // Must have 3 digits after the dot to prevent matching 10.30 (time)
  if (detectedAmount === 0) {
    const formattedMatch = cleanText.match(/\b(\d{1,3}(?:\.\d{3})+)\b/);
    if (formattedMatch) {
      let numStr = formattedMatch[1].replace(/\./g, '');
      let val = parseInt(numStr, 10);
      if (!isNaN(val) && val >= 1000) {
        detectedAmount = val;
      }
    }
  }

  // Pattern D: Bare large integer (e.g. 50000, 25000) ONLY IF explicit financial keyword is present
  if (detectedAmount === 0 && hasFinancialKeyword) {
    const bareMatch = cleanText.match(/\b(\d{4,8})\b/);
    if (bareMatch) {
      let val = parseInt(bareMatch[1], 10);
      if (!isNaN(val) && val >= 1000) {
        detectedAmount = val;
      }
    }
  }

  // If no amount detected or unrealistically small
  if (detectedAmount <= 0) {
    return {
      isValidTransaction: false,
      rawText: text,
      message: 'Nominal tidak terdeteksi atau bukan transaksi.'
    };
  }

  // 5. Detect Type (Income vs Expense)
  let detectedType = 'expense';
  if (/gaji|salary|terima|masuk|income|freelance|bonus|transfer masuk|inflow|penjualan|dapat uang|cair/i.test(lower)) {
    detectedType = 'income';
  }


  // 4. Detect Category & Merchant
  let detectedCategory = 'Miscellaneous';
  let merchantOrPlace = '';

  // Check known merchants / places
  if (/indomaret/i.test(lower)) {
    merchantOrPlace = 'Indomaret';
    detectedCategory = lower.includes('jajan') || lower.includes('makan') || lower.includes('minum')
      ? 'Food & Dining'
      : 'Shopping';
  } else if (/alfamart|alfamidi/i.test(lower)) {
    merchantOrPlace = 'Alfamart';
    detectedCategory = 'Shopping';
  } else if (/starbucks/i.test(lower)) {
    merchantOrPlace = 'Starbucks';
    detectedCategory = 'Food & Dining';
  } else if (/kopi kenangan|tuku|fore|janji jiwa|mixue|chatime/i.test(lower)) {
    merchantOrPlace = 'Kedai Kopi';
    detectedCategory = 'Food & Dining';
  } else if (/mcd|mcdonald|kfc|burger king|aw|hokben/i.test(lower)) {
    merchantOrPlace = 'Fast Food';
    detectedCategory = 'Food & Dining';
  } else if (/warteg|padang|soto|bakso|mie ayam|pecel/i.test(lower)) {
    merchantOrPlace = 'Kuliner';
    detectedCategory = 'Food & Dining';
  } else if (/tokopedia|tokped|shopee|lazada|tiktok shop/i.test(lower)) {
    merchantOrPlace = 'Online Shopping';
    detectedCategory = 'Shopping';
  } else if (/bluebird|grab|gojek|goride|gocar|krl|kereta|mrt|busway|transjakarta/i.test(lower)) {
    merchantOrPlace = 'Transportasi';
    detectedCategory = 'Transport';
  } else if (/pln|listrik|token listrik/i.test(lower)) {
    merchantOrPlace = 'PLN';
    detectedCategory = 'Utilities';
  } else if (/indihome|biznet|wifi|first media/i.test(lower)) {
    merchantOrPlace = 'Internet Wifi';
    detectedCategory = 'Utilities';
  }

  // Fallback category detection based on keywords
  if (detectedCategory === 'Miscellaneous') {
    if (detectedType === 'income') {
      detectedCategory = 'Salary';
    } else if (/kopi|makan|minum|snack|roti|sarapan|lunch|dinner|resto|cafe|nasi|jajan/i.test(lower)) {
      detectedCategory = 'Food & Dining';
    } else if (/bensin|pertamax|pertalite|solar|bbm|parkir|toll|tol|taksi|ojol|ongkos/i.test(lower)) {
      detectedCategory = 'Transport';
    } else if (/listrik|pln|air|pdam|wifi|pulsa|paket data|iuran|bpjs/i.test(lower)) {
      detectedCategory = 'Utilities';
    } else if (/belanja|baju|sepatu|celana|tas|supermarket|pasar/i.test(lower)) {
      detectedCategory = 'Shopping';
    } else if (/nonton|bioskop|cinema|netflix|spotify|game|steam/i.test(lower)) {
      detectedCategory = 'Entertainment';
    } else if (/obat|dokter|apotek|klinik|vitamin/i.test(lower)) {
      detectedCategory = 'Health & Wellness';
    } else if (/saham|reksadana|crypto|tabungan|deposito/i.test(lower)) {
      detectedCategory = 'Investments';
    }
  }

  // 5. Detect Payment Method
  let detectedMethod = 'Cash / Tunai';
  if (/qris|bca qris/i.test(lower)) {
    detectedMethod = 'BCA QRIS';
  } else if (/gopay|go-pay/i.test(lower)) {
    detectedMethod = 'GoPay';
  } else if (/ovo/i.test(lower)) {
    detectedMethod = 'OVO';
  } else if (/shopeepay|shopee pay/i.test(lower)) {
    detectedMethod = 'ShopeePay';
  } else if (/dana/i.test(lower)) {
    detectedMethod = 'DANA';
  } else if (/mandiri|livin/i.test(lower)) {
    detectedMethod = 'Mandiri Livin';
  } else if (/bca|transfer bca/i.test(lower)) {
    detectedMethod = 'BCA Transfer';
  } else if (/bri|bni/i.test(lower)) {
    detectedMethod = 'Bank Transfer';
  } else if (/kartu kredit|credit card/i.test(lower)) {
    detectedMethod = 'Kartu Kredit';
  } else if (/cash|tunai/i.test(lower)) {
    detectedMethod = 'Cash / Tunai';
  }

  return {
    isValidTransaction: true,
    type: detectedType,
    amount: detectedAmount,
    category: detectedCategory,
    payment_method: detectedMethod,
    merchant: merchantOrPlace,
    description: text,
    date: new Date().toISOString()
  };
}

/**
 * Parses OCR extracted text from a receipt or cashier slip photo
 */
export function parseReceiptText(ocrText = '') {
  if (!ocrText || typeof ocrText !== 'string') {
    return { isValid: false, message: 'Teks struk kosong atau tidak terbaca' };
  }

  const lines = ocrText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const fullText = ocrText.toLowerCase();

  // 1. Detect Merchant Name
  let merchant = 'Struk Belanja';
  let category = 'Shopping';

  if (/indomaret/i.test(fullText)) {
    merchant = 'Indomaret';
    category = 'Shopping';
  } else if (/alfamart|alfamidi/i.test(fullText)) {
    merchant = 'Alfamart';
    category = 'Shopping';
  } else if (/starbucks/i.test(fullText)) {
    merchant = 'Starbucks Coffee';
    category = 'Food & Dining';
  } else if (/superindo/i.test(fullText)) {
    merchant = 'Superindo';
    category = 'Shopping';
  } else if (/kfc|kentucky/i.test(fullText)) {
    merchant = 'KFC';
    category = 'Food & Dining';
  } else if (/mcdonald/i.test(fullText)) {
    merchant = "McDonald's";
    category = 'Food & Dining';
  } else if (/hypermart|transmart/i.test(fullText)) {
    merchant = 'Supermarket';
    category = 'Shopping';
  } else if (lines.length > 0) {
    // Usually line 0 or 1 is the store name
    merchant = lines[0].slice(0, 35);
  }

  // 2. Search for TOTAL / TOTAL BELANJA / JUMLAH
  let totalAmount = 0;
  const totalKeywords = /(?:total\s*belanja|total\s*bayar|grand\s*total|subtotal|total|jumlah|harga\s*total|bayar|netto)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (totalKeywords.test(line)) {
      // Find numbers in this line or the immediate next line
      const numMatch = line.match(/(?:rp\.?|idr)?\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,8})/i) ||
                       (lines[i + 1] && lines[i + 1].match(/(?:rp\.?|idr)?\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,8})/i));
      if (numMatch) {
        const clean = numMatch[1].replace(/[.,]/g, '');
        const val = parseInt(clean, 10);
        if (!isNaN(val) && val > 0 && val < 50000000) {
          totalAmount = val;
          break;
        }
      }
    }
  }

  // Fallback: If no TOTAL keyword found, look for largest realistic receipt number
  if (totalAmount === 0) {
    const allNumbers = [];
    const generalNumRegex = /\b([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,7})\b/g;
    let match;
    while ((match = generalNumRegex.exec(ocrText)) !== null) {
      const clean = match[1].replace(/[.,]/g, '');
      const val = parseInt(clean, 10);
      if (!isNaN(val) && val >= 1000 && val <= 10000000) {
        allNumbers.push(val);
      }
    }
    if (allNumbers.length > 0) {
      // Max number in a receipt is usually the total
      totalAmount = Math.max(...allNumbers);
    }
  }

  // 3. Payment Method on receipt
  let paymentMethod = 'BCA QRIS';
  if (/tunai|cash/i.test(fullText)) paymentMethod = 'Cash / Tunai';
  else if (/qris/i.test(fullText)) paymentMethod = 'BCA QRIS';
  else if (/gopay/i.test(fullText)) paymentMethod = 'GoPay';
  else if (/shopeepay|shopee/i.test(fullText)) paymentMethod = 'ShopeePay';
  else if (/debit|kartu debit/i.test(fullText)) paymentMethod = 'Kartu Debit';
  else if (/kredit|credit/i.test(fullText)) paymentMethod = 'Kartu Kredit';

  if (totalAmount <= 0) {
    return {
      isValid: false,
      merchant,
      message: 'Gagal mendeteksi total belanja dari foto struk ini. Pastikan foto struk terlihat jelas dan cukup cahaya.'
    };
  }

  return {
    isValid: true,
    type: 'expense',
    amount: totalAmount,
    category,
    payment_method: paymentMethod,
    merchant,
    description: `[Struk Kasir] ${merchant}`,
    date: new Date().toISOString()
  };
}

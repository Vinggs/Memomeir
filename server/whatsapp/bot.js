import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Tesseract from 'tesseract.js';
import { parseChatText, parseReceiptText } from './parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_DIR = path.join(__dirname, 'auth_info');
const QR_STATUS_FILE = path.join(__dirname, 'status.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');
const API_BASE = process.env.API_BASE || 'http://localhost:4000';

// Ensure auth directory exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      if (typeof cfg.enabled === 'undefined') cfg.enabled = true;
      return cfg;
    }
  } catch (err) {
    console.error('[Bot Config] Failed to read config:', err);
  }
  return {
    enabled: true,
    mode: 'self_only', // 'self_only' | 'locked_room' | 'all'
    ownerPhone: '6281389352752',
    ownerLid: '149104101474415',
    lockedRoomJid: '149104101474415@lid',
    ownerName: 'Farrel',
    allowedNumbers: ['6281389352752', '149104101474415'],
    allowedRooms: ['6281389352752@s.whatsapp.net', '149104101474415@lid']
  };
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...cfg, updatedAt: new Date().toISOString() }, null, 2));
  } catch (err) {
    console.error('[Bot Config] Failed to write config:', err);
  }
}

function updateStatus(statusData) {
  try {
    fs.writeFileSync(
      QR_STATUS_FILE,
      JSON.stringify({ ...statusData, updatedAt: new Date().toISOString() }, null, 2)
    );
  } catch (err) {
    console.error('[Bot Status] Failed to write status file:', err);
  }
}


// Helper to format currency
function formatRupiah(num) {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

// Fetch financial stats from Memomeir API
async function getFinancialStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('[Bot API] Failed to fetch stats:', err.message);
  }
  return null;
}

// Fetch recent transactions from Memomeir API
async function getRecentTransactions(limit = 5) {
  try {
    const res = await fetch(`${API_BASE}/api/transactions?limit=${limit}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('[Bot API] Failed to fetch transactions:', err.message);
  }
  return null;
}

// Insert transaction into Memomeir database
async function recordTransaction(payload) {
  try {
    const res = await fetch(`${API_BASE}/api/webhook/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-source': 'whatsapp-baileys-bot'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    console.error('[Bot API] Failed to post transaction:', err.message);
    return { ok: false, error: err.message };
  }
}

export async function startWhatsAppBot() {
  console.log('\n========================================================');
  console.log('🤖 MEMOMEIR WHATSAPP BOT SERVICE');
  console.log('========================================================\n');

  updateStatus({ state: 'initializing', message: 'Memulai koneksi WhatsApp...' });

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }), // Silent logger to keep console clean for QR
    printQRInTerminal: false, // We'll handle custom terminal QR display
    auth: state,
    browser: ['Memomeir Keuangan', 'Chrome', '120.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  // Connection events (QR, Connected, Reconnect)
  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 SCAN QR CODE BERIKUT DENGAN WHATSAPP DI HP ANDA:\n');
      console.log('1. Buka WhatsApp di HP Anda');
      console.log('2. Tekan menu (titik tiga) atau Pengaturan ➡️ Perangkat Tertaut (Linked Devices)');
      console.log('3. Tekan "Tautkan Perangkat" dan arahkan kamera ke QR Code di bawah:\n');

      qrcodeTerminal.generate(qr, { small: true });

      let qrDataUrl = null;
      try {
        qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
      } catch (e) {
        console.error('[Bot QR] Failed to create data URL:', e);
      }

      updateStatus({
        state: 'qr_ready',
        qr,
        qrDataUrl,
        message: 'Silakan scan QR code di layar web atau di terminal untuk menyambungkan WhatsApp.'
      });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`\n⚠️ Koneksi WhatsApp terputus (Status: ${statusCode || 'unknown'}).`);

      if (shouldReconnect) {
        console.log('🔄 Mencoba menyambung kembali dalam 5 detik...');
        updateStatus({ state: 'reconnecting', message: 'Mencoba menyambung ulang...' });
        setTimeout(() => startWhatsAppBot(), 5000);
      } else {
        console.log('❌ Sesi WhatsApp telah Logout. Silakan jalankan ulang bot untuk scan QR baru.');
        updateStatus({ state: 'logged_out', message: 'Sesi WhatsApp berakhir.' });
      }
    } else if (connection === 'open') {
      const userPhone = sock.user?.id ? sock.user.id.split(':')[0] : 'Aktif';
      console.log('\n========================================================');
      console.log(`🟢 WHATSAPP BOT BERHASIL TERHUBUNG!`);
      console.log(`Nomor Akun:   +${userPhone}`);
      console.log(`Status Web:   Tersambung ke ${API_BASE}`);
      console.log('Bot siap mencatat chat pengeluaran & foto struk!');
      console.log('========================================================\n');

      updateStatus({
        state: 'connected',
        phone: userPhone,
        message: 'WhatsApp Bot terhubung dan aktif.'
      });
    }
  });

  // Incoming Messages Handler
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;

      const remoteJid = msg.key.remoteJid;
      // Skip status broadcast updates, group chats, and WhatsApp channels/newsletters
      if (
        !remoteJid ||
        remoteJid === 'status@broadcast' ||
        remoteJid.endsWith('@g.us') ||
        remoteJid.endsWith('@newsletter')
      ) {
        continue;
      }

      // ==============================================================
      // STRICT SECURITY & PRIVACY VERIFICATION FILTER
      // HANYA respon ruang obrolan Farrel sendiri:
      // - Nomor HP: 6281389352752@s.whatsapp.net
      // - WhatsApp Web LID: 149104101474415@lid
      // Chat dengan kontak lain (Amel, teman, keluarga, dsb) 100% DIBLOKIR & DIABAIKAN!
      // ==============================================================
      const config = loadConfig();
      const userPhone = sock.user?.id ? sock.user.id.split(':')[0].replace(/[^0-9]/g, '') : '6281389352752';
      const userLid = sock.user?.lid ? sock.user.lid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : '149104101474415';
      const remotePhone = remoteJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
      const ownerPhone = (config.ownerPhone || '6281389352752').replace(/[^0-9]/g, '');
      const ownerLid = (config.ownerLid || '149104101474415').replace(/[^0-9]/g, '');

      // Strictly check if this room is Farrel's own self-chat or locked room
      const isFarrelPhone = Boolean(remotePhone && (remotePhone === userPhone || remotePhone === ownerPhone));
      const isFarrelLid = Boolean(remotePhone && (remotePhone === userLid || remotePhone === ownerLid));
      const isLockedRoom = Boolean(
        config.lockedRoomJid &&
        (remoteJid.toLowerCase() === config.lockedRoomJid.toLowerCase() ||
         remotePhone === config.lockedRoomJid.split('@')[0].replace(/[^0-9]/g, ''))
      );

      let isAuthorized = false;
      if (config.mode === 'all') {
        isAuthorized = true;
      } else if (config.mode === 'locked_room') {
        isAuthorized = isLockedRoom;
      } else {
        // Default: 'self_only' -> HANYA nomor Farrel atau LID Farrel sendiri!
        isAuthorized = isFarrelPhone || isFarrelLid || isLockedRoom;
      }

      console.log(`[WA Bot] Chat from: ${remoteJid} (remotePhone: ${remotePhone}) -> authorized: ${isAuthorized}`);

      // Jika obrolan BUKAN ruang obrolan Farrel (misal chat dengan Amel), abaikan 100%!
      if (!isAuthorized) {
        continue;
      }

      // Extract text content
      const textMessage =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        '';

      // Ignore messages generated by the bot itself to prevent infinite feedback loops
      if (
        textMessage.startsWith('✅ *Transaksi') ||
        textMessage.startsWith('🧾 *Struk') ||
        textMessage.startsWith('📊 *Ringkasan') ||
        textMessage.startsWith('🤖 *Panduan') ||
        textMessage.startsWith('📋 *') ||
        textMessage.startsWith('🔒 *') ||
        textMessage.startsWith('🔓 *') ||
        textMessage.startsWith('🛡️ *') ||
        textMessage.startsWith('🔴 *') ||
        textMessage.startsWith('🟢 *') ||
        textMessage.startsWith('⚠️') ||
        textMessage.startsWith('💡') ||
        textMessage.startsWith('🔍 *Foto') ||
        textMessage.startsWith('❌ Gagal')
      ) {
        continue;
      }


      const isImage = Boolean(msg.message?.imageMessage);

      // ==============================================================
      // 1. HANDLE RECEIPT IMAGE SCAN (Foto Struk Belanja)
      // ==============================================================
      if (isImage) {
        if (config.enabled === false) {
          console.log('[WA Bot] Foto struk diabaikan karena bot sedang dinonaktifkan (mode tidur).');
          continue;
        }

        console.log(`[WA Bot] Menerima foto struk dari ${remoteJid}...`);

        try {
          // Send waiting acknowledgment
          await sock.sendMessage(remoteJid, {
            text: '🔍 *Foto struk belanja diterima!*\nSedang memindai total nominal dan toko via OCR AI...',
          }, { quoted: msg });

          // Download image buffer from WhatsApp
          const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
          );

          // Run OCR with Tesseract
          const { data: { text: ocrText } } = await Tesseract.recognize(buffer, 'ind+eng');
          console.log('[WA Bot] Hasil OCR Struk:\n', ocrText.slice(0, 200));

          const parsedReceipt = parseReceiptText(ocrText);

          if (parsedReceipt.isValid && parsedReceipt.amount > 0) {
            // Save to database
            const result = await recordTransaction({
              type: parsedReceipt.type,
              amount: parsedReceipt.amount,
              category: parsedReceipt.category,
              payment_method: parsedReceipt.payment_method,
              description: parsedReceipt.description,
              date: parsedReceipt.date
            });

            if (result.ok) {
              const reply =
                `🧾 *Struk Belanja Berhasil Dipindai!*\n\n` +
                `🏪 *Tempat:* ${parsedReceipt.merchant}\n` +
                `💰 *Total:* ${formatRupiah(parsedReceipt.amount)}\n` +
                `📂 *Kategori:* ${parsedReceipt.category}\n` +
                `💳 *Metode:* ${parsedReceipt.payment_method}\n\n` +
                `⚡ *Transaksi langsung tercatat di website Memomeir!*`;

              await sock.sendMessage(remoteJid, { text: reply }, { quoted: msg });
            } else {
              await sock.sendMessage(remoteJid, {
                text: `❌ Gagal menyimpan transaksi struk ke database: ${result.error || 'Server error'}`
              }, { quoted: msg });
            }
          } else {
            // OCR failed or amount unclear
            const fallbackReply =
              `⚠️ *Total nominal pada struk belum terbaca jelas.*\n\n` +
              `Tips: Pastikan foto struk terang, tidak buram, dan tulisan "TOTAL" terlihat.\n\n` +
              `💡 Anda juga bisa langsung ketik manual, contoh:\n` +
              `_Jajan di Indomaret 30k_`;

            await sock.sendMessage(remoteJid, { text: fallbackReply }, { quoted: msg });
          }
        } catch (err) {
          console.error('[WA Bot] Error processing image:', err);
          await sock.sendMessage(remoteJid, {
            text: `⚠️ Maaf, terjadi kendala saat memproses gambar struk: ${err.message}`
          }, { quoted: msg });
        }
        continue;
      }

      // ==============================================================
      // 2. HANDLE TEXT MESSAGES (Chat Santai, misal "jajan di indomaret 30k")
      // ==============================================================
      if (!textMessage.trim()) continue;

      console.log(`[WA Bot] Pesan diterima: "${textMessage}"`);

      // Parse intent or transaction
      const parsed = parseChatText(textMessage);

      // A. Bot Commands
      if (parsed.isCommand) {
        // 1. Matikan Bot (Pause / Mode Tidur)
        if (parsed.command === 'bot_off') {
          config.enabled = false;
          saveConfig(config);

          const offReply =
            `🔴 *Bot Memomeir Dinonaktifkan (Mode Tidur)*\n\n` +
            `Bot telah dijeda dan *tidak akan mencatat transaksi* ataupun merespon chat santai apa pun.\n\n` +
            `💡 Ketik *#on* atau *#aktif* kapan saja untuk mengaktifkan bot kembali.`;

          await sock.sendMessage(remoteJid, { text: offReply }, { quoted: msg });
          continue;
        }

        // 2. Aktifkan Bot (Resume / Nyalakan)
        if (parsed.command === 'bot_on') {
          config.enabled = true;
          saveConfig(config);

          const onReply =
            `🟢 *Bot Memomeir Berhasil Diaktifkan!*\n\n` +
            `Bot sekarang aktif kembali dan siap mencatat pengeluaran atau struk belanja Anda seperti biasa.\n\n` +
            `💡 Ketik *#off* atau *#mati* jika ingin menonaktifkan bot kembali sewaktu-waktu.`;

          await sock.sendMessage(remoteJid, { text: onReply }, { quoted: msg });
          continue;
        }

        // 3. Lock room to current chat room
        if (parsed.command === 'lock_room') {
          config.mode = 'locked_room';
          config.lockedRoomJid = remoteJid;
          if (!config.allowedRooms) config.allowedRooms = [];
          if (!config.allowedRooms.includes(remoteJid)) config.allowedRooms.push(remoteJid);
          saveConfig(config);

          const lockReply =
            `🔒 *Ruang Obrolan Ini Berhasil Dikunci!*\n\n` +
            `Mulai saat ini, bot Memomeir *HANYA* aktif dan memproses obrolan di chat room ini.\n` +
            `Chat pribadi Anda dengan orang lain tidak akan diproses atau diganggu sama sekali.\n\n` +
            `• *ID Room:* \`${remoteJid}\`\n` +
            `• *Mode Proteksi:* Terkunci (Locked Room)\n\n` +
            `💡 Ketik *#status* untuk cek status, atau *#self* untuk kembali ke mode nomor pribadi.`;

          await sock.sendMessage(remoteJid, { text: lockReply }, { quoted: msg });
          continue;
        }

        // 4. Mode Self (Khusus Farrel / Nomor Sendiri)
        if (parsed.command === 'mode_self') {
          config.mode = 'self_only';
          saveConfig(config);

          const selfReply =
            `🔒 *Mode Bot: Khusus Farrel & Chat Nomor Sendiri*\n\n` +
            `Bot sekarang hanya aktif di chat ke nomor Farrel (+${ownerPhone || userPhone}).\n` +
            `Chat lain dengan teman/keluarga otomatis diabaikan secara aman.\n\n` +
            `Ketik *#kunci* di ruang obrolan mana saja jika ingin mengunci bot ke ruang obrolan tersebut.`;

          await sock.sendMessage(remoteJid, { text: selfReply }, { quoted: msg });
          continue;
        }

        // 5. Mode All (Semua Chat Pribadi Diizinkan)
        if (parsed.command === 'mode_all') {
          config.mode = 'all';
          saveConfig(config);

          const allReply =
            `🔓 *Mode Bot: Terbuka untuk Semua Chat Pribadi*\n\n` +
            `Bot diizinkan merespon di semua ruang chat pribadi 1-on-1.\n` +
            `Ketik *#kunci* di chat ini kapan saja untuk membatasi bot kembali.`;

          await sock.sendMessage(remoteJid, { text: allReply }, { quoted: msg });
          continue;
        }

        // 6. Status Proteksi & Daya Bot
        if (parsed.command === 'bot_status') {
          const modeLabel =
            config.mode === 'locked_room'
              ? '🔒 Terkunci Khusus Room Ini'
              : config.mode === 'self_only'
              ? '🔒 Khusus Farrel / Nomor Sendiri'
              : '🔓 Terbuka untuk Semua Chat Pribadi';

          const powerLabel = config.enabled !== false
            ? '🟢 Aktif (Siap Mencatat)'
            : '🔴 Nonaktif / Dijeda (Mode Tidur)';

          const statusReply =
            `🛡️ *Status Verifikasi & Daya Bot Memomeir*\n\n` +
            `• *Status Daya:* ${powerLabel}\n` +
            `• *Mode Keamanan:* ${modeLabel}\n` +
            `• *Pemilik Terdaftar:* ${config.ownerName || 'Farrel'}\n` +
            `• *Nomor Pemilik:* +${ownerPhone || userPhone}\n` +
            `• *Room Terkunci:* ${config.lockedRoomJid || '(Belum dikunci)'}\n` +
            `• *Proteksi Chat Lain:* 🟢 Aktif (Chat selain Farrel diabaikan otomatis)\n\n` +
            `*Perintah Pengaturan Cepat:* \n` +
            `• *#off*   : Matikan / jeda bot (mode tidur)\n` +
            `• *#on*    : Aktifkan kembali bot\n` +
            `• *#kunci* : Kunci bot di ruang obrolan ini\n` +
            `• *#self*  : Set khusus nomor Farrel / diri sendiri\n` +
            `• *saldo*  : Cek ringkasan saldo keuangan\n` +
            `• *mutasi* : Cek 5 transaksi terakhir\n` +
            `• *help*   : Panduan lengkap penggunaan`;

          await sock.sendMessage(remoteJid, { text: statusReply }, { quoted: msg });
          continue;
        }

        // 5. Cek Saldo
        if (parsed.command === 'check_balance') {
          const stats = await getFinancialStats();
          if (stats && stats.summary) {
            const { totalBalance, monthlyExpense, monthlyIncome } = stats.summary;
            const reply =
              `📊 *Ringkasan Keuangan Memomeir*\n\n` +
              `💵 *Total Saldo Bersih:* ${formatRupiah(totalBalance)}\n` +
              `📈 *Pemasukan Bulan Ini:* ${formatRupiah(monthlyIncome)}\n` +
              `📉 *Pengeluaran Bulan Ini:* ${formatRupiah(monthlyExpense)}\n\n` +
              `Ketik pengeluaran Anda kapan saja untuk mencatat (contoh: _Makan siang 35rb qris_).`;
            await sock.sendMessage(remoteJid, { text: reply }, { quoted: msg });
          } else {
            await sock.sendMessage(remoteJid, {
              text: '⚠️ Gagal mengambil saldo dari server. Pastikan server web sedang aktif.'
            }, { quoted: msg });
          }
          continue;
        }

        // 6. Mutasi / Riwayat 5 Transaksi Terakhir
        if (parsed.command === 'recent_history') {
          const recentData = await getRecentTransactions(5);
          if (recentData && Array.isArray(recentData.transactions)) {
            const list = recentData.transactions;
            if (list.length === 0) {
              await sock.sendMessage(remoteJid, {
                text: '📋 *Belum ada riwayat transaksi tercatat di Memomeir.*'
              }, { quoted: msg });
            } else {
              let historyReply = `📋 *5 Transaksi Terakhir di Memomeir:*\n\n`;
              list.forEach((t, i) => {
                const icon = t.type === 'income' ? '💰' : '💸';
                const formattedDate = new Date(t.date).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short'
                });
                historyReply += `${i + 1}. ${icon} *${formatRupiah(t.amount)}* - ${t.description || t.category} (${formattedDate})\n`;
              });
              historyReply += `\nKetik *saldo* untuk melihat total saldo.`;
              await sock.sendMessage(remoteJid, { text: historyReply }, { quoted: msg });
            }
          } else {
            await sock.sendMessage(remoteJid, {
              text: '⚠️ Gagal mengambil riwayat dari server. Pastikan server web sedang aktif.'
            }, { quoted: msg });
          }
          continue;
        }

        // 7. Bantuan & Panduan
        if (parsed.command === 'help') {
          const helpReply =
            `🤖 *Panduan Bot WhatsApp Memomeir*\n\n` +
            `Anda bisa mencatat keuangan secara instan dengan cara:\n\n` +
            `1️⃣ *Kirim Chat Bebas (Teks):*\n` +
            `• _Jajan di Indomaret 30k_\n` +
            `• _Beli kopi 25rb QRIS_\n` +
            `• _Bensin Pertamax 100rb Cash_\n` +
            `• _Gaji bulanan masuk 10jt_\n\n` +
            `2️⃣ *Kirim Foto Struk Kasir:*\n` +
            `Tinggal foto struk belanja Indomaret/Alfamart/Resto dan kirim ke sini. AI akan membaca total belanja otomatis!\n\n` +
            `3️⃣ *Perintah Cepat:*\n` +
            `• Ketik *#off* untuk menonaktifkan bot (mode tidur).\n` +
            `• Ketik *#on* untuk mengaktifkan kembali bot.\n` +
            `• Ketik *saldo* untuk melihat saldo saat ini.\n` +
            `• Ketik *mutasi* untuk melihat 5 transaksi terakhir.\n` +
            `• Ketik *#status* untuk cek proteksi & verifikasi obrolan.\n` +
            `• Ketik *#kunci* untuk mengunci bot ke ruang obrolan ini.\n` +
            `• Ketik *help* untuk melihat bantuan ini.`;

          await sock.sendMessage(remoteJid, { text: helpReply }, { quoted: msg });
          continue;
        }
      }

      // JIKA BOT SEDANG DALAM MODE TIDUR (NONAKTIF / PAUSED):
      // Abaikan transaksi dan chat santai tanpa membalas atau mencatat!
      if (config.enabled === false) {
        console.log('[WA Bot] Pesan diabaikan karena bot sedang dinonaktifkan (mode tidur).');
        continue;
      }

      // B. Process Transaction
      if (parsed.isValidTransaction) {
        const result = await recordTransaction({
          type: parsed.type,
          amount: parsed.amount,
          category: parsed.category,
          payment_method: parsed.payment_method,
          description: parsed.description,
          date: parsed.date
        });

        if (result.ok) {
          const typeBadge = parsed.type === 'income' ? '💰 *Pemasukan*' : '💸 *Pengeluaran*';
          const reply =
            `✅ *Transaksi Berhasil Dicatat!*\n\n` +
            `${typeBadge}: ${formatRupiah(parsed.amount)}\n` +
            `📂 *Kategori:* ${parsed.category}\n` +
            (parsed.merchant ? `🏪 *Tempat:* ${parsed.merchant}\n` : '') +
            `💳 *Metode:* ${parsed.payment_method}\n` +
            `📝 *Catatan:* "${parsed.description}"\n\n` +
            `📊 *Saldo Anda otomatis diperbarui di website!*`;

          await sock.sendMessage(remoteJid, { text: reply }, { quoted: msg });
        } else {
          await sock.sendMessage(remoteJid, {
            text: `❌ Gagal menyimpan transaksi: ${result.error || 'Server error'}`
          }, { quoted: msg });
        }
      } else if (textMessage.trim().length > 3) {
        // If user is in authorized chat and mentions financial keywords but nominal was missed
        const lower = textMessage.toLowerCase();
        const seemsFinancial = /\b(beli|jajan|bayar|ongkos|habis|belanja|makan|ngopi|bensin|gaji|transfer|topup|isi saldo|qris|gopay|ovo|dana|shopeepay|warteg|kopi)\b/i.test(lower);
        if (seemsFinancial) {
          const tipReply =
            `⚠️ *Nominal transaksi belum terbaca dengan jelas.*\n\n` +
            `Contoh format pencatatan praktis:\n` +
            `• _Beli makan di warteg 15.500 make gopay_\n` +
            `• _Makan siang 25rb qris_\n` +
            `• _Bensin pertamax 50k cash_\n\n` +
            `💡 Atau cukup kirim foto struk belanja untuk dipindai otomatis!`;
          await sock.sendMessage(remoteJid, { text: tipReply }, { quoted: msg });
        }
      }
    }
  });

  return sock;
}

// If run directly via: node server/whatsapp/bot.js
if (process.argv[1] && process.argv[1].endsWith('bot.js')) {
  startWhatsAppBot().catch(err => {
    console.error('Fatal Bot Error:', err);
  });
}

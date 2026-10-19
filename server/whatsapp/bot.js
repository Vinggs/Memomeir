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
const API_BASE = process.env.API_BASE || 'http://localhost:4000';

// Ensure auth directory exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
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
      // Skip status broadcast updates and group chats (only process private chats / message to self)
      if (!remoteJid || remoteJid === 'status@broadcast' || remoteJid.endsWith('@g.us')) continue;

      // Extract text content
      const textMessage =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        '';

      // Ignore messages generated by the bot itself to prevent infinite feedback loops
      if (
        textMessage.startsWith('✅ *Transaksi') ||
        textMessage.startsWith('🧾 *Struk') ||
        textMessage.startsWith('📊 *Ringkasan') ||
        textMessage.startsWith('🤖 *Panduan') ||
        textMessage.startsWith('⚠️') ||
        textMessage.startsWith('🔍 *Foto') ||
        textMessage.startsWith('❌ Gagal')
      ) {
        continue;
      }


      const isImage = Boolean(msg.message.imageMessage);

      // ==============================================================
      // 1. HANDLE RECEIPT IMAGE SCAN (Foto Struk Belanja)
      // ==============================================================
      if (isImage) {
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
            `• Ketik *saldo* untuk melihat saldo saat ini.\n` +
            `• Ketik *help* untuk melihat bantuan ini.`;

          await sock.sendMessage(remoteJid, { text: helpReply }, { quoted: msg });
          continue;
        }
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

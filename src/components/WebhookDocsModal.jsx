import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  CheckCircle2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Send,
  Power,
  Camera,
  HelpCircle,
  ChevronDown
} from 'lucide-react';

export default function WebhookDocsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [botStatus, setBotStatus] = useState({ state: 'checking', message: 'Memeriksa status bot...' });
  const [refreshing, setRefreshing] = useState(false);
  const [showDevApi, setShowDevApi] = useState(false);

  const origin = window.location.origin;
  const webhookUrl = `${origin}/api/webhook/transaction`;

  const [toggleLoading, setToggleLoading] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const fetchBotStatus = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/whatsapp/status');
      if (res.ok) {
        const data = await res.json();
        setBotStatus(data);
      }
    } catch (err) {
      setBotStatus({ state: 'error', message: err.message });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBotStatus();
    const interval = setInterval(fetchBotStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const isBotActive = botStatus.config?.enabled !== false;
  const autoOffAt = botStatus.config?.autoOffAt;

  // Live countdown timer for 2-minute auto-off
  useEffect(() => {
    if (!isBotActive || !autoOffAt) {
      setRemainingSeconds(0);
      return;
    }

    const updateCountdown = () => {
      const diffMs = new Date(autoOffAt).getTime() - Date.now();
      const secs = Math.max(0, Math.floor(diffMs / 1000));
      setRemainingSeconds(secs);
      if (secs === 0) {
        fetchBotStatus();
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [isBotActive, autoOffAt]);

  const handleToggleBotPower = async () => {
    try {
      setToggleLoading(true);
      const nextState = !isBotActive;
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState })
      });
      if (res.ok) {
        await fetchBotStatus();
      }
    } catch (err) {
      console.error('Failed to toggle bot power:', err);
    } finally {
      setToggleLoading(false);
    }
  };

  const formatCountdown = secs => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#25D366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF'
              }}
            >
              <MessageSquare size={17} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                Panduan WhatsApp Bot
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Catat keuangan harian otomatis semudah mengirim chat
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Tutup modal">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
          {/* 1. Live Bot Connection Status Card */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 16,
              background: botStatus.state === 'connected' ? 'var(--income-bg)' : 'var(--bg-subtle)',
              border: `1px solid ${botStatus.state === 'connected' ? 'var(--income-border)' : 'var(--border-subtle)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: botStatus.state === 'connected' ? '#059669' : '#25D366',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  flexShrink: 0
                }}
              >
                {botStatus.state === 'connected' ? <CheckCircle2 size={22} /> : <QrCode size={19} />}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  {botStatus.state === 'connected'
                    ? `🟢 Bot Terhubung (+${botStatus.phone || '6281389352752'})`
                    : botStatus.state === 'qr_ready'
                    ? '🟡 Menunggu Scan QR WhatsApp'
                    : '⚪ Bot Belum Terhubung'}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {botStatus.state === 'connected'
                    ? `Status Daya: ${isBotActive ? '🟢 Aktif (Siap Catat)' : '🔴 Dijeda (Mode Tidur)'}`
                    : 'Jalankan "npm run bot" jika ingin menyalakan bot WhatsApp.'}
                </div>
              </div>
            </div>

            <button
              className="btn btn-secondary cartoon-pill-btn"
              onClick={fetchBotStatus}
              disabled={refreshing}
              style={{ padding: '6px 12px', fontSize: '0.74rem', flexShrink: 0 }}
            >
              <RefreshCw size={12} className={refreshing ? 'pulse' : ''} style={{ marginRight: 4 }} />
              <span>Perbarui</span>
            </button>
          </div>

          {/* Power Control & 2-Minute Auto-Off Bar */}
          {botStatus.state === 'connected' && (
            <div
              style={{
                marginTop: 10,
                padding: '12px 14px',
                borderRadius: 14,
                background: isBotActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${isBotActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: isBotActive ? '#10b981' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0
                  }}
                >
                  <Power size={16} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                      Daya Bot: {isBotActive ? 'AKTIF (ON)' : 'TIDUR (OFF)'}
                    </span>
                    {isBotActive && remainingSeconds > 0 && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          background: '#10b981',
                          color: '#fff',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        ⏱️ Auto-off dalam {formatCountdown(remainingSeconds)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {isBotActive
                      ? 'Bot otomatis mati jika sudah 2 menit agar chat pribadi tidak terganggu.'
                      : 'Bot sedang nonaktif (tidak akan membalas atau mencatat chat).'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`btn ${isBotActive ? 'btn-secondary' : 'btn-primary'}`}
                onClick={handleToggleBotPower}
                disabled={toggleLoading}
                style={{
                  padding: '7px 16px',
                  borderRadius: 20,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: isBotActive ? undefined : '#10b981',
                  borderColor: isBotActive ? undefined : '#10b981'
                }}
              >
                <Power size={13} style={{ marginRight: 6 }} />
                <span>
                  {toggleLoading
                    ? 'Memproses...'
                    : isBotActive
                    ? 'Matikan Bot Sekarang'
                    : 'Nyalakan Bot (2 Menit)'}
                </span>
              </button>
            </div>
          )}

          {/* 2. Security Privacy Banner */}
          <div
            style={{
              marginTop: 12,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(59, 130, 246, 0.06)',
              border: '1px solid rgba(59, 130, 246, 0.18)',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#0066FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                flexShrink: 0
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Privasi Chat Terjaga Aman:</strong> Bot hanya merespon chat dari nomor Anda sendiri. Chat pribadi dengan keluarga, teman, atau grup WhatsApp lainnya otomatis diabaikan tanpa gangguan.
            </div>
          </div>

          {/* 3. Cara Pakai (User Friendly Steps) */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Send size={15} color="#0066FF" />
              <span>Cara Praktis Menggunakan Bot WhatsApp:</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Step 1 */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start'
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#0066FF',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    flexShrink: 0
                  }}
                >
                  1
                </div>
                <div style={{ fontSize: '0.78rem', lineHeight: 1.45 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    Buka Chat ke Nomor Sendiri di WhatsApp
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                    Cari nama kontak Anda sendiri di WhatsApp (fitur <em>"Message yourself"</em>).
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start'
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#0066FF',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    flexShrink: 0
                  }}
                >
                  2
                </div>
                <div style={{ fontSize: '0.78rem', lineHeight: 1.45 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    Ketik Chat Pengeluaran Santai
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                    Contoh: <code>Kopi 25rb qris</code>, <code>Makan siang warteg 18.000 cash</code>, atau <code>Gaji 7.500.000</code>. Bot akan otomatis mengenali nominal uang dan memasukkannya ke dashboard web ini!
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start'
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#0066FF',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    flexShrink: 0
                  }}
                >
                  3
                </div>
                <div style={{ fontSize: '0.78rem', lineHeight: 1.45 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    Bisa Kirim Foto Struk Belanja
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                    Tinggal foto struk kasir Indomaret, Alfamart, atau resto dan kirim ke chat WhatsApp. Total belanja akan langsung dihitung otomatis.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Perintah Cepat Mematikan & Menyalakan Bot */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Power size={15} color="#10B981" />
              <span>Kata Kunci Pengaturan Bot di WhatsApp:</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10
              }}
            >
              {/* Matikan Bot */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'var(--expense-bg)',
                  border: '1px solid var(--expense-border)',
                  fontSize: '0.76rem'
                }}
              >
                <div style={{ fontWeight: 800, color: 'var(--expense-color)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🔴 Mematikan Bot</span>
                </div>
                <div style={{ marginTop: 4, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Ketik <strong>#off</strong> atau <strong>matikan bot</strong>. Bot akan tidur dan tidak akan membalas atau mencatat transaksi apa pun.
                </div>
              </div>

              {/* Aktifkan Bot */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'var(--income-bg)',
                  border: '1px solid var(--income-border)',
                  fontSize: '0.76rem'
                }}
              >
                <div style={{ fontWeight: 800, color: 'var(--income-color)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🟢 Mengaktifkan Kembali</span>
                </div>
                <div style={{ marginTop: 4, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Ketik <strong>#on</strong> atau <strong>aktifkan bot</strong>. Bot akan bangun dan siap mencatat pengeluaran Anda kembali.
                </div>
              </div>
            </div>
          </div>

          {/* 5. Optional Developer Webhook Section (Collapsed by default) */}
          <div style={{ marginTop: 18, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
            <button
              onClick={() => setShowDevApi(!showDevApi)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.74rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>Info Teknis API Webhook (Khusus Pengembang)</span>
              <ChevronDown size={13} style={{ transform: showDevApi ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {showDevApi && (
              <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'var(--bg-subtle)', fontSize: '0.74rem' }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Endpoint: <code>POST {webhookUrl}</code></div>
                <div style={{ color: 'var(--text-muted)' }}>Format data JSON: <code>&#123; type, amount, category, payment_method, description &#125;</code></div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="btn btn-primary cartoon-pill-btn" onClick={onClose} style={{ padding: '8px 22px' }}>
              Mengerti & Siap Pakai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Copy, Check, MessageSquare, Terminal, Sparkles, CheckCircle2, QrCode, RefreshCw, AlertCircle, Shield } from 'lucide-react';

export default function WebhookDocsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('node'); // 'node' | 'curl' | 'python'
  const [botStatus, setBotStatus] = useState({ state: 'checking', message: 'Memeriksa status bot...' });
  const [refreshing, setRefreshing] = useState(false);

  const origin = window.location.origin;
  const webhookUrl = `${origin}/api/webhook/transaction`;

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
    const interval = setInterval(fetchBotStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  const nodeSnippet = `// Contoh integrasi bot WhatsApp (Baileys / Fonnte / Wablas)
const response = await fetch("${webhookUrl}", {
  method: "POST",
  headers: { 
    "Content-Type": "application/json",
    "x-webhook-source": "whatsapp-bot"
  },
  body: JSON.stringify({
    type: "expense",          // 'expense' (pengeluaran) atau 'income' (pemasukan)
    amount: 30000,            // Angka nominal integer
    category: "Shopping",     // Kategori transaksi
    payment_method: "Cash",   // Metode pembayaran
    description: "Jajan di Indomaret 30k",
    date: new Date().toISOString()
  })
});

const result = await response.json();
console.log("Transaksi tersimpan:", result);`;

  const curlSnippet = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "expense",
    "amount": 30000,
    "category": "Shopping",
    "payment_method": "Cash",
    "description": "Jajan di Indomaret 30k",
    "date": "${new Date().toISOString()}"
  }'`;

  const pythonSnippet = `# Python (requests) untuk bot WA
import requests
from datetime import datetime

payload = {
    "type": "expense",
    "amount": 30000,
    "category": "Shopping",
    "payment_method": "Cash",
    "description": "Jajan di Indomaret 30k",
    "date": datetime.utcnow().isoformat() + "Z"
}

response = requests.post("${webhookUrl}", json=payload)
print("Hasil:", response.json())`;

  const handleCopy = () => {
    let snippet = nodeSnippet;
    if (activeTab === 'curl') snippet = curlSnippet;
    if (activeTab === 'python') snippet = pythonSnippet;

    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
              <MessageSquare size={16} />
            </div>
            <span>Koneksi WhatsApp Bot Memomeir</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Live Bot Connection Status Card */}
          <div style={{ padding: 14, borderRadius: 14, background: botStatus.state === 'connected' ? 'var(--income-bg)' : 'var(--bg-subtle)', border: `1px solid ${botStatus.state === 'connected' ? 'var(--income-border)' : 'var(--border-subtle)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: botStatus.state === 'connected' ? '#059669' : '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                {botStatus.state === 'connected' ? <CheckCircle2 size={20} /> : <QrCode size={18} />}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Status Bot: {botStatus.state === 'connected' ? `🟢 Terhubung (+${botStatus.phone || 'Nomor Anda'})` : botStatus.state === 'qr_ready' ? '🟡 Siap Scan QR di Terminal' : '⚪ Bot Belum Berjalan'}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {botStatus.message || 'Jalankan "npm run bot" di terminal untuk memulai.'}
                </div>
              </div>
            </div>

            <button className="btn btn-secondary" onClick={fetchBotStatus} disabled={refreshing} style={{ padding: '6px 10px', fontSize: '0.74rem' }}>
              <RefreshCw size={13} className={refreshing ? 'pulse' : ''} />
              <span>Cek Status</span>
            </button>
          </div>

          {/* Security & Room Verification Mode Card */}
          <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.22)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0 }}>
              <Shield size={18} />
            </div>
            <div style={{ flex: 1, fontSize: '0.76rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Proteksi Obrolan & Verifikasi Kamar Chat</span>
                <span style={{ fontSize: '0.68rem', padding: '1px 7px', borderRadius: 6, background: '#2563EB', color: '#FFFFFF', fontWeight: 600 }}>
                  {botStatus.config?.mode === 'locked_room' ? '🔒 Room Terkunci' : '🛡️ Khusus Farrel'}
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                Bot hanya merespon obrolan dari/ke Farrel (<strong>+{botStatus.config?.ownerPhone || '6281389352752'}</strong>). Chat pribadi lain dengan teman, keluarga, atau grup WhatsApp otomatis diabaikan tanpa intervensi. Ketik <code>#kunci</code> di chat untuk mengunci bot ke ruang obrolan tersebut.
              </div>
            </div>
          </div>

          {/* Live QR Code Display if waiting to scan */}
          {botStatus.state === 'qr_ready' && botStatus.qrDataUrl && (
            <div style={{ marginTop: 14, background: '#FFFFFF', padding: 16, borderRadius: 14, border: '2px solid #25D366', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ color: '#111827', fontWeight: 800, fontSize: '0.95rem', marginBottom: 4 }}>
                📱 Scan QR Code WhatsApp Langsung dari Layar Ini:
              </div>
              <div style={{ color: '#6B7280', fontSize: '0.76rem', marginBottom: 12 }}>
                Buka WhatsApp di HP ➡️ Perangkat Tertaut ➡️ Tautkan Perangkat, lalu arahkan kamera HP ke sini:
              </div>
              <img
                src={botStatus.qrDataUrl}
                alt="WhatsApp QR Code"
                style={{ width: 220, height: 220, borderRadius: 10, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              />
              <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: 10, fontWeight: 600 }}>
                ⚡ Begitu di-scan, bot akan langsung aktif otomatis!
              </div>
            </div>
          )}

          {/* Simple 3-Step Setup Guide */}
          <div style={{ marginTop: 16 }}>
            <span className="form-label">3 Langkah Mudah Menghubungkan WhatsApp Anda:</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              <div style={{ display: 'flex', gap: 10, background: 'var(--bg-subtle)', padding: 10, borderRadius: 10, border: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
                <span style={{ fontWeight: 800, color: '#0066FF', width: 20 }}>1.</span>
                <div>Buka terminal baru di folder proyek ini dan jalankan perintah: <code style={{ background: 'var(--bg-card)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>npm run bot</code></div>
              </div>
              <div style={{ display: 'flex', gap: 10, background: 'var(--bg-subtle)', padding: 10, borderRadius: 10, border: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
                <span style={{ fontWeight: 800, color: '#0066FF', width: 20 }}>2.</span>
                <div>Buka WhatsApp di HP Anda ➡️ <strong>Perangkat Tertaut (Linked Devices)</strong> ➡️ <strong>Tautkan Perangkat</strong>, lalu scan QR Code yang tampil di terminal.</div>
              </div>
              <div style={{ display: 'flex', gap: 10, background: 'var(--bg-subtle)', padding: 10, borderRadius: 10, border: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
                <span style={{ fontWeight: 800, color: '#0066FF', width: 20 }}>3.</span>
                <div>Selesai! Anda tinggal kirim pesan chat santai seperti <em>"jajan di indomaret 30k"</em> atau foto struk kasir, data langsung tersimpan ke web!</div>
              </div>
            </div>
          </div>

          {/* Endpoint address & Format Data for Developers */}
          <div style={{ marginTop: 14 }}>
            <span className="form-label">Alamat Endpoint Webhook Lokal:</span>
            <div className="code-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#25D366', fontWeight: 700 }}>POST</span>
              <span style={{ wordBreak: 'break-all' }}>{webhookUrl}</span>
            </div>
          </div>

          {/* Code Snippets */}
          <div className="form-group" style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="filter-tabs">
                <button
                  className={`filter-tab-btn ${activeTab === 'node' ? 'active' : ''}`}
                  onClick={() => setActiveTab('node')}
                >
                  Node.js (Baileys)
                </button>
                <button
                  className={`filter-tab-btn ${activeTab === 'curl' ? 'active' : ''}`}
                  onClick={() => setActiveTab('curl')}
                >
                  cURL
                </button>
                <button
                  className={`filter-tab-btn ${activeTab === 'python' ? 'active' : ''}`}
                  onClick={() => setActiveTab('python')}
                >
                  Python
                </button>
              </div>

              <button className="btn btn-secondary" onClick={handleCopy} style={{ padding: '4px 10px', fontSize: '0.74rem' }}>
                {copied ? <Check size={12} color="#25D366" /> : <Copy size={12} />}
                <span>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
              </button>
            </div>

            <pre className="code-box" style={{ marginTop: 8, maxHeight: 150, fontSize: '0.74rem' }}>
              {activeTab === 'node' && nodeSnippet}
              {activeTab === 'curl' && curlSnippet}
              {activeTab === 'python' && pythonSnippet}
            </pre>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="btn btn-primary cartoon-pill-btn" onClick={onClose}>
              Mengerti & Siap Pakai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



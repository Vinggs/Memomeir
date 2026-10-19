import React, { useState } from 'react';
import { X, Send, Bot, CheckCircle2, AlertCircle, Sparkles, RefreshCw, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

const SAMPLE_PRESETS = [
  {
    id: 'coffee',
    label: '☕ Kopi & Sarapan',
    chat: 'Beli kopi flat white & roti 45.000 via BCA QRIS',
    type: 'expense',
    amount: 45000,
    category: 'Food & Dining',
    payment_method: 'BCA QRIS',
    description: 'Kopi flat white & roti sarapan'
  },
  {
    id: 'salary',
    label: '💼 Gaji / Pemasukan',
    chat: 'Transfer masuk gaji bulanan Rp 10.000.000 via BCA Transfer',
    type: 'income',
    amount: 10000000,
    category: 'Salary',
    payment_method: 'BCA Transfer',
    description: 'Gaji bulanan masuk rekening'
  },
  {
    id: 'transport',
    label: '🚗 Transportasi / Taksi',
    chat: 'Ongkos taksi Bluebird ke stasiun 85.000 pake GoPay',
    type: 'expense',
    amount: 85000,
    category: 'Transport',
    payment_method: 'GoPay',
    description: 'Taksi Bluebird ke stasiun'
  },
  {
    id: 'bills',
    label: '⚡ Tagihan Listrik / Wifi',
    chat: 'Bayar tagihan listrik PLN 250.000 via Mandiri Livin',
    type: 'expense',
    amount: 250000,
    category: 'Utilities',
    payment_method: 'Mandiri Livin',
    description: 'Tagihan listrik PLN bulanan'
  }
];

export default function WhatsAppSimulatorModal({ isOpen, onClose, onTransactionAdded }) {
  const [chatInput, setChatInput] = useState(SAMPLE_PRESETS[0].chat);
  const [selectedPreset, setSelectedPreset] = useState(SAMPLE_PRESETS[0]);
  const [showJsonDetails, setShowJsonDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [botReply, setBotReply] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen) return null;

  // Simple client-side natural language parser for custom Indonesian messages
  const parseChatToPayload = (text) => {
    let clean = text.trim();
    let detectedAmount = 0;
    let detectedType = 'expense';
    let detectedCategory = 'Miscellaneous';
    let detectedMethod = 'Cash';

    // 1. Nominal matching (e.g. 45.000, 45rb, 10jt, 10.000.000)
    const amtMatch = clean.match(/(?:rp\.?|idr|\$)?\s*(\d{1,3}(?:[.,]\d{3})*|\d+)(?:k|rb|ribu|jt|juta)?/i);
    if (amtMatch) {
      let numStr = amtMatch[1].replace(/[.,]/g, '');
      let val = parseInt(numStr, 10);
      const lower = clean.toLowerCase();
      if (lower.includes('jt') || lower.includes('juta')) {
        val *= 1000000;
      } else if (lower.includes('rb') || lower.includes('ribu') || lower.includes('k')) {
        if (val < 1000) val *= 1000;
      }
      detectedAmount = isNaN(val) ? 50000 : val;
    } else {
      detectedAmount = 50000;
    }

    // 2. Type matching
    if (/gaji|salary|terima|masuk|income|freelance|bonus|transfer masuk|inflow|penjualan/i.test(clean)) {
      detectedType = 'income';
      detectedCategory = 'Salary';
    }

    // 3. Category matching
    if (/kopi|makan|resto|cafe|food|warung|lunch|dinner|sarapan|snack|sushi|roti/i.test(clean)) {
      detectedCategory = 'Food & Dining';
    } else if (/bensin|pertamax|pertalite|bbm|taksi|grab|gojek|goride|gocar|bluebird|parkir|toll|kereta|bus/i.test(clean)) {
      detectedCategory = 'Transport';
    } else if (/listrik|pln|pdam|air|wifi|indihome|pulsa|paket data|iuran|bpjs/i.test(clean)) {
      detectedCategory = 'Utilities';
    } else if (/baju|sepatu|belanja|supermarket|indomaret|alfamart|tokopedia|shopee/i.test(clean)) {
      detectedCategory = 'Shopping';
    } else if (/nonton|bioskop|netflix|spotify|game|steam/i.test(clean)) {
      detectedCategory = 'Entertainment';
    }

    // 4. Payment method matching
    if (/qris/i.test(clean)) {
      detectedMethod = 'BCA QRIS';
    } else if (/gopay/i.test(clean)) {
      detectedMethod = 'GoPay';
    } else if (/ovo/i.test(clean)) {
      detectedMethod = 'OVO';
    } else if (/shopeepay|dana/i.test(clean)) {
      detectedMethod = 'ShopeePay';
    } else if (/mandiri|livin/i.test(clean)) {
      detectedMethod = 'Mandiri Livin';
    } else if (/bca|transfer/i.test(clean)) {
      detectedMethod = 'BCA Transfer';
    } else if (/kartu kredit|credit card/i.test(clean)) {
      detectedMethod = 'Credit Card';
    } else if (/tunai|cash/i.test(clean)) {
      detectedMethod = 'Cash';
    } else {
      detectedMethod = 'BCA QRIS';
    }

    return {
      type: detectedType,
      amount: detectedAmount,
      category: detectedCategory,
      payment_method: detectedMethod,
      description: clean,
      date: new Date().toISOString()
    };
  };

  const handleSelectPreset = preset => {
    setSelectedPreset(preset);
    setChatInput(preset.chat);
    setBotReply(null);
    setErrorMessage(null);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) {
      setErrorMessage('Ketik pesan chat terlebih dahulu.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setBotReply(null);

    const payload = parseChatToPayload(chatInput);

    try {
      const res = await fetch('/api/webhook/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-source': 'whatsapp-ai-bot'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Gagal mengirim transaksi`);
      }

      setBotReply({
        tx: data.transaction,
        payload
      });

      if (onTransactionAdded) {
        onTransactionAdded(data.transaction);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Gagal mengirim webhook ke sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
              <MessageSquare size={16} />
            </div>
            <span>Simulasi Chat Bot WhatsApp</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            💡 <strong>Cara Kerja:</strong> Cukup kirim chat pengeluaran santai ke bot WhatsApp. Bot AI akan otomatis mengenali nominal, jenis transaksi, dan langsung memperbarui saldo Anda di website ini.
          </div>

          {/* Preset Buttons */}
          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label">Pilih Contoh Pesan Chat:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {SAMPLE_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="btn btn-secondary"
                  style={{
                    justifyContent: 'flex-start',
                    fontSize: '0.78rem',
                    fontWeight: selectedPreset.id === preset.id ? 700 : 500,
                    borderColor: selectedPreset.id === preset.id ? '#25D366' : 'var(--border-subtle)',
                    background: selectedPreset.id === preset.id ? 'rgba(37, 211, 102, 0.08)' : 'var(--bg-subtle)'
                  }}
                >
                  <Sparkles size={13} style={{ flexShrink: 0, color: '#25D366' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Chat Box */}
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Ketik Pesan WhatsApp Anda:</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSendChat();
                }}
                placeholder="Contoh: Beli kopi 25rb bayar QRIS..."
                style={{ paddingRight: 40, fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* WhatsApp Chat Preview Simulation */}
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 14, marginTop: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tampilan Percakapan WhatsApp
            </div>

            {/* User Chat Bubble */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <div style={{ background: '#DCF8C6', color: '#111827', padding: '8px 14px', borderRadius: '14px 14px 2px 14px', maxWidth: '85%', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '0.85rem' }}>{chatInput || 'Ketik pesan di atas...'}</div>
                <div style={{ fontSize: '0.65rem', color: '#6B7280', textAlign: 'right', marginTop: 3 }}>
                  Hari ini, {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ✓✓
                </div>
              </div>
            </div>

            {/* Bot Reply Bubble */}
            {botReply && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#FFFFFF', color: '#111827', padding: '10px 14px', borderRadius: '14px 14px 14px 2px', maxWidth: '90%', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#059669', fontSize: '0.84rem' }}>
                    <CheckCircle2 size={16} />
                    <span>Transaksi Berhasil Dicatat!</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', marginTop: 6, lineHeight: 1.5, color: '#374151' }}>
                    <div>💰 <strong>Nominal:</strong> Rp {Number(botReply.tx.amount).toLocaleString('id-ID')} ({botReply.tx.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'})</div>
                    <div>📂 <strong>Kategori:</strong> {botReply.tx.category}</div>
                    <div>💳 <strong>Metode:</strong> {botReply.tx.payment_method}</div>
                    <div>📝 <strong>Catatan:</strong> {botReply.tx.description}</div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#059669', background: '#ECFDF5', padding: '4px 8px', borderRadius: 6, marginTop: 8, fontWeight: 600 }}>
                    ⚡ Saldo dan riwayat di dashboard website langsung terupdate!
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, background: 'var(--expense-bg)', border: '1px solid var(--expense-border)', color: 'var(--expense-color)', fontSize: '0.8rem', marginTop: 10 }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Collapsible Technical Details for Developers */}
          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowJsonDetails(prev => !prev)}
              style={{ fontSize: '0.74rem', width: '100%', justifyContent: 'space-between', padding: '6px 10px' }}
            >
              <span>{showJsonDetails ? 'Sembunyikan Data Teknis Webhook' : 'Lihat Data Teknis Webhook (POST JSON)'}</span>
              {showJsonDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showJsonDetails && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Endpoint: <code>POST /api/webhook/transaction</code>
                </div>
                <pre className="code-box" style={{ fontSize: '0.72rem', maxHeight: 150 }}>
                  {JSON.stringify(parseChatToPayload(chatInput), null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button className="btn btn-secondary cartoon-pill-btn" onClick={onClose}>
              Tutup
            </button>
            <button
              className="btn btn-primary cartoon-tactile-btn"
              onClick={handleSendChat}
              disabled={loading}
              style={{ background: '#25D366', borderColor: '#1EBE5D' }}
            >
              {loading ? <RefreshCw size={14} className="pulse" /> : <Send size={14} />}
              <span>{loading ? 'Mengirim & Memproses...' : 'Kirim Chat WhatsApp'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


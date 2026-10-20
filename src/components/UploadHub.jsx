import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  Scan,
  RefreshCw,
  ClipboardPaste,
  Camera,
  Image as ImageIcon,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters.js';

export default function UploadHub({
  onBack,
  onOpenSimulator,
  onTransactionAdded,
  currency = 'IDR'
}) {
  const [activeModal, setActiveModal] = useState(null); // null | 'file' | 'camera' | 'gallery'
  const [pasteInput, setPasteInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Demo statements for File Statement Upload
  const sampleStatements = [
    {
      name: 'BCA_EStatement_October.pdf',
      type: 'PDF Bank Statement',
      size: '240 KB',
      transactions: [
        { type: 'expense', amount: 85000, category: 'Food & Dining', payment_method: 'BCA QRIS', description: 'Sushi Tei Senayan' },
        { type: 'income', amount: 8500000, category: 'Salary', payment_method: 'Bank Wire', description: 'Payroll PT Digital' },
        { type: 'expense', amount: 150000, category: 'Transport', payment_method: 'BCA Transfer', description: 'Bluebird Airport Taxi' }
      ]
    },
    {
      name: 'GoPay_Report_October.xlsx',
      type: 'Excel Spreadsheet',
      size: '115 KB',
      transactions: [
        { type: 'expense', amount: 32000, category: 'Food & Dining', payment_method: 'GoPay', description: 'Kopi Kenangan' },
        { type: 'expense', amount: 45000, category: 'Transport', payment_method: 'GoPay', description: 'GoRide Transit' }
      ]
    }
  ];

  // Demo gallery receipts
  const sampleReceipts = [
    {
      id: 'qris-bca',
      name: 'BCA QRIS Payment Receipt',
      app: 'BCA Mobile',
      amount: 48500,
      merchant: 'Kopi Tuku Cipete',
      category: 'Food & Dining',
      time: 'Today, 12:45'
    },
    {
      id: 'gopay-trans',
      name: 'GoPay Transaction Receipt',
      app: 'GoPay',
      amount: 22000,
      merchant: 'Indomaret Point',
      category: 'Utilities',
      time: 'Today, 08:30'
    },
    {
      id: 'shopee-trans',
      name: 'ShopeePay Merchant Transfer',
      app: 'ShopeePay',
      amount: 175000,
      merchant: 'Uniqlo Mall',
      category: 'Entertainment',
      time: 'Yesterday, 19:15'
    }
  ];

  // Natural Language FinGPT Paste
  const handleFinGptPaste = async () => {
    if (!pasteInput.trim()) {
      setFeedback({ type: 'error', message: 'Please paste or type a transaction note first!' });
      return;
    }

    setParsing(true);
    setFeedback(null);

    try {
      const text = pasteInput.trim();
      let detectedAmount = 0;
      let detectedType = 'expense';
      let detectedCategory = 'Miscellaneous';
      let detectedMethod = 'Cash';

      // 1. Amount matching
      const amountMatch = text.match(/(?:rp\.?|idr|\$)?\s*(\d{1,3}(?:[.,]\d{3})*|\d+)(?:k|rb|ribu)?/i);
      if (amountMatch) {
        let clean = amountMatch[1].replace(/[.,]/g, '');
        let val = parseInt(clean, 10);
        if (text.toLowerCase().includes('k') || text.toLowerCase().includes('rb') || text.toLowerCase().includes('ribu')) {
          if (val < 1000) val *= 1000;
        }
        detectedAmount = isNaN(val) ? 45000 : val;
      } else {
        detectedAmount = 50000;
      }

      // 2. Type matching
      if (/gaji|salary|terima|masuk|income|freelance|bonus|transfer masuk|inflow/i.test(text)) {
        detectedType = 'income';
      }

      // 3. Category matching
      if (/kopi|makan|resto|cafe|food|warung|lunch|dinner|sarapan|snack|sushi/i.test(text)) {
        detectedCategory = 'Food & Dining';
      } else if (/gaji|salary|retainer|freelance/i.test(text)) {
        detectedCategory = 'Salary';
      } else if (/taxi|grab|gojek|bluebird|bensin|pertamax|parkir|toll/i.test(text)) {
        detectedCategory = 'Transport';
      } else if (/listrik|pln|wifi|indihome|pulsa|paket data|cloud|hosting/i.test(text)) {
        detectedCategory = 'Utilities';
      } else if (/baju|sepatu|nonton|bioskop|game|steam/i.test(text)) {
        detectedCategory = 'Entertainment';
      }

      // 4. Payment method matching
      if (/qris/i.test(text)) detectedMethod = 'BCA QRIS';
      else if (/bca/i.test(text)) detectedMethod = 'BCA Transfer';
      else if (/gopay/i.test(text)) detectedMethod = 'GoPay';
      else if (/ovo/i.test(text)) detectedMethod = 'OVO';
      else if (/kartu kredit|credit card|cc/i.test(text)) detectedMethod = 'Credit Card';
      else if (/wire|bank/i.test(text)) detectedMethod = 'Bank Wire';

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: detectedType,
          amount: detectedAmount,
          category: detectedCategory,
          payment_method: detectedMethod,
          description: `FinGPT: ${text.slice(0, 80)}`,
          date: new Date().toISOString()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record transaction');

      setFeedback({
        type: 'success',
        message: `FinGPT recorded: ${detectedType.toUpperCase()} ${formatCurrency(detectedAmount, currency)} (${detectedCategory}) via ${detectedMethod}`
      });
      setPasteInput('');
      if (onTransactionAdded) onTransactionAdded(data.transaction);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error parsing paste input.' });
    } finally {
      setParsing(false);
    }
  };

  // Import Statement Transactions
  const handleImportStatement = async statement => {
    setParsing(true);
    try {
      for (const tx of statement.transactions) {
        await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...tx,
            description: `[Import: ${statement.name}] ${tx.description}`,
            date: new Date().toISOString()
          })
        });
      }
      setFeedback({
        type: 'success',
        message: `Imported ${statement.transactions.length} transactions from ${statement.name}!`
      });
      setActiveModal(null);
      if (onTransactionAdded) onTransactionAdded({});
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setParsing(false);
    }
  };

  // Scan Receipt
  const handleScanReceipt = async receiptPreset => {
    setParsing(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expense',
          amount: receiptPreset.amount,
          category: receiptPreset.category,
          payment_method: receiptPreset.merchant.includes('QRIS') ? 'BCA QRIS' : 'Credit Card',
          description: `[OCR Scan] ${receiptPreset.merchant}`,
          date: new Date().toISOString()
        })
      });
      const data = await res.json();
      setFeedback({
        type: 'success',
        message: `Recorded ${formatCurrency(receiptPreset.amount, currency)} at ${receiptPreset.merchant}!`
      });
      setActiveModal(null);
      if (onTransactionAdded) onTransactionAdded(data.transaction);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="finku-upload-wrapper">
      {/* 1. SOLID VIBRANT BLUE HEADER BAR (Matches reference exactly) */}
      <header className="finku-top-bar">
        <button
          className="finku-back-arrow"
          onClick={onBack}
          title="Kembali ke Ringkasan Saldo"
          aria-label="Kembali ke Dashboard"
        >
          <ArrowLeft size={24} strokeWidth={2.8} />
        </button>
        <h1 className="finku-bar-title">Input Cepat & Scan Struk</h1>
        <div style={{ width: 24 }} /> {/* Balance spacer */}
      </header>

      {/* Main Content Body */}
      <div className="finku-content-body">
        {/* Feedback Alert */}
        {feedback && (
          <div className={`finku-toast-banner ${feedback.type}`}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
            <button className="finku-toast-close" onClick={() => setFeedback(null)}>
              <X size={15} />
            </button>
          </div>
        )}

        {/* 2. TOP PROMOTIONAL CARD (Integrasi WhatsApp Bot) */}
        <div className="finku-promo-card">
          <div className="finku-promo-left">
            {/* Colorful Stacked Cartoon Document Sheets */}
            <div className="finku-docs-illustration" aria-hidden="true">
              {/* Back Orange Sheet */}
              <div className="finku-sheet finku-sheet-orange" />
              {/* Middle Green Sheet */}
              <div className="finku-sheet finku-sheet-green">
                <span className="sheet-line" />
                <span className="sheet-line" />
                <span className="sheet-line half" />
              </div>
              {/* Front Blue Sheet with Folded Corner */}
              <div className="finku-sheet finku-sheet-blue">
                <div className="sheet-fold" />
                <span className="sheet-line" />
                <span className="sheet-line" />
                <span className="sheet-line half" />
              </div>
            </div>
          </div>

          <div className="finku-promo-right">
            <div className="finku-promo-title-row">
              <span className="finku-promo-title">
                Catat pengeluaran langsung lewat chat WhatsApp?
              </span>
              <span className="finku-badge-new">Fitur WA</span>
            </div>
            <p className="finku-promo-desc">
              Cukup kirim pesan teks atau foto struk ke bot WA Memomeir, data otomatis masuk ke dashboard!
            </p>
            <button
              className="finku-promo-link"
              onClick={onOpenSimulator}
              title="Coba simulasi interaktif bot WhatsApp"
            >
              <span>Coba Simulasi Bot WA</span>
              <ArrowRight size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* 3. ACTION CARDS LIST */}
        <div className="finku-cards-stack">
          {/* Card 1: Upload transaction file */}
          <div
            className="finku-action-card"
            onClick={() => setActiveModal('file')}
            role="button"
            tabIndex={0}
            title="Upload file mutasi rekening PDF / Excel"
          >
            <div className="finku-card-texts">
              <h2 className="finku-card-heading">Upload Mutasi Bank (e-Statement)</h2>
              <p className="finku-card-subtext">Impor mutasi otomatis dari file PDF rekening koran atau Excel.</p>
            </div>
            <div className="finku-icon-slot">
              <div className="finku-soft-circle-bg" />
              <svg className="finku-svg-icon" width="42" height="42" viewBox="0 0 44 44" fill="none">
                <path d="M10 6C10 3.79 11.79 2 14 2H26L36 12V38C36 40.21 34.21 42 32 42H14C11.79 42 10 40.21 10 38V6Z" fill="#0066FF"/>
                <path d="M26 2L36 12H28C26.9 12 26 11.1 26 10V2Z" fill="#B3D1FF"/>
                <rect x="15" y="19" width="14" height="3" rx="1.5" fill="white"/>
                <rect x="15" y="25" width="14" height="3" rx="1.5" fill="white"/>
                <rect x="15" y="31" width="8" height="3" rx="1.5" fill="white"/>
              </svg>
            </div>
          </div>

          {/* Card 2: Take a photo */}
          <div
            className="finku-action-card"
            onClick={() => setActiveModal('camera')}
            role="button"
            tabIndex={0}
            title="Scan struk kasir atau struk belanja"
          >
            <div className="finku-card-texts">
              <h2 className="finku-card-heading">Scan Foto Struk (Kamera OCR)</h2>
              <p className="finku-card-subtext">Arahkan kamera ke struk belanja untuk deteksi nominal otomatis.</p>
            </div>
            <div className="finku-icon-slot">
              <div className="finku-soft-circle-bg" />
              <svg className="finku-svg-icon" width="46" height="46" viewBox="0 0 48 48" fill="none">
                <path d="M10 18V13C10 10.79 11.79 9 14 9H19" stroke="#93C5FD" strokeWidth="3.5" strokeLinecap="round"/>
                <path d="M38 18V13C38 10.79 36.21 9 34 9H29" stroke="#93C5FD" strokeWidth="3.5" strokeLinecap="round"/>
                <path d="M10 30V35C10 37.21 11.79 39 14 39H19" stroke="#93C5FD" strokeWidth="3.5" strokeLinecap="round"/>
                <path d="M38 30V35C38 37.21 36.21 39 34 39H29" stroke="#93C5FD" strokeWidth="3.5" strokeLinecap="round"/>
                <rect x="14" y="21" width="20" height="7" rx="3.5" fill="#0066FF"/>
                <circle cx="24" cy="24.5" r="2.5" fill="white"/>
              </svg>
            </div>
          </div>

          {/* Card 3: Choose from gallery */}
          <div
            className="finku-action-card"
            onClick={() => setActiveModal('gallery')}
            role="button"
            tabIndex={0}
            title="Pilih screenshot QRIS atau bukti transfer e-wallet"
          >
            <div className="finku-card-texts">
              <h2 className="finku-card-heading">Pilih Screenshot Bukti Transfer</h2>
              <p className="finku-card-subtext">
                Pilih bukti transfer QRIS, m-Banking (BCA, Mandiri), atau e-wallet (GoPay, ShopeePay).
              </p>
            </div>
            <div className="finku-icon-slot">
              <div className="finku-soft-circle-bg" />
              <svg className="finku-svg-icon" width="44" height="44" viewBox="0 0 46 46" fill="none">
                <circle cx="34" cy="14" r="5" fill="#0066FF"/>
                <path d="M8 34L19 19C19.7 18 21.1 18 21.8 19L26 24L30 18C30.7 17.1 32.1 17.1 32.8 18L40 28C40.9 29.3 40 34 38 34H8Z" fill="#0066FF"/>
              </svg>
            </div>
          </div>
        </div>

        {/* 4. DASHED PASTE BOX (AI Natural Language Text Input) */}
        <div className="finku-dashed-paste-box">
          <div className="finku-dashed-header">
            <span className="finku-dashed-title">Atau, tulis catatan pengeluaran santai</span>
            <span className="finku-badge-new">Praktis</span>
          </div>

          <p className="finku-dashed-desc">
            Tulis teks bebas seperti biasa. Sistem otomatis mendeteksi nominal, kategori, dan metode pembayaran.
          </p>

          <div className="finku-paste-input-area">
            <textarea
              className="finku-paste-field"
              placeholder="Contoh: 'Beli kopi kenangan 35rb pake GoPay' atau 'Gaji bulanan 12.5jt bank transfer'..."
              rows={3}
              value={pasteInput}
              onChange={e => setPasteInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleFinGptPaste();
                }
              }}
            />

            {/* Quick Indonesian Suggestion Chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {[
                'Kopi Tuku 25rb BCA QRIS',
                'Nasi Padang 40rb GoPay',
                'Bensin Mobil 100rb Cash',
                'Gaji Bulanan 10jt Transfer'
              ].map(chip => (
                <button
                  key={chip}
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPasteInput(chip)}
                  style={{ padding: '3px 8px', fontSize: '0.72rem', borderRadius: 8 }}
                  title="Klik untuk mengisi cepat"
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="finku-paste-bottom-bar">
              <div className="finku-paste-hint">
                <Sparkles size={14} style={{ color: '#0066FF' }} />
                <span>Mendukung bahasa Indonesia santai & slang (rb, jt, k)</span>
              </div>
              <button
                className="finku-record-btn"
                onClick={handleFinGptPaste}
                disabled={parsing}
              >
                {parsing ? <RefreshCw size={15} className="pulse" /> : <ClipboardPaste size={15} />}
                <span>{parsing ? 'Menganalisis...' : 'Catat Otomatis'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SUB-MODALS */}
      {/* 1. Statement Modal */}
      {activeModal === 'file' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content finku-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <FileSpreadsheet size={20} color="#0066FF" />
                <span>Upload Mutasi Rekening (PDF / Excel / CSV)</span>
              </div>
              <button className="btn-icon" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="finku-dropzone">
                <UploadCloud size={40} color="#0066FF" />
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: 8 }}>
                  Tarik & Lepas file mutasi bank di sini
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 4 }}>
                  Mendukung file e-statement PDF & laporan Excel dari BCA, Mandiri, GoPay
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <span className="form-label">Atau Coba Contoh Rekening Koran untuk Uji Coba:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                  {sampleStatements.map(st => (
                    <div key={st.name} className="finku-demo-row">
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>{st.name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                          {st.type} • {st.transactions.length} mutasi terdeteksi
                        </div>
                      </div>
                      <button
                        className="finku-mini-btn"
                        onClick={() => handleImportStatement(st)}
                        disabled={parsing}
                      >
                        {parsing ? 'Mengimpor...' : 'Impor Data'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Camera Modal */}
      {activeModal === 'camera' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content finku-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Camera size={20} color="#0066FF" />
                <span>Scan Struk Belanja (Kamera OCR)</span>
              </div>
              <button className="btn-icon" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="finku-camera-box">
                <div className="finku-laser-line" />
                <div className="finku-receipt-target">
                  <div className="finku-receipt-paper">
                    <div style={{ fontWeight: 800, textAlign: 'center', marginBottom: 4 }}>STARBUCKS COFFEE</div>
                    <div>1x Iced Americano Grande</div>
                    <div>1x Croissant</div>
                    <div style={{ height: 1, background: '#E5E7EB', margin: '4px 0' }} />
                    <div style={{ fontWeight: 800, color: '#059669' }}>TOTAL: Rp 68.000</div>
                    <div style={{ fontSize: '0.65rem', color: '#6B7280' }}>BCA QRIS • BERHASIL</div>
                  </div>
                </div>
                <div className="finku-ocr-badge">
                  <Scan size={14} />
                  <span>Struk Terdeteksi: Rp 68.000</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Starbucks Coffee Senayan</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Makanan & Minuman • BCA QRIS</div>
                </div>
                <button
                  className="finku-record-btn"
                  onClick={() =>
                    handleScanReceipt({
                      amount: 68000,
                      merchant: 'Starbucks Coffee Senayan',
                      category: 'Food & Dining'
                    })
                  }
                  disabled={parsing}
                >
                  <Camera size={15} />
                  <span>Foto & Catat</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Gallery Modal */}
      {activeModal === 'gallery' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content finku-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <ImageIcon size={20} color="#0066FF" />
                <span>Pilih Screenshot Bukti Transfer</span>
              </div>
              <button className="btn-icon" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                Pilih bukti screenshot transfer QRIS, m-Banking, atau e-wallet:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                {sampleReceipts.map(rec => (
                  <div
                    key={rec.id}
                    className="finku-receipt-item"
                    onClick={() =>
                      handleScanReceipt({
                        amount: rec.amount,
                        merchant: `${rec.merchant} (${rec.app})`,
                        category: rec.category
                      })
                    }
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{rec.name}</div>
                      <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                        {rec.merchant} • {rec.time}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="num" style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>
                        {formatCurrency(rec.amount, currency)}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#0066FF', fontWeight: 700 }}>Catat Otomatis →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

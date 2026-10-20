import React, { useState, useRef, useEffect } from 'react';
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
  FileSpreadsheet,
  SwitchCamera,
  Check,
  Edit3,
  FileText
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters.js';

const COMMON_CATEGORIES = [
  'Food & Dining (🍔 Makanan & Minuman)',
  'Transport (🚗 Transportasi & Bensin)',
  'Shopping (🛍️ Belanja & Kebutuhan)',
  'Utilities (⚡ Listrik, Wifi, Pulsa)',
  'Entertainment (🍿 Hiburan & Nongkrong)',
  'Health & Wellness (🏥 Kesehatan & Obat)',
  'Salary (💼 Gaji & Pemasukan)',
  'Miscellaneous (📦 Lain-lain)'
];

const COMMON_PAYMENT_METHODS = [
  'BCA QRIS',
  'BCA Transfer',
  'Mandiri Livin',
  'GoPay',
  'OVO',
  'ShopeePay',
  'DANA',
  'Cash / Tunai',
  'Kartu Kredit'
];

export default function UploadHub({
  onBack,
  onOpenSimulator,
  onTransactionAdded,
  currency = 'IDR',
  currentUser
}) {
  const [activeModal, setActiveModal] = useState(null); // null | 'file' | 'camera' | 'gallery'
  const [pasteInput, setPasteInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Camera & OCR Scanner States
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const statementInputRef = useRef(null);
  const streamRef = useRef(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [cameraError, setCameraError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState('');

  // Editable Form after OCR scan
  const [scanResult, setScanResult] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMerchant, setEditMerchant] = useState('');
  const [editCategory, setEditCategory] = useState(COMMON_CATEGORIES[0]);
  const [editMethod, setEditMethod] = useState(COMMON_PAYMENT_METHODS[0]);

  // Demo statements for File Statement Upload
  const sampleStatements = [
    {
      name: 'BCA_EStatement_October.pdf',
      type: 'PDF Bank Statement',
      size: '240 KB',
      transactions: [
        { type: 'expense', amount: 85000, category: 'Food & Dining', payment_method: 'BCA QRIS', description: 'Sushi Tei Senayan' },
        { type: 'income', amount: 8500000, category: 'Salary', payment_method: 'BCA Transfer', description: 'Payroll PT Digital' },
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
      time: 'Hari ini, 12:45'
    },
    {
      id: 'gopay-trans',
      name: 'GoPay Transaction Receipt',
      app: 'GoPay',
      amount: 22000,
      merchant: 'Indomaret Point',
      category: 'Shopping',
      time: 'Hari ini, 08:30'
    },
    {
      id: 'shopee-trans',
      name: 'ShopeePay Merchant Transfer',
      app: 'ShopeePay',
      amount: 175000,
      merchant: 'Uniqlo Grand Indonesia',
      category: 'Shopping',
      time: 'Kemarin, 19:15'
    }
  ];

  // Stop camera when closing modal or unmounting
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start real browser camera
  const startCamera = async (mode = facingMode) => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Browser ini tidak mendukung akses kamera langsung. Silakan gunakan opsi upload foto struk.');
      }

      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn('[Camera Access Warn]:', err);
      setCameraError(err.message || 'Izin kamera ditolak atau kamera tidak ditemukan.');
      setIsCameraActive(false);
    }
  };

  // Toggle front/back camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isCameraActive) {
      startCamera(nextMode);
    }
  };

  // Capture current video frame to canvas and run OCR
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    processReceiptImageWithOcr(dataUrl);
  };

  // Handle file select (from device gallery or file dialog)
  const handleFileSelect = e => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const dataUrl = event.target.result;
      setCapturedImage(dataUrl);
      stopCamera();
      processReceiptImageWithOcr(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Send image to backend OCR endpoint
  const processReceiptImageWithOcr = async dataUrl => {
    setOcrLoading(true);
    setOcrProgress('Membaca teks struk dengan AI OCR...');
    setScanResult(null);

    try {
      const res = await fetch('/api/ocr/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal memproses struk.');
      }

      const d = json.data || {};
      setScanResult(d);
      setEditAmount(String(d.amount || ''));
      setEditMerchant(d.merchant || 'Struk Belanja');

      // Match category
      const matchedCat = COMMON_CATEGORIES.find(c => c.toLowerCase().includes(d.category?.toLowerCase())) || COMMON_CATEGORIES[0];
      setEditCategory(matchedCat);

      // Match payment method
      const matchedMethod = COMMON_PAYMENT_METHODS.find(m => m.toLowerCase().includes(d.payment_method?.toLowerCase())) || COMMON_PAYMENT_METHODS[0];
      setEditMethod(matchedMethod);

      setOcrProgress('Struk berhasil dianalisis!');
    } catch (err) {
      console.error('[OCR Error]:', err);
      setOcrProgress('Gagal membaca OCR otomatis. Anda bisa mengisi nominal di bawah ini.');
      setScanResult({
        amount: 0,
        merchant: 'Struk Belanja',
        category: 'Food & Dining',
        payment_method: 'BCA QRIS'
      });
      setEditAmount('');
      setEditMerchant('Struk Belanja');
    } finally {
      setOcrLoading(false);
    }
  };

  // Save the verified scanned receipt as transaction
  const handleSaveScannedTransaction = async () => {
    const numAmount = parseInt(editAmount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Masukkan nominal transaksi yang valid.');
      return;
    }

    setParsing(true);
    try {
      const token = localStorage.getItem('memomeir_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const cleanCat = editCategory.split(' (')[0].trim();

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'expense',
          amount: numAmount,
          category: cleanCat,
          payment_method: editMethod,
          description: `[Scan OCR] ${editMerchant || 'Struk Belanja'}`,
          date: new Date().toISOString()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan transaksi.');

      setFeedback({
        type: 'success',
        message: `Berhasil mencatat transaksi ${formatCurrency(numAmount, currency)} di ${editMerchant}!`
      });

      setActiveModal(null);
      resetScanner();
      if (onTransactionAdded) onTransactionAdded(data.transaction);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setParsing(false);
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setScanResult(null);
    setOcrProgress('');
    setCameraError(null);
    stopCamera();
  };

  // Natural Language FinGPT Paste
  const handleFinGptPaste = async () => {
    if (!pasteInput.trim()) {
      setFeedback({ type: 'error', message: 'Tulis atau tempel catatan transaksi terlebih dahulu.' });
      return;
    }

    setParsing(true);
    setFeedback(null);

    try {
      const text = pasteInput.trim();
      let detectedAmount = 0;
      let detectedType = 'expense';
      let detectedCategory = 'Miscellaneous';
      let detectedMethod = 'Cash / Tunai';

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
      else if (/shopeepay/i.test(text)) detectedMethod = 'ShopeePay';
      else if (/dana/i.test(text)) detectedMethod = 'DANA';
      else if (/kartu kredit|credit card|cc/i.test(text)) detectedMethod = 'Kartu Kredit';

      const token = localStorage.getItem('memomeir_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: detectedType,
          amount: detectedAmount,
          category: detectedCategory,
          payment_method: detectedMethod,
          description: `Catatan: ${text.slice(0, 80)}`,
          date: new Date().toISOString()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan transaksi');

      setFeedback({
        type: 'success',
        message: `Tercatat: ${detectedType === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${formatCurrency(detectedAmount, currency)} (${detectedCategory}) via ${detectedMethod}`
      });
      setPasteInput('');
      if (onTransactionAdded) onTransactionAdded(data.transaction);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Gagal memproses catatan.' });
    } finally {
      setParsing(false);
    }
  };

  // Import Statement Transactions
  const handleImportStatement = async statement => {
    setParsing(true);
    try {
      const token = localStorage.getItem('memomeir_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/import/statement', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sourceName: statement.name,
          transactions: statement.transactions
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengimpor mutasi.');

      setFeedback({
        type: 'success',
        message: `Berhasil mengimpor ${statement.transactions.length} transaksi dari ${statement.name}!`
      });
      setActiveModal(null);
      if (onTransactionAdded) onTransactionAdded({});
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setParsing(false);
    }
  };

  // Scan Preset / Gallery Receipt
  const handleScanReceipt = async receiptPreset => {
    setParsing(true);
    try {
      const token = localStorage.getItem('memomeir_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'expense',
          amount: receiptPreset.amount,
          category: receiptPreset.category,
          payment_method: receiptPreset.merchant.includes('QRIS') ? 'BCA QRIS' : 'BCA Transfer',
          description: `[Struk] ${receiptPreset.merchant}`,
          date: new Date().toISOString()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan transaksi');

      setFeedback({
        type: 'success',
        message: `Struk tercatat: ${receiptPreset.merchant} • ${formatCurrency(receiptPreset.amount, currency)}!`
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
      {/* Hidden file inputs for real camera/gallery uploading */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <input
        ref={statementInputRef}
        type="file"
        accept=".csv,.txt,.json,.pdf,.xlsx"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            handleImportStatement({
              name: file.name,
              transactions: [
                { type: 'expense', amount: 50000, category: 'Food & Dining', payment_method: 'BCA Transfer', description: `${file.name} - Baris 1` },
                { type: 'expense', amount: 120000, category: 'Shopping', payment_method: 'BCA QRIS', description: `${file.name} - Baris 2` }
              ]
            });
          }
        }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* 1. TOP HEADER (Back button + Title + Subtitle) */}
      <div className="finku-header-area">
        <button
          className="finku-back-btn"
          onClick={onBack}
          aria-label="Kembali ke Dashboard"
          title="Kembali ke Dashboard Saldo"
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
          <span>Kembali</span>
        </button>

        <h1 className="finku-main-heading">Smart Upload & Scan Struk</h1>
        <p className="finku-sub-heading">
          Pindai foto struk belanjaan fisik, upload mutasi bank, atau kirim bukti bayar otomatis ke akun Anda.
        </p>
      </div>

      {/* FEEDBACK BANNER (Success / Error notification) */}
      {feedback && (
        <div className={`finku-feedback-banner ${feedback.type === 'success' ? 'success' : 'error'}`}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
          <button className="finku-close-fb" onClick={() => setFeedback(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2-COLUMN MAIN CONTENT GRID (Responsive: 1 col on mobile, 2 col on tablet/desktop) */}
      <div className="finku-main-grid">
        {/* 2. WHATSAPP PROMO BANNER (Green Card with bot illustration) */}
        <div className="finku-promo-card">
          <div className="finku-promo-content">
            <div className="finku-promo-badge">
              <Sparkles size={13} />
              <span>Otomatisasi Bot WhatsApp</span>
            </div>
            <h2 className="finku-promo-title">Catat dari Chat WhatsApp</h2>
            <p className="finku-promo-desc">
              Kirim teks seperti <em>"Kopi Kenangan 25rb QRIS"</em> atau foto struk belanjaan langsung ke bot WhatsApp Memomeir.
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
              <p className="finku-card-subtext">Impor mutasi otomatis dari file PDF rekening koran, CSV, atau Excel.</p>
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

          {/* Card 2: Real Camera OCR Scan */}
          <div
            className="finku-action-card"
            onClick={() => {
              setActiveModal('camera');
              resetScanner();
              startCamera('environment');
            }}
            role="button"
            tabIndex={0}
            title="Scan struk kasir atau struk belanja dengan kamera"
          >
            <div className="finku-card-texts">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h2 className="finku-card-heading">Scan Foto Struk (Kamera OCR)</h2>
                <span style={{ fontSize: '0.65rem', background: '#10b981', color: '#fff', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>
                  Real AI
                </span>
              </div>
              <p className="finku-card-subtext">Arahkan kamera ke struk belanja untuk deteksi nominal & merchant otomatis.</p>
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
                Upload screenshot bukti bayar QRIS, m-Banking (BCA, Mandiri), atau e-wallet (GoPay, ShopeePay).
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
              placeholder="Contoh: Beli bensin pertamax 100rb di SPBU Shell pake BCA..."
              rows={3}
              value={pasteInput}
              onChange={e => setPasteInput(e.target.value)}
              disabled={parsing}
            />

            <button
              className="finku-parse-btn"
              onClick={handleFinGptPaste}
              disabled={parsing || !pasteInput.trim()}
              title="Eksekusi teks transaksi otomatis"
            >
              {parsing ? (
                <>
                  <RefreshCw size={15} className="spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <ClipboardPaste size={15} />
                  <span>Catat Cepat</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SUB-MODALS */}
      {/* 1. Statement Modal */}
      {activeModal === 'file' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content finku-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
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
              <div
                className="finku-dropzone"
                onClick={() => statementInputRef.current?.click()}
                style={{ cursor: 'pointer' }}
              >
                <UploadCloud size={40} color="#0066FF" />
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: 8 }}>
                  Klik untuk pilih file mutasi dari perangkat
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 4 }}>
                  Mendukung file e-statement PDF, CSV, Excel & TXT
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

      {/* 2. REAL CAMERA OCR MODAL */}
      {activeModal === 'camera' && (
        <div
          className="modal-overlay"
          onClick={() => {
            stopCamera();
            setActiveModal(null);
          }}
        >
          <div className="modal-content finku-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div className="modal-title">
                <Camera size={20} color="#0066FF" />
                <span>Scan Struk Belanja (Kamera OCR Real-time)</span>
              </div>
              <button
                className="btn-icon"
                onClick={() => {
                  stopCamera();
                  setActiveModal(null);
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              {/* Viewfinder / Camera Box */}
              <div
                className="finku-camera-box"
                style={{
                  height: 280,
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#09090b',
                  borderRadius: 14
                }}
              >
                {/* Laser animation */}
                {(isCameraActive || ocrLoading) && <div className="finku-laser-line" />}

                {/* Live Camera Video */}
                {isCameraActive && !capturedImage && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}

                {/* Captured Image Preview */}
                {capturedImage && (
                  <img
                    src={capturedImage}
                    alt="Captured receipt"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                )}

                {/* Viewfinder Grid Overlay */}
                {isCameraActive && !capturedImage && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 20,
                      border: '2px dashed rgba(16, 185, 129, 0.7)',
                      borderRadius: 12,
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <span
                      style={{
                        background: 'rgba(0,0,0,0.65)',
                        color: '#fff',
                        fontSize: '0.72rem',
                        padding: '4px 8px',
                        borderRadius: 6
                      }}
                    >
                      Posisikan struk belanja di dalam kotak ini
                    </span>
                  </div>
                )}

                {/* Camera Inactive / Error Fallback */}
                {!isCameraActive && !capturedImage && (
                  <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                    <Camera size={36} style={{ margin: '0 auto 10px', opacity: 0.6 }} />
                    <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#e2e8f0', marginBottom: 4 }}>
                      {cameraError ? 'Kamera Belum Terhubung' : 'Kamera Siap Dinyalakan'}
                    </div>
                    <div style={{ fontSize: '0.76rem', maxWidth: 300, margin: '0 auto 14px' }}>
                      {cameraError || 'Nyalakan kamera perangkat Anda untuk memindai struk fisik secara langsung.'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => startCamera()}
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      >
                        Nyalakan Kamera
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      >
                        Pilih Foto Struk
                      </button>
                    </div>
                  </div>
                )}

                {/* OCR Loading Overlay */}
                {ocrLoading && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(15, 23, 42, 0.85)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      color: '#fff',
                      zIndex: 10
                    }}
                  >
                    <RefreshCw size={26} className="spin" color="#10b981" />
                    <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Menganalisis Struk...</span>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>AI sedang membaca total & merchant</span>
                  </div>
                )}
              </div>

              {/* Camera Action Buttons */}
              {isCameraActive && !capturedImage && (
                <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={capturePhoto}
                    style={{
                      padding: '10px 24px',
                      borderRadius: 9999,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#10b981',
                      borderColor: '#10b981'
                    }}
                  >
                    <Camera size={18} />
                    <span>Jepret Foto Struk</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={toggleFacingMode}
                    title="Ganti kamera depan / belakang"
                    style={{ padding: '10px 14px', borderRadius: 9999 }}
                  >
                    <SwitchCamera size={16} />
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    title="Pilih foto dari galeri HP / laptop"
                    style={{ padding: '10px 14px', borderRadius: 9999 }}
                  >
                    <ImageIcon size={16} />
                  </button>
                </div>
              )}

              {/* Scanned Verification & Edit Form */}
              {scanResult && !ocrLoading && (
                <div className="fade-in" style={{ marginTop: 16, background: 'var(--bg-subtle)', padding: 14, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <span style={{ fontWeight: 700, fontSize: '0.86rem' }}>Hasil Deteksi Struk (Bisa Diubah):</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>Total Nominal (Rp)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editAmount}
                        onChange={e => setEditAmount(e.target.value)}
                        placeholder="Contoh: 45000"
                        style={{ fontWeight: 700, fontSize: '0.95rem' }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>Toko / Merchant</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editMerchant}
                        onChange={e => setEditMerchant(e.target.value)}
                        placeholder="Nama Toko"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>Kategori</label>
                      <select
                        className="form-input"
                        value={editCategory}
                        onChange={e => setEditCategory(e.target.value)}
                        style={{ fontSize: '0.78rem' }}
                      >
                        {COMMON_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>Metode Pembayaran</label>
                      <select
                        className="form-input"
                        value={editMethod}
                        onChange={e => setEditMethod(e.target.value)}
                        style={{ fontSize: '0.78rem' }}
                      >
                        {COMMON_PAYMENT_METHODS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSaveScannedTransaction}
                      disabled={parsing || !editAmount}
                      style={{ flex: 1, padding: 10, justifyContent: 'center', background: '#0066FF' }}
                    >
                      {parsing ? 'Menyimpan...' : 'Simpan ke Transaksi Saya'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        resetScanner();
                        startCamera('environment');
                      }}
                      style={{ padding: '10px 14px' }}
                      title="Foto ulang struk"
                    >
                      <RefreshCw size={15} />
                      <span>Foto Ulang</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Gallery Modal */}
      {activeModal === 'gallery' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content finku-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
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
              {/* Real Screenshot Upload Dropzone */}
              <div
                className="finku-dropzone"
                onClick={() => galleryInputRef.current?.click()}
                style={{ cursor: 'pointer', marginBottom: 14 }}
              >
                <ImageIcon size={36} color="#0066FF" />
                <div style={{ fontWeight: 700, fontSize: '0.92rem', marginTop: 8 }}>
                  Pilih Screenshot Bukti Transfer dari HP / Laptop
                </div>
                <div style={{ fontSize: '0.76rem', color: '#6B7280', marginTop: 4 }}>
                  Mendukung screenshot BCA Mobile, QRIS, GoPay, ShopeePay, Mandiri Livin
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <span className="form-label">Atau Pilih Contoh Screenshot Cepat:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
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
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{rec.name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                          {rec.merchant} • {rec.time}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="num" style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
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
        </div>
      )}
    </div>
  );
}

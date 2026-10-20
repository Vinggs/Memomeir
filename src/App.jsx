import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar.jsx';
import SummaryCards from './components/SummaryCards.jsx';
import CategoryChart from './components/CategoryChart.jsx';
import TransactionTable from './components/TransactionTable.jsx';
import WhatsAppSimulatorModal from './components/WhatsAppSimulatorModal.jsx';
import AddTransactionModal from './components/AddTransactionModal.jsx';
import WebhookDocsModal from './components/WebhookDocsModal.jsx';
import DbStatusModal from './components/DbStatusModal.jsx';
import MobileBottomNav from './components/MobileBottomNav.jsx';
import UploadHub from './components/UploadHub.jsx';
import MobileDashboardView from './components/MobileDashboardView.jsx';
import { Layers, CheckCircle2, UploadCloud, Send, Plus, ShieldCheck, MessageSquare, Bot, Sparkles, BookOpen } from 'lucide-react';


export default function App() {
  // Theme State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('memomeir_theme_v2') || 'light';
  });

  // Mobile Detection (Breakpoint 768px)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  // Main Navigation Tab ('upload' | 'dashboard')
  // On mobile (< 768px): default to Upload Hub (matching Finku reference)
  // On desktop (>= 768px): default to Dashboard (Command Center)
  const [currentTab, setCurrentTab] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'upload';
    }
    return 'dashboard';
  });

  // Currency State (IDR vs USD)
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('memomeir_currency') || 'IDR';
  });

  // Data States (Clean Real Data starting from 0)
  const [stats, setStats] = useState({
    summary: {
      totalBalance: 0,
      monthlyExpense: 0,
      monthlyIncome: 0,
      totalIncome: 0,
      totalExpense: 0,
      savingsRate: 0,
      transactionCount: 0
    },
    categoryBreakdown: [],
    paymentMethodStats: {},
    dbStatus: { engine: 'local_fallback', isPostgres: false }
  });

  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [isDbStatusOpen, setIsDbStatusOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [waStatus, setWaStatus] = useState(null);

  // Toast notification
  const [toast, setToast] = useState(null);

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Sync window size listener for mobile vs desktop differentiation
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync theme to root DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('memomeir_theme_v2', theme);
    localStorage.setItem('memomeir_theme', theme);
  }, [theme]);

  // Sync currency preference
  useEffect(() => {
    localStorage.setItem('memomeir_currency', currency);
  }, [currency]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleCurrency = () => {
    setCurrency(prev => (prev === 'IDR' ? 'USD' : 'IDR'));
  };

  // Fetch Financial Stats
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('[Memomeir] Failed to load stats:', err);
    }
  }, []);

  // Fetch Transactions List
  const loadTransactions = useCallback(async () => {
    try {
      let url = `/api/transactions?limit=100`;
      if (filterType !== 'all') {
        url += `&type=${filterType}`;
      }
      if (searchQuery.trim().length > 0) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('[Memomeir] Failed to load transactions:', err);
    }
  }, [filterType, searchQuery]);

  // Fetch WhatsApp Bot Status (Connection & On/Off state)
  const loadWaStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      if (res.ok) {
        const data = await res.json();
        setWaStatus(data);
      }
    } catch {
      // offline / quiet fallback
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadStats();
    loadTransactions();
    loadWaStatus();

    const interval = setInterval(() => {
      loadWaStatus();
      loadStats();
    }, 8000);
    return () => clearInterval(interval);
  }, [loadStats, loadTransactions, loadWaStatus]);

  // Delete transaction
  const handleDeleteTransaction = async id => {
    if (!window.confirm('Yakin ingin menghapus transaksi ini dari database?')) {
      return;
    }
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Transaksi #${id} berhasil dihapus`);
        loadStats();
        loadTransactions();
      }
    } catch (err) {
      console.error('[Memomeir] Delete error:', err);
    }
  };

  // Callback when transaction is added (via Simulator, Manual Add, or Upload Hub)
  const handleTransactionAdded = newTx => {
    const amtStr = newTx?.amount ? `${currency} ${Number(newTx.amount).toLocaleString('id-ID')}` : '';
    showToast(`Transaksi ${amtStr} berhasil dicatat ke database!`);
    loadStats();
    loadTransactions();
  };

  // Callback after database reset / clear
  const handleResetSeed = () => {
    showToast('Database disegarkan');
    loadStats();
    loadTransactions();
  };

  // Touch swipe gesture navigation for mobile (Swipe between Upload Hub & Dashboard)
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 55;

  const handleTouchStart = e => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = e => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe && currentTab === 'upload') {
      setCurrentTab('dashboard');
      showToast('Beralih ke Ringkasan Saldo');
    }
    if (isRightSwipe && currentTab === 'dashboard') {
      setCurrentTab('upload');
      showToast('Beralih ke Smart Upload');
    }
  };

  return (
    <>
      <div className="app-grid-bg" />

      <main className="app-container">
        {/* ==============================================================
            1. MOBILE (HP) VIEW (< 768px)
            Native app layout: Finku Upload Hub or Dedicated Mobile Saldo
            with Fluid Touch Swipe Navigation
            ============================================================== */}
        {isMobile ? (
          <div
            className="mobile-view-container"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {currentTab === 'upload' ? (
              <UploadHub
                onBack={() => setCurrentTab('dashboard')}
                onOpenSimulator={() => setIsSimulatorOpen(true)}
                onTransactionAdded={handleTransactionAdded}
                currency={currency}
              />
            ) : (
              <MobileDashboardView
                stats={stats}
                transactions={transactions}
                currency={currency}
                theme={theme}
                toggleTheme={toggleTheme}
                toggleCurrency={toggleCurrency}
                onOpenAddModal={() => setIsAddModalOpen(true)}
                onOpenUpload={() => setCurrentTab('upload')}
                onOpenSimulator={() => setIsSimulatorOpen(true)}
                onDeleteTransaction={handleDeleteTransaction}
                onRefresh={async () => {
                  await loadStats();
                  await loadTransactions();
                  showToast('Data diperbarui');
                }}
                currentTab={currentTab}
                setCurrentTab={setCurrentTab}
              />
            )}
          </div>
        ) : (
          /* ==============================================================
             2. LAPTOP / DESKTOP VIEW (>= 768px)
             Wide Financial Command Center layout: Top Nav, 4-col KPI cards,
             2-col analytics grid, full data table
             ============================================================== */
          <div className="desktop-view-container">
            {/* Desktop Full Widescreen Navigation Bar */}
            <Navbar
              currentTab={currentTab}
              setCurrentTab={setCurrentTab}
              theme={theme}
              toggleTheme={toggleTheme}
              currency={currency}
              toggleCurrency={toggleCurrency}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenDocsModal={() => setIsDocsModalOpen(true)}
              onOpenDbStatus={() => setIsDbStatusOpen(true)}
              dbStatus={stats.dbStatus}
            />

            {currentTab === 'upload' ? (
              <UploadHub
                onBack={() => setCurrentTab('dashboard')}
                onOpenSimulator={() => setIsSimulatorOpen(true)}
                onTransactionAdded={handleTransactionAdded}
                currency={currency}
              />
            ) : (
              <>
                {/* Desktop Overview Banner */}
                <section className="desktop-hero-banner">
                  <div className="desktop-hero-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h1 className="desktop-hero-title">Memomeir • Pencatat Keuangan Otomatis</h1>
                      <span className="desktop-real-badge">
                        <ShieldCheck size={13} style={{ marginRight: 4 }} />
                        Mode Data Real
                      </span>
                      {waStatus?.connected ? (
                        <span
                          className="desktop-real-badge"
                          style={{
                            backgroundColor: waStatus.config?.enabled !== false ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: waStatus.config?.enabled !== false ? 'var(--income-color)' : 'var(--expense-color)',
                            borderColor: waStatus.config?.enabled !== false ? 'var(--income-border)' : 'var(--expense-border)',
                            cursor: 'pointer'
                          }}
                          onClick={() => setIsDocsModalOpen(true)}
                          title="Klik untuk melihat status & panduan WhatsApp"
                        >
                          <span
                            className="status-dot pulse"
                            style={{
                              backgroundColor: waStatus.config?.enabled !== false ? '#10B981' : '#EF4444',
                              marginRight: 6
                            }}
                          />
                          {waStatus.config?.enabled !== false ? 'Bot WA: 🟢 Aktif' : 'Bot WA: 🔴 Mode Tidur'}
                        </span>
                      ) : null}
                    </div>
                    <p className="desktop-hero-desc">
                      Pusat kendali keuangan harian Anda. Catat pengeluaran dan pemasukan dengan mudah melalui web ini, upload struk belanja, atau cukup kirim chat via bot WhatsApp.
                    </p>
                  </div>

                  <div className="desktop-hero-actions">
                    <button
                      className="btn btn-primary cartoon-tactile-btn"
                      onClick={() => setIsAddModalOpen(true)}
                      title="Catat transaksi manual"
                    >
                      <Plus size={16} strokeWidth={2.6} />
                      <span>Catat Transaksi</span>
                    </button>
                    <button
                      className="btn btn-secondary cartoon-pill-btn"
                      onClick={() => setCurrentTab('upload')}
                      title="Buka Smart Upload & Scan Struk"
                    >
                      <UploadCloud size={15} strokeWidth={2.4} />
                      <span>Smart Upload & Scan</span>
                    </button>
                    <button
                      className="btn btn-secondary cartoon-pill-btn"
                      onClick={() => setIsSimulatorOpen(true)}
                      title="Coba Simulasi Chat WhatsApp"
                      style={{ borderColor: '#25D366', color: '#128C7E' }}
                    >
                      <MessageSquare size={14} strokeWidth={2.4} style={{ color: '#25D366' }} />
                      <span>Simulasi Chat WA</span>
                    </button>
                    <button
                      className="btn btn-secondary cartoon-pill-btn"
                      onClick={() => setIsDocsModalOpen(true)}
                      title="Panduan Sambungkan Bot WhatsApp"
                    >
                      <BookOpen size={14} strokeWidth={2.4} />
                      <span>Panduan Sambung WA</span>
                    </button>
                  </div>
                </section>

                {/* 3-Step WhatsApp & Web Quick Guide Banner (Collapsible) */}
                <section className="desktop-guide-banner">
                  <div
                    className="desktop-guide-header"
                    onClick={() => setIsGuideOpen(prev => !prev)}
                    style={{ cursor: 'pointer', margin: isGuideOpen ? '0 0 14px' : '0' }}
                  >
                    <div className="desktop-guide-heading">
                      <Sparkles size={16} color="#0066FF" />
                      <span>Cara Praktis Menggunakan Memomeir & WhatsApp</span>
                      <span className="cartoon-pill-badge" style={{ fontSize: '0.66rem', padding: '2px 8px', marginLeft: 6 }}>
                        {isGuideOpen ? 'Sembunyikan Panduan ▲' : 'Lihat Panduan 3 Langkah ▼'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Tersambung langsung ke database realtime
                    </div>
                  </div>

                  {isGuideOpen && (
                    <div className="desktop-guide-steps" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                      {/* Step 1 */}
                      <div className="desktop-step-item">
                        <div className="desktop-step-badge step-1">1</div>
                        <div className="desktop-step-text-wrap">
                          <div className="desktop-step-title">Kirim Chat WA / Upload Struk</div>
                          <div className="desktop-step-desc">
                            Ketik chat santai seperti <em>"Kopi 25rb qris"</em> ke WhatsApp, atau upload file mutasi & foto struk di web.
                          </div>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="desktop-step-item">
                        <div className="desktop-step-badge step-2">2</div>
                        <div className="desktop-step-text-wrap">
                          <div className="desktop-step-title">Dikenali Otomatis</div>
                          <div className="desktop-step-desc">
                            Sistem otomatis membaca nominal uang, kategori (Makanan, Transport, dll), dan metode pembayaran.
                          </div>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="desktop-step-item">
                        <div className="desktop-step-badge step-3">3</div>
                        <div className="desktop-step-text-wrap">
                          <div className="desktop-step-title">Saldo & Laporan Real-Time</div>
                          <div className="desktop-step-desc">
                            Saldo bersih, pengeluaran bulanan, dan grafik analitik langsung diperbarui seketika di dashboard ini.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                {/* 1. Summary Cards (4-Column Grid on Desktop) */}
                <SummaryCards
                  summary={stats.summary}
                  currency={currency}
                />

                {/* 2. Visualizations (2-Column Analytics Grid on Desktop) */}
                <CategoryChart
                  categoryBreakdown={stats.categoryBreakdown}
                  paymentMethodStats={stats.paymentMethodStats}
                  totalExpense={stats.summary?.totalExpense || 0}
                  currency={currency}
                />

                {/* 3. Full Data Table */}
                <TransactionTable
                  transactions={transactions}
                  filterType={filterType}
                  setFilterType={setFilterType}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onDeleteTransaction={handleDeleteTransaction}
                  onOpenAddModal={() => setIsAddModalOpen(true)}
                  currency={currency}
                />
              </>
            )}

            {/* Desktop Footer */}
            <footer className="app-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={14} />
                <span>Memomeir • Pencatat Keuangan Harian</span>
              </div>
              <div>
                <span>Catat keuangan pribadi dengan mudah lewat Web & WhatsApp</span>
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                © {new Date().getFullYear()} Memomeir
              </div>
            </footer>
          </div>
        )}
      </main>

      {/* Shared Modals */}
      <WhatsAppSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onTransactionAdded={handleTransactionAdded}
      />

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTransactionCreated={handleTransactionAdded}
      />

      <WebhookDocsModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
      />

      <DbStatusModal
        isOpen={isDbStatusOpen}
        onClose={() => setIsDbStatusOpen(false)}
        dbStatus={stats.dbStatus}
        onResetSeed={handleResetSeed}
      />

      {/* Mobile Bottom Dock (Exclusively for Mobile screens) */}
      {isMobile && (
        <MobileBottomNav
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onOpenSimulator={() => setIsSimulatorOpen(true)}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenDbStatus={() => setIsDbStatusOpen(true)}
          dbStatus={stats.dbStatus}
        />
      )}

      {/* Toast Notice */}
      {toast && (
        <div className="toast-notice">
          <CheckCircle2 size={16} color="var(--income-color)" />
          <span>{toast}</span>
        </div>
      )}
    </>
  );
}

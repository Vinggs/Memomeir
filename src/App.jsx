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
import AuthGate from './components/AuthGate.jsx';
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
  const [currentTab, setCurrentTab] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'upload';
    }
    return 'dashboard';
  });

  // Currency State (Clean IDR Rupiah)
  const currency = 'IDR';
  useEffect(() => {
    localStorage.setItem('memomeir_currency', 'IDR');
  }, []);

  // Authentication State (Gmail + Password with JWT Session)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('memomeir_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authToken, setAuthToken] = useState(() => {
    return localStorage.getItem('memomeir_token') || null;
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
    dbStatus: { engine: 'postgres', isPostgres: true }
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

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Verify auth session on initial load
  useEffect(() => {
    if (!authToken) return;
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('memomeir_user', JSON.stringify(data.user));
        } else {
          // Token expired or invalid
          localStorage.removeItem('memomeir_token');
          localStorage.removeItem('memomeir_user');
          setCurrentUser(null);
          setAuthToken(null);
        }
      })
      .catch(() => {});
  }, [authToken]);

  // Fetch Financial Stats (Scoped strictly to authenticated user)
  const loadStats = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/stats', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('[Memomeir] Failed to load stats:', err);
    }
  }, [authToken]);

  // Fetch Transactions List (Scoped strictly to authenticated user)
  const loadTransactions = useCallback(async () => {
    if (!authToken) return;
    try {
      let url = `/api/transactions?limit=100`;
      if (filterType !== 'all') {
        url += `&type=${filterType}`;
      }
      if (searchQuery.trim().length > 0) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('[Memomeir] Failed to load transactions:', err);
    }
  }, [filterType, searchQuery, authToken]);

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

  // Periodic polling for stats and WA status when authenticated
  useEffect(() => {
    if (!currentUser || !authToken) return;

    loadStats();
    loadTransactions();
    loadWaStatus();

    const interval = setInterval(() => {
      loadWaStatus();
      loadStats();
    }, 8000);
    return () => clearInterval(interval);
  }, [currentUser, authToken, loadStats, loadTransactions, loadWaStatus]);

  // Delete transaction
  const handleDeleteTransaction = async id => {
    if (!window.confirm('Yakin ingin menghapus transaksi ini dari database?')) {
      return;
    }
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        showToast(`Transaksi #${id} berhasil dihapus`);
        loadStats();
        loadTransactions();
      }
    } catch (err) {
      console.error('[Memomeir] Delete error:', err);
    }
  };

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    setAuthToken(token);
    showToast(`Selamat datang, ${user.name}! Akun Anda aktif.`);
  };

  const handleLogout = () => {
    localStorage.removeItem('memomeir_token');
    localStorage.removeItem('memomeir_user');
    setCurrentUser(null);
    setAuthToken(null);
    setStats({
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
      dbStatus: { engine: 'postgres', isPostgres: true }
    });
    setTransactions([]);
    showToast('Berhasil keluar dari akun.');
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

  // Touch swipe gesture navigation for mobile
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

  // =========================================================================
  // AUTHENTICATION GATE (Gmail + Password Required)
  // If user is not logged in, show the full-screen AuthGate
  // =========================================================================
  if (!currentUser) {
    return (
      <AuthGate
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

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
                currentUser={currentUser}
              />
            ) : (
              <MobileDashboardView
                stats={stats}
                transactions={transactions}
                currency={currency}
                theme={theme}
                toggleTheme={toggleTheme}
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
                currentUser={currentUser}
                onLogout={handleLogout}
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
              onOpenSimulator={() => setIsSimulatorOpen(true)}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenDocsModal={() => setIsDocsModalOpen(true)}
              onOpenDbStatus={() => setIsDbStatusOpen(true)}
              dbStatus={stats.dbStatus}
              currentUser={currentUser}
              onLogout={handleLogout}
            />

            {currentTab === 'upload' ? (
              <UploadHub
                onBack={() => setCurrentTab('dashboard')}
                onOpenSimulator={() => setIsSimulatorOpen(true)}
                onTransactionAdded={handleTransactionAdded}
                currency={currency}
                currentUser={currentUser}
              />
            ) : (
              <>
                {/* Desktop Overview Banner */}
                <section className="desktop-hero-banner">
                  <div className="desktop-hero-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h1 className="desktop-hero-title">Memomeir</h1>
                      <span className="desktop-real-badge">
                        <ShieldCheck size={13} style={{ marginRight: 4 }} />
                        Akun: {currentUser.name} ({currentUser.email})
                      </span>
                    </div>

                    <p className="desktop-hero-subtitle">
                      Pencatatan keuangan pribadi real-time. Setiap transaksi yang Anda catat lewat web atau bot WhatsApp langsung terisolasi di akun Anda.
                    </p>
                  </div>

                  <div className="desktop-hero-actions">
                    <button
                      className="btn btn-secondary cartoon-pill-btn"
                      onClick={() => setIsGuideOpen(!isGuideOpen)}
                      title="Pelajari alur cara kerja Memomeir"
                    >
                      <BookOpen size={14} />
                      <span>{isGuideOpen ? 'Tutup Panduan' : 'Cara Kerja'}</span>
                    </button>
                    <button
                      className="btn btn-primary cartoon-tactile-btn"
                      onClick={() => setIsAddModalOpen(true)}
                      title="Tambah transaksi manual"
                    >
                      <Plus size={16} />
                      <span>Catat Transaksi</span>
                    </button>
                  </div>

                  {/* Collapsible 3-Step Architecture Guide */}
                  {isGuideOpen && (
                    <div className="desktop-steps-container fade-in">
                      {/* Step 1 */}
                      <div className="desktop-step-item">
                        <div className="desktop-step-badge step-1">1</div>
                        <div className="desktop-step-text-wrap">
                          <div className="desktop-step-title">Kirim Chat atau Foto Struk</div>
                          <div className="desktop-step-desc">
                            Kirim pesan seperti <em>"Kopi Tuku 25rb QRIS"</em> atau kirim foto struk belanjaan langsung ke bot WhatsApp.
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
                <span>Akun Anda: {currentUser.name} ({currentUser.email})</span>
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
        currentUser={currentUser}
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

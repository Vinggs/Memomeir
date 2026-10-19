import React from 'react';
import {
  Sun,
  Moon,
  Plus,
  Send,
  Code2,
  Layers,
  UploadCloud,
  LayoutDashboard
} from 'lucide-react';

export default function Navbar({
  currentTab,
  setCurrentTab,
  theme,
  toggleTheme,
  currency,
  toggleCurrency,
  onOpenSimulator,
  onOpenAddModal,
  onOpenDocsModal,
  onOpenDbStatus,
  dbStatus
}) {
  const isPostgres = dbStatus?.engine === 'postgres';

  return (
    <header className="top-nav">
      <div className="brand-section">
        <div
          className="brand-logo-mark"
          title="Memomeir Financial OS"
          onClick={() => setCurrentTab('dashboard')}
          style={{ cursor: 'pointer' }}
        >
          <Layers size={20} strokeWidth={2.4} />
        </div>
        <div className="brand-title-wrap">
          <div className="brand-title" onClick={() => setCurrentTab('dashboard')} style={{ cursor: 'pointer' }}>
            Memomeir
            <span className="cartoon-pill-badge" style={{ fontSize: '0.62rem', padding: '2px 8px' }}>
              Keuangan Harian
            </span>
          </div>
          <span className="brand-sub">Pencatat Keuangan Pribadi & WhatsApp AI Webhook</span>
        </div>
      </div>

      {/* Main View Tabs (Desktop Switcher) */}
      <div className="nav-tab-switcher desktop-only">
        <button
          className={`nav-tab-btn ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentTab('dashboard')}
          title="Lihat Ringkasan Keuangan & Transaksi"
        >
          <LayoutDashboard size={15} />
          <span>Ringkasan Saldo</span>
        </button>

        <button
          className={`nav-tab-btn ${currentTab === 'upload' ? 'active' : ''}`}
          onClick={() => setCurrentTab('upload')}
          title="Upload Mutasi Bank atau Scan Struk Belanja"
        >
          <UploadCloud size={15} />
          <span>Scan Struk & File</span>
          <span className="cartoon-mini-pill">AI</span>
        </button>

        <button
          className="nav-tab-btn"
          onClick={onOpenSimulator}
          title="Simulasi Kirim Transaksi Lewat Chat WhatsApp"
        >
          <Send size={14} />
          <span>Simulasi Bot WA</span>
        </button>
      </div>

      <div className="nav-actions">
        {/* Live Engine Status */}
        <button
          className="status-pill desktop-only"
          onClick={onOpenDbStatus}
          title="Klik untuk melihat status database PostgreSQL / Local"
        >
          <span className="status-dot pulse" style={{ backgroundColor: isPostgres ? 'var(--income-color)' : '#f59e0b' }} />
          <span>{isPostgres ? 'PostgreSQL: Aktif' : 'Penyimpanan: Lokal'}</span>
        </button>

        {/* Currency Switcher */}
        <button
          className="btn btn-secondary cartoon-pill-btn"
          onClick={toggleCurrency}
          title="Ganti Format Mata Uang (IDR / USD)"
          style={{ padding: '6px 14px', fontSize: '0.78rem' }}
        >
          <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{currency}</span>
        </button>

        {/* Webhook Docs */}
        <button
          className="btn btn-secondary cartoon-pill-btn desktop-only"
          onClick={onOpenDocsModal}
          title="Panduan Sambungan Webhook WhatsApp & API"
        >
          <Code2 size={15} />
          <span>Panduan WA</span>
        </button>

        {/* Manual Add Button */}
        <button
          className="btn btn-primary cartoon-tactile-btn desktop-only"
          onClick={onOpenAddModal}
          title="Catat pengeluaran atau pemasukan baru"
        >
          <Plus size={16} strokeWidth={2.6} />
          <span>+ Catat Transaksi</span>
        </button>

        {/* Theme Switcher */}
        <button
          className="btn-icon cartoon-icon-btn"
          onClick={toggleTheme}
          title={`Ganti ke Tema ${theme === 'dark' ? 'Terang' : 'Gelap'}`}
          aria-label="Ganti Tema"
        >
          {theme === 'dark' ? <Sun size={17} strokeWidth={2.4} /> : <Moon size={17} strokeWidth={2.4} />}
        </button>
      </div>
    </header>
  );
}

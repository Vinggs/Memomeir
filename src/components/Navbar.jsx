import React, { useState, useRef, useEffect } from 'react';
import {
  Sun,
  Moon,
  Plus,
  Send,
  MessageSquare,
  Layers,
  UploadCloud,
  LayoutDashboard,
  Users,
  ChevronDown,
  UserCheck,
  UserPlus,
  LogIn,
  LogOut,
  User
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
  dbStatus,
  users = [],
  selectedUser = 'all',
  onSelectUser,
  onOpenMemberModal,
  currentUser,
  onOpenAuthModal,
  onLogout
}) {
  const isPostgres = dbStatus?.engine === 'postgres';
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeMember = users.find(u => u.name === selectedUser);

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
          </div>
          <span className="brand-sub">Pencatat Keuangan Pribadi</span>
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
        {/* User Account / Login / Register Button */}
        {currentUser ? (
          <div className="profile-switcher-wrap" ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              className="btn btn-secondary cartoon-pill-btn"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              title="Profil Akun Anda"
              style={{
                padding: '5px 12px',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderColor: currentUser.color || 'var(--accent-blue)'
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: currentUser.color || '#3b82f6',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}
              >
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </span>
              <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
                <span style={{ fontWeight: 700, display: 'block', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  {currentUser.name}
                </span>
                <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                  {currentUser.email || 'user'}
                </span>
              </div>
              <ChevronDown size={13} style={{ opacity: 0.7, transform: isUserMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {isUserMenuOpen && (
              <div
                className="cartoon-dropdown"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 250,
                  background: 'var(--card-bg)',
                  borderRadius: 14,
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                  padding: '8px',
                  zIndex: 1000
                }}
              >
                <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--border-color)', marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {currentUser.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                    {currentUser.email}
                  </div>
                  {currentUser.phone ? (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      📱 +{currentUser.phone}
                    </div>
                  ) : null}
                  <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, marginTop: 4 }}>
                    ● Sesi Aktif & Terisolasi
                  </div>
                </div>

                {/* Logout / Switch Account */}
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'transparent',
                    color: '#ef4444',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    textAlign: 'left'
                  }}
                >
                  <LogOut size={14} />
                  <span>Ganti Akun / Keluar</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="btn btn-primary cartoon-tactile-btn"
            onClick={onOpenAuthModal}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            <LogIn size={15} />
            <span>Masuk / Daftar</span>
          </button>
        )}


        {/* WhatsApp Guide */}
        <button
          className="btn btn-secondary cartoon-pill-btn desktop-only"
          onClick={onOpenDocsModal}
          title="Panduan Cara Menggunakan Bot WhatsApp"
        >
          <MessageSquare size={14} style={{ color: '#25D366' }} />
          <span>Panduan WA</span>
        </button>

        {/* Manual Add Button */}
        <button
          className="btn btn-primary cartoon-tactile-btn desktop-only"
          onClick={onOpenAddModal}
          title="Catat pengeluaran atau pemasukan baru"
        >
          <Plus size={16} strokeWidth={2.6} />
          <span>Catat Transaksi</span>
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

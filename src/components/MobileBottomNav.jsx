import React from 'react';
import { Plus, Send, UploadCloud, Database, LayoutDashboard, Sparkles } from 'lucide-react';

export default function MobileBottomNav({
  currentTab,
  setCurrentTab,
  onOpenSimulator,
  onOpenAddModal,
  onOpenDbStatus,
  dbStatus
}) {
  const isPostgres = dbStatus?.isPostgres;

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation Dock">
      <div className="mobile-bottom-nav-inner">
        {/* Tab 1: Upload Hub */}
        <button
          className={`mobile-nav-item ${currentTab === 'upload' ? 'active' : ''}`}
          onClick={() => setCurrentTab('upload')}
          title="Smart Upload & OCR Scanner"
          aria-label="Upload Hub"
        >
          <div className="mobile-nav-icon-wrap">
            <UploadCloud size={20} strokeWidth={currentTab === 'upload' ? 2.5 : 1.9} />
            <span className="mobile-badge-ai" title="AI OCR Scanner">
              <Sparkles size={8} strokeWidth={2.8} />
            </span>
          </div>
          <span className="mobile-nav-label">Upload</span>
          {currentTab === 'upload' && <span className="mobile-active-glow-bar" />}
        </button>

        {/* Tab 2: Dashboard Saldo */}
        <button
          className={`mobile-nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentTab('dashboard')}
          title="Ringkasan Saldo & Feed"
          aria-label="Dashboard Overview"
        >
          <div className="mobile-nav-icon-wrap">
            <LayoutDashboard size={20} strokeWidth={currentTab === 'dashboard' ? 2.5 : 1.9} />
          </div>
          <span className="mobile-nav-label">Saldo</span>
          {currentTab === 'dashboard' && <span className="mobile-active-glow-bar" />}
        </button>

        {/* Center Prominent (+) Action Button */}
        <div className="mobile-nav-center-wrap">
          <button
            className="mobile-nav-center-btn"
            onClick={onOpenAddModal}
            title="Catat Transaksi Real Baru"
            aria-label="Catat Transaksi Baru"
          >
            <div className="mobile-center-glow" />
            <Plus size={24} strokeWidth={2.8} className="mobile-plus-icon" />
          </button>
        </div>

        {/* Tab 3: WhatsApp Bot */}
        <button
          className="mobile-nav-item"
          onClick={onOpenSimulator}
          title="Simulasi WhatsApp Bot"
          aria-label="WhatsApp Bot"
        >
          <div className="mobile-nav-icon-wrap">
            <Send size={19} strokeWidth={1.9} />
          </div>
          <span className="mobile-nav-label">WA Bot</span>
        </button>

        {/* Tab 4: Database Architecture */}
        <button
          className="mobile-nav-item"
          onClick={onOpenDbStatus}
          title="PostgreSQL / Fallback Status"
          aria-label="Database Status"
        >
          <div className="mobile-nav-icon-wrap">
            <Database size={19} strokeWidth={1.9} />
            <span
              className={`mobile-db-dot ${isPostgres ? 'postgres' : 'fallback'}`}
              title={isPostgres ? 'PostgreSQL Active' : 'Local JSON Active'}
            />
          </div>
          <span className="mobile-nav-label">Database</span>
        </button>
      </div>
    </nav>
  );
}


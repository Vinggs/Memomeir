import React, { useState, useMemo } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  UploadCloud,
  Send,
  Trash2,
  Inbox,
  Sun,
  Moon,
  Layers,
  PieChart,
  Search,
  RefreshCw,
  X,
  TrendingUp
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/formatters.js';

// Map common categories to friendly emoji icons
function getCategoryEmoji(catName = '') {
  const lower = catName.toLowerCase();
  if (lower.includes('food') || lower.includes('makan') || lower.includes('dining')) return '🍔';
  if (lower.includes('salary') || lower.includes('gaji') || lower.includes('income')) return '💼';
  if (lower.includes('transport') || lower.includes('bensin') || lower.includes('taxi')) return '🚗';
  if (lower.includes('utilit') || lower.includes('listrik') || lower.includes('wifi') || lower.includes('pulsa')) return '⚡';
  if (lower.includes('shop') || lower.includes('belanja')) return '🛍️';
  if (lower.includes('invest') || lower.includes('saham') || lower.includes('crypto')) return '📈';
  if (lower.includes('health') || lower.includes('sehat') || lower.includes('obat')) return '🏥';
  if (lower.includes('entertain') || lower.includes('hiburan') || lower.includes('nonton')) return '🍿';
  if (lower.includes('equip') || lower.includes('alat') || lower.includes('gadget')) return '🎧';
  return '💳';
}

export default function MobileDashboardView({
  stats,
  transactions = [],
  currency = 'IDR',
  theme,
  toggleTheme,
  toggleCurrency,
  onOpenAddModal,
  onOpenUpload,
  onOpenSimulator,
  onDeleteTransaction,
  onRefresh,
  currentTab,
  setCurrentTab
}) {
  const { summary = {}, categoryBreakdown = [] } = stats;
  const {
    totalBalance = 0,
    totalIncome = 0,
    totalExpense = 0,
    transactionCount = 0
  } = summary;

  // Local mobile search & filter states
  const [mobileFilter, setMobileFilter] = useState('all'); // 'all' | 'expense' | 'income'
  const [mobileSearch, setMobileSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Trigger smooth refresh with spin animation
  const handleRefreshClick = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Filtered transactions for mobile list
  const filteredList = useMemo(() => {
    return transactions.filter(tx => {
      // 1. Type filter
      if (mobileFilter !== 'all' && tx.type !== mobileFilter) {
        return false;
      }
      // 2. Category tag filter
      if (selectedCategory && tx.category !== selectedCategory) {
        return false;
      }
      // 3. Search query
      if (mobileSearch.trim()) {
        const q = mobileSearch.trim().toLowerCase();
        const descMatch = (tx.description || '').toLowerCase().includes(q);
        const catMatch = (tx.category || '').toLowerCase().includes(q);
        const methodMatch = (tx.payment_method || '').toLowerCase().includes(q);
        return descMatch || catMatch || methodMatch;
      }
      return true;
    });
  }, [transactions, mobileFilter, selectedCategory, mobileSearch]);

  // Savings rate calculation
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  return (
    <div className="mobile-dashboard-wrapper">
      {/* 1. Sleek Mobile App Bar */}
      <header className="mobile-app-bar">
        <div className="mobile-brand-left">
          <div className="mobile-logo-mark">
            <Layers size={18} strokeWidth={2.4} />
          </div>
          <div>
            <div className="mobile-brand-title">
              Memomeir
              <span className="mobile-real-badge">
                <span className="mobile-live-pulse" />
                Real
              </span>
            </div>
            <span className="mobile-brand-sub">Financial OS</span>
          </div>
        </div>

        <div className="mobile-bar-actions">
          {/* Refresh Button with Micro-Animation */}
          <button
            className={`mobile-icon-action ${isRefreshing ? 'spinning' : ''}`}
            onClick={handleRefreshClick}
            title="Muat Ulang Data"
            aria-label="Muat Ulang Data"
          >
            <RefreshCw size={14} />
          </button>

          {/* Currency Switcher Pill */}
          <button
            className="mobile-pill-action"
            onClick={toggleCurrency}
            title="Ubah Mata Uang (IDR / USD)"
          >
            {currency}
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            className="mobile-icon-action"
            onClick={toggleTheme}
            title="Ganti Tema Tampilan"
            aria-label="Ganti Tema"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Top Mobile View Segmented Switcher (Quick Tap or Swipe) */}
      <div className="mobile-segmented-tab" role="tablist">
        <button
          className={`mobile-seg-item ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentTab('dashboard')}
          role="tab"
          aria-selected={currentTab === 'dashboard'}
        >
          <span>📊 Ringkasan Saldo</span>
        </button>
        <button
          className={`mobile-seg-item ${currentTab === 'upload' ? 'active' : ''}`}
          onClick={() => setCurrentTab('upload')}
          role="tab"
          aria-selected={currentTab === 'upload'}
        >
          <span>📥 Smart Upload & Scan</span>
        </button>
      </div>

      {/* 2. Primary Mobile Balance Card */}
      <section className="mobile-balance-card">
        <div className="mobile-balance-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wallet size={15} />
            <span className="mobile-balance-label">Total Saldo Bersih</span>
          </div>
          <div className="mobile-status-indicator">
            <span className="mobile-status-dot" />
            <span>Realtime Data</span>
          </div>
        </div>

        <div className="mobile-balance-amount num">
          {formatCurrency(totalBalance, currency)}
        </div>

        {/* Savings Rate Indicator */}
        {totalIncome > 0 && (
          <div className="mobile-savings-badge">
            <TrendingUp size={12} />
            <span>Savings Rate: {savingsRate}% dari pemasukan</span>
          </div>
        )}

        {/* Inflow & Outflow horizontal pills */}
        <div className="mobile-flow-grid">
          <div className="mobile-flow-pill income">
            <div className="mobile-flow-icon">
              <ArrowUpRight size={15} strokeWidth={2.6} />
            </div>
            <div>
              <div className="mobile-flow-title">Pemasukan</div>
              <div className="mobile-flow-num num">{formatCurrency(totalIncome, currency)}</div>
            </div>
          </div>

          <div className="mobile-flow-pill expense">
            <div className="mobile-flow-icon">
              <ArrowDownRight size={15} strokeWidth={2.6} />
            </div>
            <div>
              <div className="mobile-flow-title">Pengeluaran</div>
              <div className="mobile-flow-num num">{formatCurrency(totalExpense, currency)}</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Mobile Quick Actions Grid */}
      <section className="mobile-quick-actions">
        <button
          className="mobile-action-pill primary"
          onClick={onOpenAddModal}
          title="Catat Transaksi Manual"
        >
          <Plus size={16} strokeWidth={2.6} />
          <span>Catat Transaksi</span>
        </button>

        <button
          className="mobile-action-pill secondary"
          onClick={onOpenUpload}
          title="Buka Smart Scan & Receipt Hub"
        >
          <UploadCloud size={16} strokeWidth={2.4} />
          <span>Scan Struk</span>
        </button>

        <button
          className="mobile-action-pill secondary"
          onClick={onOpenSimulator}
          title="Buka WhatsApp AI Bot Simulator"
        >
          <Send size={15} strokeWidth={2.4} />
          <span>WA Bot</span>
        </button>
      </section>

      {/* 4. Category Expense Breakdown (Interactive Chips & Bars) */}
      {categoryBreakdown.length > 0 && (
        <section className="mobile-category-card">
          <div className="mobile-section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <PieChart size={16} color="var(--accent-blue)" />
              <h2 className="mobile-section-title">Alokasi Pengeluaran</h2>
            </div>
            <span className="mobile-section-sub">
              {selectedCategory ? (
                <button
                  className="mobile-clear-cat-btn"
                  onClick={() => setSelectedCategory(null)}
                  title="Tampilkan semua kategori"
                >
                  Reset Filter ✕
                </button>
              ) : (
                `${categoryBreakdown.length} Kategori`
              )}
            </span>
          </div>

          <div className="mobile-category-list">
            {categoryBreakdown.slice(0, 5).map((cat, idx) => {
              const isSelected = selectedCategory === cat.category;
              const emoji = getCategoryEmoji(cat.category);
              const barColor = ['#0066FF', '#FF4726', '#10B981', '#F59E0B', '#8B5CF6'][idx % 5];

              return (
                <div
                  key={cat.category}
                  className={`mobile-category-item ${isSelected ? 'active-cat' : ''}`}
                  onClick={() => setSelectedCategory(isSelected ? null : cat.category)}
                  title={`Klik untuk filter transaksi ${cat.category}`}
                >
                  <div className="mobile-category-top">
                    <span className="mobile-cat-name">
                      <span className="mobile-cat-emoji">{emoji}</span>
                      {cat.category}
                    </span>
                    <span className="mobile-cat-val num">
                      {formatCurrency(cat.amount, currency)} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="mobile-cat-track">
                    <div
                      className="mobile-cat-fill"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: barColor
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Mobile Recent Transactions Feed with Search & Filter Chips */}
      <section className="mobile-feed-section">
        <div className="mobile-section-header">
          <div>
            <h2 className="mobile-section-title">Transaksi Terkini</h2>
            <span className="mobile-section-sub">
              {filteredList.length} dari {transactionCount} catatan
            </span>
          </div>

          {/* Quick Filter Pill Buttons */}
          <div className="mobile-filter-chips">
            <button
              className={`mobile-filter-chip ${mobileFilter === 'all' ? 'active' : ''}`}
              onClick={() => setMobileFilter('all')}
            >
              Semua
            </button>
            <button
              className={`mobile-filter-chip ${mobileFilter === 'expense' ? 'active' : ''}`}
              onClick={() => setMobileFilter('expense')}
            >
              Keluar
            </button>
            <button
              className={`mobile-filter-chip ${mobileFilter === 'income' ? 'active' : ''}`}
              onClick={() => setMobileFilter('income')}
            >
              Masuk
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="mobile-search-bar">
          <Search size={14} className="mobile-search-icon" />
          <input
            type="text"
            className="mobile-search-input"
            placeholder="Cari transaksi, toko, kategori..."
            value={mobileSearch}
            onChange={e => setMobileSearch(e.target.value)}
          />
          {mobileSearch && (
            <button
              className="mobile-search-clear"
              onClick={() => setMobileSearch('')}
              title="Hapus pencarian"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Selected Category Tag Banner (if filtered via Category) */}
        {selectedCategory && (
          <div className="mobile-active-filter-banner">
            <span>Filter Kategori: <strong>{selectedCategory}</strong></span>
            <button onClick={() => setSelectedCategory(null)}>
              <X size={12} />
            </button>
          </div>
        )}

        {/* Transactions Feed List */}
        {filteredList.length === 0 ? (
          <div className="mobile-empty-card">
            <div className="mobile-empty-circle">
              <Inbox size={26} color="var(--accent-blue)" />
            </div>
            <h3 className="mobile-empty-heading">
              {mobileSearch || selectedCategory || mobileFilter !== 'all'
                ? 'Tidak Ada Transaksi Cocok'
                : 'Belum Ada Transaksi Real'}
            </h3>
            <p className="mobile-empty-desc">
              {mobileSearch || selectedCategory || mobileFilter !== 'all'
                ? 'Coba ganti kata kunci pencarian atau bersihkan filter di atas.'
                : 'Data kamu bersih dari data dummy. Tekan tombol di bawah untuk mencatat pengeluaran atau pemasukan pertamamu!'}
            </p>
            {mobileSearch || selectedCategory || mobileFilter !== 'all' ? (
              <button
                className="btn btn-secondary cartoon-pill-btn"
                onClick={() => {
                  setMobileSearch('');
                  setSelectedCategory(null);
                  setMobileFilter('all');
                }}
              >
                Reset Semua Filter
              </button>
            ) : (
              <button
                className="btn btn-primary cartoon-tactile-btn"
                onClick={onOpenAddModal}
                style={{ margin: '0 auto', width: '100%' }}
              >
                <Plus size={16} strokeWidth={2.6} />
                <span>➕ Catat Transaksi Baru</span>
              </button>
            )}
          </div>
        ) : (
          <div className="mobile-tx-list">
            {filteredList.map(tx => {
              const isIncome = tx.type === 'income';
              const emoji = getCategoryEmoji(tx.category);

              return (
                <div key={tx.id} className="mobile-tx-card">
                  <div className="mobile-tx-left">
                    <div className={`mobile-tx-icon-badge ${tx.type}`}>
                      <span className="mobile-tx-emoji">{emoji}</span>
                    </div>
                    <div className="mobile-tx-info">
                      <div className="mobile-tx-desc">
                        {tx.description || (isIncome ? 'Pemasukan' : 'Pengeluaran')}
                      </div>
                      <div className="mobile-tx-meta">
                        <span className="mobile-cat-pill">{tx.category}</span>
                        <span>•</span>
                        <span>{tx.payment_method}</span>
                        <span>•</span>
                        <span>{formatDateTime(tx.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mobile-tx-right">
                    <div className={`mobile-tx-amount num ${isIncome ? 'income' : 'expense'}`}>
                      {isIncome ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                    </div>
                    <button
                      className="mobile-tx-del-btn"
                      onClick={() => onDeleteTransaction(tx.id)}
                      title="Hapus transaksi dari database"
                      aria-label="Hapus transaksi"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}


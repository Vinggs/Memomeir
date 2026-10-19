import React from 'react';
import {
  Search,
  Trash2,
  Inbox,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from 'lucide-react';
import { formatCurrency, formatDateTime, formatTime } from '../utils/formatters.js';

// Helper emoji for categories
function getCatEmoji(catName = '') {
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

export default function TransactionTable({
  transactions = [],
  filterType,
  setFilterType,
  searchQuery,
  setSearchQuery,
  onDeleteTransaction,
  onOpenAddModal,
  currency = 'IDR'
}) {
  return (
    <section className="transactions-section">
      <div className="transactions-toolbar">
        <div className="toolbar-title-wrap">
          <h2 className="toolbar-title">Riwayat Transaksi</h2>
          <span className="toolbar-count">
            {transactions.length} transaksi tercatat
          </span>
        </div>

        <div className="toolbar-controls">
          {/* Real-time search */}
          <div className="search-box">
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Cari catatan, kategori, atau metode bayar..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="filter-tabs">
            <button
              className={`filter-tab-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              Semua
            </button>
            <button
              className={`filter-tab-btn ${filterType === 'expense' ? 'active' : ''}`}
              onClick={() => setFilterType('expense')}
            >
              Pengeluaran
            </button>
            <button
              className={`filter-tab-btn ${filterType === 'income' ? 'active' : ''}`}
              onClick={() => setFilterType('income')}
            >
              Pemasukan
            </button>
          </div>
        </div>
      </div>

      <div className="table-responsive">
        {transactions.length === 0 ? (
          <div className="empty-state" style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div className="empty-state-icon" style={{ width: 54, height: 54, margin: '0 auto 12px' }}>
              <Inbox size={26} color="var(--accent-blue)" />
            </div>
            <div className="empty-state-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
              Belum Ada Transaksi
            </div>
            <p className="empty-state-text" style={{ maxWidth: 420, margin: '6px auto 18px', color: 'var(--text-muted)' }}>
              {searchQuery
                ? `Tidak ada transaksi yang cocok dengan kata kunci "${searchQuery}".`
                : 'Mulai catat transaksi pertama Anda lewat form web, scan struk belanja, atau kirim chat ke bot WhatsApp!'}
            </p>
            {onOpenAddModal && (
              <button
                className="btn btn-primary cartoon-tactile-btn"
                onClick={onOpenAddModal}
                style={{ margin: '0 auto' }}
              >
                <span>➕ Catat Transaksi Baru</span>
              </button>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal & Waktu</th>
                <th>Catatan / Keterangan</th>
                <th>Kategori</th>
                <th>Metode Bayar</th>
                <th>Jenis</th>
                <th style={{ textAlign: 'right' }}>Nominal</th>
                <th style={{ width: 48, textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => {
                const isIncome = tx.type === 'income';
                const emoji = getCatEmoji(tx.category);
                return (
                  <tr key={tx.id}>
                    <td>
                      <div className="tx-date-wrap">
                        <span className="tx-date-primary">{formatDateTime(tx.date)}</span>
                        <span className="tx-date-sub">{formatTime(tx.date)}</span>
                      </div>
                    </td>

                    <td>
                      <div className="tx-desc-cell">
                        <span className="tx-desc-text" title={tx.description || '—'}>
                          {tx.description || <span style={{ color: 'var(--text-muted)' }}>Tanpa keterangan</span>}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="tag-badge">
                        <span style={{ marginRight: 5 }}>{emoji}</span>
                        {tx.category}
                      </span>
                    </td>

                    <td>
                      <span className="tag-badge" style={{ fontStyle: 'normal' }}>
                        {tx.payment_method}
                      </span>
                    </td>

                    <td>
                      <span className={`type-pill ${isIncome ? 'income' : 'expense'}`}>
                        {isIncome ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        {isIncome ? 'Pemasukan' : 'Pengeluaran'}
                      </span>
                    </td>

                    <td>
                      <span className={`amount-text ${isIncome ? 'income' : 'expense'} num`}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                      </span>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="tx-actions-btn"
                        onClick={() => onDeleteTransaction(tx.id)}
                        title="Hapus transaksi dari database"
                        aria-label="Hapus transaksi"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

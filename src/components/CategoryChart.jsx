import React, { useState } from 'react';
import { BarChart3, ListFilter, CreditCard } from 'lucide-react';
import { formatCurrency } from '../utils/formatters.js';

// Map category name to clean emoji
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
  return '🏷️';
}

export default function CategoryChart({
  categoryBreakdown = [],
  paymentMethodStats = {},
  totalExpense = 0,
  currency = 'IDR'
}) {
  const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'list'

  const maxCategoryAmount = categoryBreakdown.length > 0
    ? Math.max(...categoryBreakdown.map(c => c.amount))
    : 1;

  // Harmonious palette
  const chartPalette = [
    '#0066FF',
    '#FF6B4A',
    '#10B981',
    '#FBBF24',
    '#8B5CF6',
    '#06B6D4',
    '#EC4899'
  ];

  return (
    <section className="analytics-grid">
      {/* 1. Alokasi Pengeluaran per Kategori */}
      <div className="card chart-card">
        <div className="chart-card-header">
          <div>
            <h3 className="chart-title">Pengeluaran per Kategori</h3>
            <span className="chart-subtitle">Alokasi pembagian pengeluaran Anda</span>
          </div>

          <div className="filter-tabs">
            <button
              className={`filter-tab-btn ${viewMode === 'chart' ? 'active' : ''}`}
              onClick={() => setViewMode('chart')}
              title="Tampilan Grafik Batang"
            >
              <BarChart3 size={13} style={{ marginRight: 4 }} />
              Grafik
            </button>
            <button
              className={`filter-tab-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Tampilan Rincian Baris"
            >
              <ListFilter size={13} style={{ marginRight: 4 }} />
              Rincian
            </button>
          </div>
        </div>

        {categoryBreakdown.length === 0 ? (
          <div className="empty-state" style={{ padding: '36px 12px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: 'var(--accent-blue)' }}>
              <BarChart3 size={20} />
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Belum Ada Pengeluaran
            </div>
            <p className="empty-state-text" style={{ fontSize: '0.76rem', color: 'var(--text-muted)', maxWidth: 280, margin: '4px auto 0' }}>
              Grafik alokasi kategori akan otomatis terisi saat transaksi pengeluaran dicatat.
            </p>
          </div>
        ) : viewMode === 'chart' ? (
          /* Visual Bar Chart */
          <div>
            <div className="chart-container-visual">
              {categoryBreakdown.map((item, index) => {
                const heightPercent = Math.max(14, Math.round((item.amount / maxCategoryAmount) * 100));
                const emoji = getCategoryEmoji(item.category);
                return (
                  <div key={item.category} className="chart-col">
                    <div
                      className="chart-col-bar"
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: chartPalette[index % chartPalette.length]
                      }}
                    >
                      <div className="chart-col-bar-tooltip">
                        <div style={{ fontWeight: 700 }}>{emoji} {item.category}</div>
                        <div>{formatCurrency(item.amount, currency)} ({item.percentage}%)</div>
                      </div>
                    </div>
                    <span className="chart-col-label" title={item.category}>
                      {emoji} {item.category}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quick Summary Pill Row underneath chart */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
              {categoryBreakdown.slice(0, 4).map((item, idx) => (
                <div key={item.category} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem' }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 3,
                      border: '1.5px solid var(--border-strong)',
                      background: chartPalette[idx % chartPalette.length]
                    }}
                  />
                  <span style={{ color: 'var(--text-muted)' }}>{item.category}:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Detailed Category Progress Meters */
          <div className="category-bars-list">
            {categoryBreakdown.map((item, index) => (
              <div key={item.category} className="category-bar-item">
                <div className="category-bar-info">
                  <div className="category-bar-label">
                    <span style={{ fontSize: '1rem', marginRight: 6 }}>
                      {getCategoryEmoji(item.category)}
                    </span>
                    <span>{item.category}</span>
                  </div>
                  <div className="category-bar-amount num">
                    {formatCurrency(item.amount, currency)}
                    <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: '0.72rem' }}>
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>
                <div className="category-bar-track">
                  <div
                    className="category-bar-fill"
                    style={{
                      width: `${item.percentage}%`,
                      background: chartPalette[index % chartPalette.length]
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Metode Pembayaran Terbanyak */}
      <div className="card">
        <div className="chart-card-header">
          <div>
            <h3 className="chart-title">Metode Pembayaran</h3>
            <span className="chart-subtitle">Kanal pembayaran yang paling sering digunakan</span>
          </div>
          <div className="card-icon-badge">
            <CreditCard size={15} />
          </div>
        </div>

        <div className="flow-breakdown-list">
          {Object.keys(paymentMethodStats).length === 0 ? (
            <p className="empty-state-text" style={{ padding: '24px 0', textAlign: 'center' }}>
              Belum ada riwayat pembayaran.
            </p>
          ) : (
            Object.entries(paymentMethodStats)
              .sort((a, b) => b[1] - a[1])
              .map(([method, amount]) => {
                const pct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
                return (
                  <div key={method} className="flow-breakdown-item">
                    <div>
                      <div className="flow-method-name">{method}</div>
                      <div className="flow-method-sub">{pct}% dari total pengeluaran</div>
                    </div>
                    <div className="amount-val num" style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                      {formatCurrency(amount, currency)}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </section>
  );
}

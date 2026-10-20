import React, { useState } from 'react';
import {
  PieChart as PieIcon,
  BarChart3,
  ListFilter,
  CreditCard,
  QrCode,
  Banknote,
  Building2,
  Smartphone
} from 'lucide-react';
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

// Payment method metadata for modern icon & color badge
function getPaymentMethodMeta(method = '') {
  const lower = method.toLowerCase();
  if (lower.includes('credit') || lower.includes('kredit')) {
    return {
      icon: <CreditCard size={15} />,
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.12)'
    };
  }
  if (lower.includes('cash') || lower.includes('tunai')) {
    return {
      icon: <Banknote size={15} />,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.12)'
    };
  }
  if (lower.includes('qris')) {
    return {
      icon: <QrCode size={15} />,
      color: '#06B6D4',
      bg: 'rgba(6, 182, 212, 0.12)'
    };
  }
  if (
    lower.includes('mandiri') ||
    lower.includes('bca') ||
    lower.includes('bni') ||
    lower.includes('bri') ||
    lower.includes('bank') ||
    lower.includes('transfer')
  ) {
    return {
      icon: <Building2 size={15} />,
      color: '#0066FF',
      bg: 'rgba(0, 102, 255, 0.12)'
    };
  }
  if (
    lower.includes('gopay') ||
    lower.includes('ovo') ||
    lower.includes('dana') ||
    lower.includes('shopeepay') ||
    lower.includes('wallet')
  ) {
    return {
      icon: <Smartphone size={15} />,
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.12)'
    };
  }
  return {
    icon: <CreditCard size={15} />,
    color: '#6B7280',
    bg: 'rgba(107, 114, 128, 0.12)'
  };
}

export default function CategoryChart({
  categoryBreakdown = [],
  paymentMethodStats = {},
  totalExpense = 0,
  currency = 'IDR'
}) {
  const [viewMode, setViewMode] = useState('donut'); // 'donut' | 'bar' | 'list'
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const maxCategoryAmount = categoryBreakdown.length > 0
    ? Math.max(...categoryBreakdown.map(c => c.amount))
    : 1;

  // Harmonious curated palette
  const chartPalette = [
    '#0066FF', // Electric Royal Blue
    '#FF6B4A', // Vibrant Coral
    '#10B981', // Emerald Mint
    '#FBBF24', // Warm Amber
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#3B82F6'  // Sky Blue
  ];

  // SVG Donut calculation constants
  const donutSize = 220;
  const strokeWidth = 26;
  const radius = (donutSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Pre-calculate slices
  let accumulatedOffset = 0;
  const slices = categoryBreakdown.map((item, index) => {
    const slicePercent = item.percentage;
    const sliceLength = (slicePercent / 100) * circumference;
    const offset = accumulatedOffset;
    accumulatedOffset += sliceLength;
    return {
      ...item,
      color: chartPalette[index % chartPalette.length],
      sliceLength,
      offset,
      emoji: getCategoryEmoji(item.category)
    };
  });

  const activeHoveredItem = hoveredIndex !== null ? slices[hoveredIndex] : null;

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
              className={`filter-tab-btn ${viewMode === 'donut' ? 'active' : ''}`}
              onClick={() => setViewMode('donut')}
              title="Grafik Donat / Lingkaran"
            >
              <PieIcon size={13} style={{ marginRight: 4 }} />
              Donat
            </button>
            <button
              className={`filter-tab-btn ${viewMode === 'bar' ? 'active' : ''}`}
              onClick={() => setViewMode('bar')}
              title="Grafik Batang"
            >
              <BarChart3 size={13} style={{ marginRight: 4 }} />
              Batang
            </button>
            <button
              className={`filter-tab-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Rincian Baris"
            >
              <ListFilter size={13} style={{ marginRight: 4 }} />
              Rincian
            </button>
          </div>
        </div>

        {categoryBreakdown.length === 0 ? (
          <div className="empty-state" style={{ padding: '42px 12px', textAlign: 'center' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--bg-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: 'var(--accent-blue)'
              }}
            >
              <PieIcon size={22} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              Belum Ada Pengeluaran
            </div>
            <p
              className="empty-state-text"
              style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 290, margin: '6px auto 0' }}
            >
              Grafik alokasi kategori akan otomatis terbentuk saat Anda mencatat transaksi pengeluaran.
            </p>
          </div>
        ) : viewMode === 'donut' ? (
          /* ==============================================================
             1. MODERN DONUT CHART (Interactive SVG + Legend)
             ============================================================== */
          <div className="donut-chart-wrapper">
            {/* Donut SVG Ring */}
            <div className="donut-svg-container">
              <svg width={donutSize} height={donutSize} viewBox={`0 0 ${donutSize} ${donutSize}`}>
                {/* Background Ring Track */}
                <circle
                  cx={donutSize / 2}
                  cy={donutSize / 2}
                  r={radius}
                  fill="none"
                  stroke="var(--bg-subtle)"
                  strokeWidth={strokeWidth}
                />

                {/* Slices */}
                {categoryBreakdown.length === 1 ? (
                  // Exactly 1 category: clean 100% full circle
                  <circle
                    cx={donutSize / 2}
                    cy={donutSize / 2}
                    r={radius}
                    fill="none"
                    stroke={slices[0].color}
                    strokeWidth={hoveredIndex === 0 ? strokeWidth + 4 : strokeWidth}
                    transform={`rotate(-90 ${donutSize / 2} ${donutSize / 2})`}
                    style={{
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={() => setHoveredIndex(0)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                ) : (
                  // Multiple categories: segmented arcs
                  slices.map((slice, idx) => {
                    const isHovered = hoveredIndex === idx;
                    // Leave tiny 3px visual gap between slices if > 1 slice
                    const dashLength = Math.max(0, slice.sliceLength - 3);
                    return (
                      <circle
                        key={slice.category}
                        cx={donutSize / 2}
                        cy={donutSize / 2}
                        r={radius}
                        fill="none"
                        stroke={slice.color}
                        strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                        strokeDasharray={`${dashLength} ${circumference}`}
                        strokeDashoffset={-slice.offset}
                        transform={`rotate(-90 ${donutSize / 2} ${donutSize / 2})`}
                        style={{
                          transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                          cursor: 'pointer',
                          filter: isHovered ? 'drop-shadow(0 4px 10px rgba(0, 102, 255, 0.35))' : 'none'
                        }}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      />
                    );
                  })
                )}
              </svg>

              {/* Dynamic Center Display */}
              <div className="donut-center-info">
                {activeHoveredItem ? (
                  <>
                    <span className="donut-center-emoji">{activeHoveredItem.emoji}</span>
                    <span className="donut-center-title" title={activeHoveredItem.category}>
                      {activeHoveredItem.category}
                    </span>
                    <span className="donut-center-val num">
                      {formatCurrency(activeHoveredItem.amount, currency)}
                    </span>
                    <span
                      className="donut-center-badge"
                      style={{ color: activeHoveredItem.color }}
                    >
                      {activeHoveredItem.percentage}% dari total
                    </span>
                  </>
                ) : (
                  <>
                    <span className="donut-center-sub">Total Keluar</span>
                    <span className="donut-center-val num">
                      {formatCurrency(totalExpense, currency)}
                    </span>
                    <span className="donut-center-tag">
                      {categoryBreakdown.length} Kategori
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Interactive Legend List */}
            <div className="donut-legend-list">
              {slices.map((slice, index) => {
                const isHovered = hoveredIndex === index;
                return (
                  <div
                    key={slice.category}
                    className={`donut-legend-item ${isHovered ? 'active' : ''}`}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <div className="donut-legend-left">
                      <span className="donut-legend-dot" style={{ backgroundColor: slice.color }} />
                      <span className="donut-legend-emoji">{slice.emoji}</span>
                      <span className="donut-legend-name" title={slice.category}>
                        {slice.category}
                      </span>
                    </div>
                    <div className="donut-legend-right">
                      <span className="donut-legend-amount num">
                        {formatCurrency(slice.amount, currency)}
                      </span>
                      <span
                        className="donut-legend-pct"
                        style={{
                          backgroundColor: `${slice.color}20`,
                          color: slice.color
                        }}
                      >
                        {slice.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'bar' ? (
          /* ==============================================================
             2. MODERN BAR CHART WITH FLOATING POPUP TOOLTIPS
             ============================================================== */
          <div>
            <div className="chart-container-visual">
              {categoryBreakdown.map((item, index) => {
                const heightPercent = Math.max(16, Math.round((item.amount / maxCategoryAmount) * 100));
                const emoji = getCategoryEmoji(item.category);
                const color = chartPalette[index % chartPalette.length];

                return (
                  <div key={item.category} className="chart-col">
                    {/* Floating Tooltip positioned cleanly ABOVE the bar */}
                    <div className="chart-col-bar-tooltip">
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{emoji}</span> {item.category}
                      </div>
                      <div className="num" style={{ marginTop: 2 }}>
                        {formatCurrency(item.amount, currency)} ({item.percentage}%)
                      </div>
                    </div>

                    {/* Bar Pillar */}
                    <div
                      className="chart-col-bar"
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: color
                      }}
                    >
                      <span className="chart-col-pct-tag">{item.percentage}%</span>
                    </div>

                    {/* Label underneath */}
                    <div className="chart-col-label" title={item.category}>
                      <span style={{ fontSize: '1.1rem' }}>{emoji}</span>
                      <span>{item.category}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Summary Pill Row */}
            <div style={{ display: 'flex', gap: '14px', marginTop: '16px', flexWrap: 'wrap' }}>
              {categoryBreakdown.map((item, idx) => (
                <div
                  key={item.category}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.76rem',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    background: 'var(--bg-subtle)'
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: chartPalette[idx % chartPalette.length]
                    }}
                  />
                  <span style={{ color: 'var(--text-secondary)' }}>{item.category}:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ==============================================================
             3. DETAILED CATEGORY PROGRESS METERS
             ============================================================== */
          <div className="category-bars-list">
            {categoryBreakdown.map((item, index) => {
              const color = chartPalette[index % chartPalette.length];
              return (
                <div key={item.category} className="category-bar-item">
                  <div className="category-bar-info">
                    <div className="category-bar-label">
                      <span style={{ fontSize: '1.1rem', marginRight: 4 }}>
                        {getCategoryEmoji(item.category)}
                      </span>
                      <span>{item.category}</span>
                    </div>
                    <div className="category-bar-amount num">
                      {formatCurrency(item.amount, currency)}
                      <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.74rem' }}>
                        ({item.percentage}%)
                      </span>
                    </div>
                  </div>
                  <div className="category-bar-track">
                    <div
                      className="category-bar-fill"
                      style={{
                        width: `${item.percentage}%`,
                        background: color
                      }}
                    />
                  </div>
                </div>
              );
            })}
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
          <div className="card-icon-badge" style={{ background: 'var(--bg-subtle)', color: 'var(--accent-blue)' }}>
            <CreditCard size={15} />
          </div>
        </div>

        <div className="flow-breakdown-list">
          {Object.keys(paymentMethodStats).length === 0 ? (
            <p className="empty-state-text" style={{ padding: '36px 0', textAlign: 'center' }}>
              Belum ada riwayat pembayaran tercatat.
            </p>
          ) : (
            Object.entries(paymentMethodStats)
              .sort((a, b) => b[1] - a[1])
              .map(([method, amount]) => {
                const pct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
                const meta = getPaymentMethodMeta(method);

                return (
                  <div key={method} className="flow-breakdown-item">
                    <div className="flow-item-top">
                      <div className="flow-item-left">
                        <div
                          className="flow-method-badge"
                          style={{
                            backgroundColor: meta.bg,
                            color: meta.color
                          }}
                        >
                          {meta.icon}
                        </div>
                        <div>
                          <div className="flow-method-name">{method}</div>
                          <div className="flow-method-sub">{pct}% dari total pengeluaran</div>
                        </div>
                      </div>

                      <div className="amount-val num" style={{ fontWeight: 800, fontSize: '0.92rem' }}>
                        {formatCurrency(amount, currency)}
                      </div>
                    </div>

                    {/* Visual Progress Bar Track */}
                    <div className="flow-track">
                      <div
                        className="flow-fill"
                        style={{
                          width: `${Math.min(100, Math.max(6, pct))}%`,
                          backgroundColor: meta.color
                        }}
                      />
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

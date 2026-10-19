import React from 'react';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Calendar
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters.js';

export default function SummaryCards({ summary = {}, currency = 'IDR' }) {
  const {
    totalBalance = 0,
    monthlyExpense = 0,
    monthlyIncome = 0,
    savingsRate = 0,
    transactionCount = 0
  } = summary;

  const isBalancePositive = totalBalance >= 0;

  return (
    <section className="summary-grid">
      {/* 1. Total Saldo Bersih */}
      <div className="card">
        <div className="card-header-line">
          <span className="card-label">Total Saldo Bersih</span>
          <div className="card-icon-badge" style={{ background: 'var(--accent-blue)', color: '#FFFFFF' }}>
            <Wallet size={16} strokeWidth={2.4} />
          </div>
        </div>
        <div className="card-main-val num">
          {formatCurrency(totalBalance, currency)}
        </div>
        <div className="card-subtext">
          {transactionCount === 0 ? (
            <span className="pill-delta neutral">
              <TrendingUp size={12} strokeWidth={2.4} />
              Siap Digunakan
            </span>
          ) : (
            <span className={`pill-delta ${isBalancePositive ? 'positive' : 'negative'}`}>
              {isBalancePositive ? <ArrowUpRight size={13} strokeWidth={2.5} /> : <ArrowDownRight size={13} strokeWidth={2.5} />}
              {isBalancePositive ? 'Surplus (Aman)' : 'Defisit (Minus)'}
            </span>
          )}
          <span>{transactionCount === 0 ? 'Belum ada transaksi dicatat' : 'Sisa dana riil saat ini'}</span>
        </div>
      </div>

      {/* 2. Pengeluaran Bulan Ini */}
      <div className="card">
        <div className="card-header-line">
          <span className="card-label">Pengeluaran Bulan Ini</span>
          <div className="card-icon-badge" style={{ background: 'var(--expense-bg)', color: 'var(--expense-color)' }}>
            <ArrowDownRight size={16} strokeWidth={2.4} />
          </div>
        </div>
        <div className="card-main-val num" style={{ color: 'var(--text-primary)' }}>
          {formatCurrency(monthlyExpense, currency)}
        </div>
        <div className="card-subtext">
          <span className="pill-delta neutral">
            <Calendar size={12} strokeWidth={2.4} />
            Bulan Ini
          </span>
          <span>Semua pengeluaran tercatat</span>
        </div>
      </div>

      {/* 3. Pemasukan Bulan Ini */}
      <div className="card">
        <div className="card-header-line">
          <span className="card-label">Pemasukan Bulan Ini</span>
          <div className="card-icon-badge" style={{ background: 'var(--income-bg)', color: 'var(--income-color)' }}>
            <ArrowUpRight size={16} strokeWidth={2.4} />
          </div>
        </div>
        <div className="card-main-val num" style={{ color: 'var(--income-color)' }}>
          {formatCurrency(monthlyIncome, currency)}
        </div>
        <div className="card-subtext">
          <span className="pill-delta positive">
            <TrendingUp size={12} strokeWidth={2.4} />
            Uang Masuk
          </span>
          <span>Gaji, transfer & pendapatan</span>
        </div>
      </div>

      {/* 4. Persentase Tabungan */}
      <div className="card">
        <div className="card-header-line">
          <span className="card-label">Tingkat Tabungan</span>
          <div className="card-icon-badge" style={{ background: '#FEF3C7', color: '#B45309' }}>
            <Percent size={15} strokeWidth={2.4} />
          </div>
        </div>
        <div className="card-main-val num">
          {savingsRate}%
        </div>
        <div className="card-subtext">
          <span className={`pill-delta ${savingsRate >= 30 ? 'positive' : savingsRate > 0 ? 'neutral' : 'negative'}`}>
            {transactionCount} transaksi
          </span>
          <span>{savingsRate >= 30 ? 'Keuangan sehat' : savingsRate > 0 ? 'Cukup terjaga' : 'Mulai menabung'}</span>
        </div>
      </div>
    </section>
  );
}

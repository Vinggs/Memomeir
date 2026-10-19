import React, { useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';

const COMMON_CATEGORIES = [
  'Food & Dining (🍔 Makanan & Minuman)',
  'Salary (💼 Gaji & Pemasukan)',
  'Transport (🚗 Transportasi & Bensin)',
  'Utilities (⚡ Listrik, Wifi, Pulsa)',
  'Shopping (🛍️ Belanja & Kebutuhan)',
  'Entertainment (🍿 Hiburan & Nongkrong)',
  'Health & Wellness (🏥 Kesehatan & Obat)',
  'Investments (📈 Investasi & Tabungan)',
  'Education (🎓 Pendidikan)',
  'Miscellaneous (📦 Lain-lain)'
];

const COMMON_PAYMENT_METHODS = [
  'BCA QRIS',
  'BCA Transfer',
  'Mandiri Livin',
  'GoPay',
  'OVO',
  'ShopeePay',
  'DANA',
  'Cash / Tunai',
  'Kartu Kredit',
  'Bot WhatsApp'
];


export default function AddTransactionModal({ isOpen, onClose, onTransactionCreated }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(COMMON_CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState(COMMON_PAYMENT_METHODS[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addNominal = val => {
    const current = parseInt(amount, 10) || 0;
    setAmount(String(current + val));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Masukkan nominal transaksi yang valid (lebih dari 0).');
      return;
    }

    try {
      setLoading(true);
      // Clean category to canonical name (before parentheses)
      const cleanCategory = category.split(' (')[0].trim();

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount: numAmount,
          category: cleanCategory,
          payment_method: paymentMethod,
          description: description.trim() || (type === 'expense' ? 'Pengeluaran' : 'Pemasukan'),
          date: new Date(date).toISOString()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mencatat transaksi');
      }

      if (onTransactionCreated) {
        onTransactionCreated(data.transaction);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const parsedAmount = parseInt(amount, 10);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div className="modal-title">
            <Plus size={18} />
            <span>Catat Transaksi Real Baru</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, background: 'var(--expense-bg)', border: '1px solid var(--expense-border)', color: 'var(--expense-color)', fontSize: '0.8rem' }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector (expense vs income) */}
          <div className="form-group">
            <label className="form-label">Jenis Transaksi</label>
            <div className="filter-tabs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <button
                type="button"
                className={`filter-tab-btn ${type === 'expense' ? 'active' : ''}`}
                onClick={() => setType('expense')}
                style={{ textAlign: 'center', padding: '10px', fontWeight: 600 }}
              >
                💸 Pengeluaran (Expense)
              </button>
              <button
                type="button"
                className={`filter-tab-btn ${type === 'income' ? 'active' : ''}`}
                onClick={() => setType('income')}
                style={{ textAlign: 'center', padding: '10px', fontWeight: 600 }}
              >
                💰 Pemasukan (Income)
              </button>
            </div>
          </div>

          {/* Amount (Integer) */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Nominal (Rupiah)</label>
              {!isNaN(parsedAmount) && parsedAmount > 0 && (
                <span style={{ fontSize: '0.78rem', color: type === 'expense' ? 'var(--expense-color)' : 'var(--income-color)', fontWeight: 700 }}>
                  Rp {parsedAmount.toLocaleString('id-ID')}
                </span>
              )}
            </div>
            <input
              type="number"
              step="1"
              min="0"
              required
              className="form-input num"
              placeholder="Contoh: 50000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ fontSize: '1.1rem', fontWeight: 700 }}
            />
            {/* Quick Nominal Presets */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {[10000, 25000, 50000, 100000, 500000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => addNominal(val)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.72rem', borderRadius: 8 }}
                >
                  +{val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}rb`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount('')}
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.72rem', borderRadius: 8, color: 'var(--text-muted)' }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Category & Payment Method Row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <select
                className="form-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {COMMON_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Metode Pembayaran</label>
              <select
                className="form-select"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
              >
                {COMMON_PAYMENT_METHODS.map(pm => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Deskripsi / Catatan</label>
            <input
              type="text"
              className="form-input"
              placeholder="Contoh: Kopi Tuku & Toast, Beli Baju, Gaji Bulanan..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Date & Time */}
          <div className="form-group">
            <label className="form-label">Tanggal Transaksi</label>
            <input
              type="datetime-local"
              className="form-input num"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="btn btn-secondary cartoon-pill-btn" onClick={onClose}>
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary cartoon-tactile-btn"
              disabled={loading}
              style={{ minWidth: 140 }}
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>{loading ? 'Menyimpan...' : 'Simpan Transaksi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

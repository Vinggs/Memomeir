import React, { useState } from 'react';
import { X, Database, CheckCircle, RefreshCcw, AlertTriangle } from 'lucide-react';

export default function DbStatusModal({ isOpen, onClose, dbStatus, onResetSeed }) {
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const [clearing, setClearing] = useState(false);
  const [clearDone, setClearDone] = useState(false);

  const isPostgres = dbStatus?.engine === 'postgres';

  const handleClear = async () => {
    if (!window.confirm('Yakin ingin mengosongkan semua transaksi? Data akan kembali ke Rp 0 untuk mulai data real.')) {
      return;
    }
    try {
      setClearing(true);
      const res = await fetch('/api/clear', { method: 'POST' });
      if (res.ok) {
        setClearDone(true);
        if (onResetSeed) onResetSeed();
        setTimeout(() => setClearDone(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClearing(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Isi database dengan data dummy percobaan?')) {
      return;
    }
    try {
      setResetting(true);
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        setResetDone(true);
        if (onResetSeed) onResetSeed();
        setTimeout(() => setResetDone(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div className="modal-title">
            <Database size={18} />
            <span>Status Database & Data Real</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, background: 'var(--income-bg)', border: '1px solid var(--income-border)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--income-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 700 }}>
              <CheckCircle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--income-color)', fontSize: '0.92rem' }}>
                Mode Data Real Aktif
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Database bersih tanpa data dummy. Siap mencatat transaksi riil Anda via aplikasi atau WhatsApp Bot.
              </div>
            </div>
          </div>

          {/* Action 1: Clear All Data */}
          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Manajemen Data</label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-subtle)', padding: 14, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Kosongkan Semua Transaksi
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Hapus seluruh catatan untuk reset saldo ke Rp 0 (Fresh Start).
                </div>
              </div>
              <button
                className="btn btn-secondary cartoon-pill-btn"
                onClick={handleClear}
                disabled={clearing}
                style={{ fontSize: '0.78rem', color: 'var(--expense-color)', borderColor: 'var(--expense-border)' }}
              >
                <RefreshCcw size={13} className={clearing ? 'pulse' : ''} />
                <span>{clearDone ? 'Dikosongkan!' : clearing ? 'Membersihkan...' : 'Kosongkan Data'}</span>
              </button>
            </div>
          </div>

          {/* Action 2: Optional Seed Data for testing */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', padding: 12, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Isi Data Dummy (Hanya Percobaan)
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Hanya gunakan jika ingin melihat tampilan grafik dengan data contoh.
                </div>
              </div>
              <button className="btn btn-secondary" onClick={handleReset} disabled={resetting} style={{ fontSize: '0.75rem', padding: '6px 10px' }}>
                <RefreshCcw size={12} className={resetting ? 'pulse' : ''} />
                <span>{resetDone ? 'Terisi!' : resetting ? 'Mengisi...' : 'Isi Dummy'}</span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Koneksi Database Engine</label>
            <div className="code-box" style={{ fontSize: '0.75rem' }}>
              Engine: {dbStatus?.engine === 'postgres' ? 'PostgreSQL (Cloud / Docker)' : 'Local JSON Store (Strict Schema)'}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, UserPlus, Trash2, Users, Phone, Check, Shield } from 'lucide-react';

const AVATAR_COLORS = [
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#10b981', // Green
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ef4444'  // Rose
];

export default function MemberModal({
  isOpen,
  onClose,
  users = [],
  onMemberUpdated,
  selectedUser,
  onSelectUser
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [color, setColor] = useState(AVATAR_COLORS[2]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama anggota wajib diisi');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim().replace(/[^0-9]/g, ''),
          color
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menambahkan anggota');
      }

      setName('');
      setPhone('');
      if (onMemberUpdated) onMemberUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (id, userName) => {
    if (id === 'farrel') {
      alert('Profil Farrel (Owner Utama) tidak dapat dihapus.');
      return;
    }
    if (!window.confirm(`Yakin ingin menghapus profil anggota "${userName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedUser === userName) {
          onSelectUser('all');
        }
        if (onMemberUpdated) onMemberUpdated();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menghapus');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div className="modal-title">
            <Users size={20} style={{ color: 'var(--accent-blue)' }} />
            <span>Kelola Profil Anggota & Pasangan</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Setiap anggota memiliki profil terpisah untuk pencatatan keuangan. Transaksi via WhatsApp dapat otomatis dicatat untuk anggota tertentu dengan tag (misal: <code>#amel</code>) atau melalui nomor HP anggota.
          </p>

          {/* Member List */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 10 }}>
              Daftar Anggota Saat Ini ({users.length})
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {users.map(u => {
                const isOwner = u.id === 'farrel';
                const isCurrent = selectedUser === u.name;

                return (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: isCurrent ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      background: 'var(--card-bg)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: u.color || '#3b82f6',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.95rem'
                        }}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                            {u.name}
                          </span>
                          {isOwner && (
                            <span style={{ fontSize: '0.68rem', padding: '2px 6px', background: '#e0f2fe', color: '#0369a1', borderRadius: 6, fontWeight: 700 }}>
                              Owner
                            </span>
                          )}
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            #{u.name.toLowerCase()}
                          </span>
                        </div>
                        {u.phone ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Phone size={11} />
                            <span>+{u.phone}</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                            Tanpa nomor HP (bisa pakai tag #{u.name.toLowerCase()})
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        className="btn btn-secondary cartoon-pill-btn"
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          background: isCurrent ? 'var(--accent-blue)' : undefined,
                          color: isCurrent ? '#fff' : undefined
                        }}
                        onClick={() => {
                          onSelectUser(u.name);
                          onClose();
                        }}
                      >
                        {isCurrent ? 'Aktif' : 'Pilih'}
                      </button>

                      {!isOwner && (
                        <button
                          className="tx-actions-btn"
                          onClick={() => handleDeleteMember(u.id, u.name)}
                          title={`Hapus anggota ${u.name}`}
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add New Member Form */}
          <form onSubmit={handleAddMember} style={{ borderTop: '1px solid var(--border-color)', paddingTop: 18 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 12 }}>
              Tambah Anggota Baru
            </label>

            {error && (
              <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, fontSize: '0.8rem', marginBottom: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Nama Anggota *
                </label>
                <input
                  type="text"
                  placeholder="Misal: Amel, Budi, Ibu"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  No. WhatsApp (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Misal: 628123456789"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Warna Avatar
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: c,
                      border: color === c ? '3px solid #000' : '2px solid #fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    {color === c && <Check size={14} color="#fff" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary cartoon-tactile-btn"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <UserPlus size={16} />
              <span>{loading ? 'Menambahkan...' : 'Simpan Anggota Baru'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

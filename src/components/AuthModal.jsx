import React, { useState } from 'react';
import {
  X,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUser
}) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleLogin = async e => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login gagal');
      }

      localStorage.setItem('memomeir_token', data.token);
      localStorage.setItem('memomeir_user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async e => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          phone: phone.trim().replace(/[^0-9]/g, ''),
          password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registrasi gagal');
      }

      localStorage.setItem('memomeir_token', data.token);
      localStorage.setItem('memomeir_user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (ident, pass) => {
    setTab('login');
    setIdentifier(ident);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 440, padding: 0, overflow: 'hidden' }}
      >
        {/* Header Hero */}
        <div
          style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            padding: '24px 24px 20px',
            color: '#ffffff',
            position: 'relative'
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(255,255,255,0.18)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, marginBottom: 10 }}>
            <ShieldCheck size={13} />
            <span>Multi-User System • Akun Terisolasi</span>
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>
            {tab === 'login' ? 'Masuk ke Akun Memomeir' : 'Buat Akun Pribadi Baru'}
          </h2>
          <p style={{ fontSize: '0.82rem', margin: 0, opacity: 0.9, lineHeight: 1.4 }}>
            {tab === 'login'
              ? 'Kelola transaksi & saldo Anda secara aman dan privat.'
              : 'Dapatkan buku kas terpisah dan sambungkan ke nomor WhatsApp Anda.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <button
            onClick={() => { setTab('login'); setError(null); }}
            style={{
              padding: '12px',
              border: 'none',
              background: tab === 'login' ? 'var(--card-bg)' : 'transparent',
              color: tab === 'login' ? 'var(--accent-blue)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              borderBottom: tab === 'login' ? '2px solid var(--accent-blue)' : 'none'
            }}
          >
            Masuk (Login)
          </button>
          <button
            onClick={() => { setTab('register'); setError(null); }}
            style={{
              padding: '12px',
              border: 'none',
              background: tab === 'register' ? 'var(--card-bg)' : 'transparent',
              color: tab === 'register' ? 'var(--accent-blue)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              borderBottom: tab === 'register' ? '2px solid var(--accent-blue)' : 'none'
            }}
          >
            Daftar Akun Baru
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: 10,
                fontSize: '0.82rem',
                marginBottom: 16,
                lineHeight: 1.4,
                border: '1px solid #fca5a5'
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {tab === 'login' ? (
            /* LOGIN FORM */
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: 5 }}>
                  Username atau Nomor HP
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: farrel atau 62813..."
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      borderRadius: 10,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: 5 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Masukkan password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 40px 9px 36px',
                      borderRadius: 10,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: 9,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary cartoon-tactile-btn"
                style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '0.92rem' }}
              >
                <LogIn size={16} />
                <span>{loading ? 'Memverifikasi...' : 'Masuk Sekarang'}</span>
              </button>

              {/* Quick Login Shortcut Chips */}
              <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
                  ⚡ Masuk Cepat Akun Terdaftar:
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => fillQuickAccount('farrel', 'farrel123')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 20,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5
                    }}
                  >
                    <span>👤 Farrel (Owner)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickAccount('amel', 'amel123')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 20,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5
                    }}
                  >
                    <span>🌸 Amel</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Farrel Arda"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.86rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="huruf kecil, misal: farrel"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.86rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    No. WhatsApp (HP)
                  </label>
                  <input
                    type="text"
                    placeholder="628123456789"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.86rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Password (min. 5 karakter) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={5}
                    placeholder="Buat password yang aman"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 40px 8px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.86rem'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: 8,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.4 }}>
                💡 <em>Nomor WhatsApp digunakan agar bot WhatsApp otomatis mencatat transaksi ke akun Anda saat Anda mengirim chat atau foto struk.</em>
              </p>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary cartoon-tactile-btn"
                style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '0.92rem' }}
              >
                <UserPlus size={16} />
                <span>{loading ? 'Mendaftarkan...' : 'Daftar Akun Baru'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

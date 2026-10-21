import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  Sun,
  Moon,
  Bot,
  ExternalLink,
  Copy,
  X,
  Key
} from 'lucide-react';

export default function AuthGate({
  onLoginSuccess,
  theme,
  toggleTheme
}) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Google OAuth 2.0 State
  const [googleClientId, setGoogleClientId] = useState(() => {
    return (
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      localStorage.getItem('memomeir_google_client_id') ||
      '357665105791-qv0gqf9uhhr37vhf7ghordnkds4og8ka.apps.googleusercontent.com'
    );
  });
  const [isGoogleSetupOpen, setIsGoogleSetupOpen] = useState(false);
  const [inputClientId, setInputClientId] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonRef = useRef(null);

  // Handle Google Credential Token from Google Identity Services
  const handleGoogleCredentialResponse = async response => {
    if (!response?.credential) return;
    setError(null);
    setGoogleLoading(true);

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal login dengan akun Google');
      }

      localStorage.setItem('memomeir_token', data.token);
      localStorage.setItem('memomeir_user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Initialize official Google Identity Services button if Client ID exists
  useEffect(() => {
    if (!googleClientId) return;

    let isMounted = true;
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id && isMounted) {
        clearInterval(interval);
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false
          });

          if (googleButtonRef.current) {
            googleButtonRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(
              googleButtonRef.current,
              {
                type: 'standard',
                theme: theme === 'dark' ? 'filled_black' : 'outline',
                size: 'large',
                text: 'continue_with',
                shape: 'pill',
                width: 320
              }
            );
          }
        } catch (err) {
          console.warn('[Memomeir Google Init Warn]:', err);
        }
      }
    }, 200);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [googleClientId, theme]);

  const handleSaveGoogleClientId = () => {
    if (!inputClientId.trim()) return;
    const cleanId = inputClientId.trim();
    localStorage.setItem('memomeir_google_client_id', cleanId);
    setGoogleClientId(cleanId);
    setIsGoogleSetupOpen(false);
  };

  const handleLogin = async e => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login gagal. Periksa email dan password Anda.');
      }

      localStorage.setItem('memomeir_token', data.token);
      localStorage.setItem('memomeir_user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
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
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Pendaftaran gagal');
      }

      localStorage.setItem('memomeir_token', data.token);
      localStorage.setItem('memomeir_user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-gate-wrapper">
      {/* Top Bar for Auth Screen */}
      <header className="auth-gate-header">
        <div className="auth-gate-brand">
          <div className="brand-logo-mark brand-logo-img-wrap" style={{ width: 36, height: 36 }}>
            <img src="/logo.png" alt="Memomeir Logo" className="brand-logo-img" />
          </div>
          <div>
            <span className="brand-title" style={{ fontSize: '1.05rem' }}>Memomeir</span>
            <span className="brand-sub" style={{ display: 'block', fontSize: '0.68rem' }}>
              Financial OS Pribadi & WhatsApp Bot
            </span>
          </div>
        </div>

        {toggleTheme && (
          <button
            className="btn btn-secondary cartoon-pill-btn"
            onClick={toggleTheme}
            title="Ganti Tema (Gelap / Terang)"
            style={{ padding: '6px 12px' }}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        )}
      </header>

      {/* Main Center Auth Container */}
      <main className="auth-gate-main">
        <div className="auth-gate-card">
          {/* Card Top Header */}
          <div className="auth-card-hero">
            <div className="auth-badge-pill">
              <ShieldCheck size={13} style={{ color: '#10b981' }} />
              <span>Sistem Akun Mandiri & Terisolasi</span>
            </div>
            <h1 className="auth-card-title">
              {tab === 'login' ? 'Masuk ke Memomeir' : 'Buat Akun Memomeir'}
            </h1>
            <p className="auth-card-desc">
              {tab === 'login'
                ? 'Gunakan akun Google atau email Gmail Anda untuk mengakses pencatatan keuangan pribadi.'
                : 'Daftarkan akun Anda untuk mulai mencatat keuangan secara mandiri dan aman.'}
            </p>
          </div>

          {/* 1-Click Google Sign In Button */}
          <div className="google-auth-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
            {googleClientId ? (
              <div ref={googleButtonRef} style={{ minHeight: 44, display: 'flex', justifyContent: 'center', width: '100%' }}>
                <button
                  type="button"
                  className="btn-google-auth"
                  onClick={() => {
                    if (window.google?.accounts?.id) {
                      window.google.accounts.id.prompt();
                    }
                  }}
                  title="Login resmi menggunakan Akun Google (1-Klik)"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Lanjutkan dengan Google</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-google-auth"
                onClick={() => setIsGoogleSetupOpen(true)}
                title="Login resmi menggunakan Akun Google (1-Klik)"
              >
                {/* Official Google G Logo SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Lanjutkan dengan Google</span>
              </button>
            )}

            <div className="auth-divider" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 10px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                atau masuk manual
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="auth-tab-pill-wrap">
            <button
              type="button"
              className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setTab('login');
                setError(null);
              }}
            >
              <LogIn size={15} />
              <span>Masuk (Login)</span>
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
              onClick={() => {
                setTab('register');
                setError(null);
              }}
            >
              <UserPlus size={15} />
              <span>Daftar Akun Baru</span>
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="auth-error-notice">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Form: LOGIN */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="auth-form-body">
              <div className="form-group">
                <label className="form-label">
                  <Mail size={13} />
                  <span>Email (Gmail)</span>
                </label>
                <div className="auth-input-wrap">
                  <input
                    type="email"
                    className="form-input"
                    placeholder="nama@gmail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Lock size={13} />
                  <span>Password</span>
                </label>
                <div className="auth-input-wrap" style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Masukkan password Anda"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary auth-submit-btn"
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <span>Memverifikasi Akun...</span>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Masuk ke Dashboard</span>
                  </>
                )}
              </button>

              <div className="auth-switch-prompt">
                <span>Belum punya akun?</span>{' '}
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => {
                    setTab('register');
                    setError(null);
                  }}
                >
                  Daftar akun Gmail baru
                </button>
              </div>
            </form>
          )}

          {/* Form: REGISTER */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="auth-form-body">
              <div className="form-group">
                <label className="form-label">
                  <User size={13} />
                  <span>Nama Lengkap</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Farrel Atharizz"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Mail size={13} />
                  <span>Alamat Email (Gmail)</span>
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="user@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Phone size={13} />
                  <span>Nomor WhatsApp (Opsional)</span>
                </label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="Contoh: 081389352752"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
                <span className="auth-field-hint">
                  💡 Berguna agar Bot WhatsApp langsung mencatat transaksi Anda saat kirim chat atau foto struk.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Lock size={13} />
                  <span>Buat Password</span>
                </label>
                <div className="auth-input-wrap" style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary auth-submit-btn"
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <span>Mendaftarkan Akun...</span>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Daftar & Masuk ke Dashboard</span>
                  </>
                )}
              </button>

              <div className="auth-switch-prompt">
                <span>Sudah punya akun?</span>{' '}
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => {
                    setTab('login');
                    setError(null);
                  }}
                >
                  Masuk di sini
                </button>
              </div>
            </form>
          )}

          {/* Security Features Footer */}
          <div className="auth-features-grid">
            <div className="auth-feature-item">
              <ShieldCheck size={16} style={{ color: '#10b981' }} />
              <div>
                <strong>Privat & Terisolasi</strong>
                <span>Setiap akun memiliki database transaksi mandiri.</span>
              </div>
            </div>
            <div className="auth-feature-item">
              <Bot size={16} style={{ color: '#0066FF' }} />
              <div>
                <strong>Koneksi WhatsApp Bot</strong>
                <span>Kirim chat atau foto struk kapan saja dari HP.</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Google OAuth Setup Helper Modal */}
      {isGoogleSetupOpen && (
        <div className="modal-overlay" onClick={() => setIsGoogleSetupOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key size={18} color="#0066FF" />
                <span>Sambungkan Google Sign-In Resmi</span>
              </div>
              <button className="btn-icon" onClick={() => setIsGoogleSetupOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '16px 20px', fontSize: '0.84rem', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)' }}>
                Untuk mengaktifkan tombol resmi <strong>"Sign in with Google"</strong>, Anda membutuhkan <strong>Google Client ID</strong> gratis dari Google Cloud Console:
              </p>

              <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 12, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Langkah Cepat (Gratis 2 Menit):</div>
                <ol style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <li>Buka <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>Google Cloud Console Credentials <ExternalLink size={12} style={{ display: 'inline' }} /></a>.</li>
                  <li>Klik <strong>Create Credentials</strong> &rarr; pilih <strong>OAuth client ID</strong>.</li>
                  <li>Pilih Application type: <strong>Web application</strong>.</li>
                  <li>Tambahkan Authorized JavaScript origins:
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: 6, marginTop: 4 }}>
                      http://localhost:5173
                    </div>
                  </li>
                  <li>Salin <strong>Client ID</strong> (yang berakhiran <code>.apps.googleusercontent.com</code>).</li>
                </ol>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Tempel Google Client ID Anda di sini:
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="contoh: 123456789-abcdef.apps.googleusercontent.com"
                  value={inputClientId}
                  onChange={e => setInputClientId(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                />
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveGoogleClientId}
                disabled={!inputClientId.trim()}
                style={{ width: '100%', padding: 10, justifyContent: 'center' }}
              >
                Simpan & Aktifkan Tombol Google
              </button>

              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Atau Anda bisa langsung masuk dengan Email (Gmail) & Password di form utama tanpa setup ini.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="auth-gate-footer">
        <span>© {new Date().getFullYear()} Memomeir • Sistem Pencatat Keuangan Otomatis</span>
      </footer>
    </div>
  );
}

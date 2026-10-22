import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  RefreshCw,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  Smile,
  Sparkles,
  Bot,
  Zap,
  ArrowLeft
} from 'lucide-react';

const SAMPLE_PRESETS = [
  {
    id: 'coffee',
    icon: '☕',
    label: 'Kopi & Roti 45rb',
    chat: 'Beli kopi flat white & roti 45.000 via BCA QRIS'
  },
  {
    id: 'salary',
    icon: '💼',
    label: 'Gaji Masuk 10jt',
    chat: 'Transfer masuk gaji bulanan Rp 10.000.000 via BCA Transfer'
  },
  {
    id: 'transport',
    icon: '🚗',
    label: 'Taksi 85rb',
    chat: 'Ongkos taksi Bluebird ke stasiun 85.000 pake GoPay'
  },
  {
    id: 'bills',
    icon: '⚡',
    label: 'Listrik PLN 250rb',
    chat: 'Bayar tagihan listrik PLN 250.000 via Mandiri Livin'
  },
  {
    id: 'lunch',
    icon: '🍕',
    label: 'Makan Siang 35rb',
    chat: 'Makan siang bakso & es teh 35.000 via ShopeePay'
  },
  {
    id: 'cinema',
    icon: '🎬',
    label: 'Bioskop XXI 60rb',
    chat: 'Beli tiket nonton bioskop XXI 60.000 pake Dana'
  },
  {
    id: 'shopping',
    icon: '🛒',
    label: 'Belanja 350rb',
    chat: 'Belanja bulanan supermarket 350.000 bayar Kartu Kredit'
  }
];

export default function WhatsAppSimulatorModal({ isOpen, onClose, onTransactionAdded, currentUser }) {
  const [chatInput, setChatInput] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize or reset chat conversation
  const resetConversation = () => {
    const userName = currentUser?.name ? currentUser.name.split(' ')[0] : 'kak';
    setMessages([
      {
        id: 'msg_welcome',
        sender: 'bot',
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        text: `Halo ${userName}! 👋 Aku asisten keuangan WhatsApp dari *Memomeir* 🐱.\n\nKetik chat pengeluaran atau pemasukan santaimu di sini (contohnya: _"Beli kopi 25rb bayar pake QRIS"_ atau _"Gaji masuk 10jt BCA"_).\n\nKamu juga bisa klik rekomendasi cepat di bawah untuk langsung mencoba! 🚀`
      }
    ]);
    setChatInput('');
    setSelectedPresetId(null);
    setIsBotTyping(false);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetConversation();
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 300);
    }
  }, [isOpen]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isBotTyping, isOpen]);

  if (!isOpen) return null;

  // Natural language parser for Indonesian financial chats
  const parseChatToPayload = (text) => {
    const clean = text.trim();
    let detectedAmount = 50000;
    let detectedType = 'expense';
    let detectedCategory = 'Miscellaneous';
    let detectedMethod = 'BCA QRIS';

    // 1. Amount matching (e.g. 45.000, 45rb, 10jt, 10.000.000, 250k)
    const amtMatch = clean.match(/(?:rp\.?|idr|\$)?\s*(\d{1,3}(?:[.,]\d{3})*|\d+)(?:k|rb|ribu|jt|juta)?/i);
    if (amtMatch) {
      const numStr = amtMatch[1].replace(/[.,]/g, '');
      let val = parseInt(numStr, 10);
      const lower = clean.toLowerCase();
      if (lower.includes('jt') || lower.includes('juta')) {
        val *= 1000000;
      } else if (lower.includes('rb') || lower.includes('ribu') || lower.includes('k')) {
        if (val < 1000) val *= 1000;
      }
      detectedAmount = isNaN(val) ? 50000 : val;
    }

    // 2. Type matching
    if (/gaji|salary|terima|masuk|income|freelance|bonus|transfer masuk|inflow|penjualan/i.test(clean)) {
      detectedType = 'income';
      detectedCategory = 'Salary';
    }

    // 3. Category matching
    if (/kopi|makan|resto|cafe|food|warung|lunch|dinner|sarapan|snack|sushi|roti|bakso/i.test(clean)) {
      detectedCategory = 'Food & Dining';
    } else if (/bensin|pertamax|pertalite|bbm|taksi|grab|gojek|goride|gocar|bluebird|parkir|toll|kereta|bus/i.test(clean)) {
      detectedCategory = 'Transport';
    } else if (/listrik|pln|pdam|air|wifi|indihome|pulsa|paket data|iuran|bpjs/i.test(clean)) {
      detectedCategory = 'Utilities';
    } else if (/baju|sepatu|belanja|supermarket|indomaret|alfamart|tokopedia|shopee/i.test(clean)) {
      detectedCategory = 'Shopping';
    } else if (/nonton|bioskop|xxi|netflix|spotify|game|steam/i.test(clean)) {
      detectedCategory = 'Entertainment';
    }

    // 4. Payment method matching
    if (/qris/i.test(clean)) {
      detectedMethod = 'BCA QRIS';
    } else if (/gopay/i.test(clean)) {
      detectedMethod = 'GoPay';
    } else if (/ovo/i.test(clean)) {
      detectedMethod = 'OVO';
    } else if (/dana/i.test(clean)) {
      detectedMethod = 'Dana';
    } else if (/shopeepay|shopee/i.test(clean)) {
      detectedMethod = 'ShopeePay';
    } else if (/mandiri|livin/i.test(clean)) {
      detectedMethod = 'Mandiri Livin';
    } else if (/bca|transfer/i.test(clean)) {
      detectedMethod = 'BCA Transfer';
    } else if (/kartu kredit|credit card/i.test(clean)) {
      detectedMethod = 'Credit Card';
    } else if (/tunai|cash/i.test(clean)) {
      detectedMethod = 'Cash';
    }

    return {
      type: detectedType,
      amount: detectedAmount,
      category: detectedCategory,
      payment_method: detectedMethod,
      description: clean,
      date: new Date().toISOString()
    };
  };

  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setChatInput(preset.chat);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSendChat = async (messageOverride) => {
    const textToSend = (messageOverride !== undefined ? messageOverride : chatInput).trim();
    if (!textToSend || loading) return;

    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    // 1. Append user message immediately
    const userMsg = {
      id: 'user_' + Date.now(),
      sender: 'user',
      time: timeNow,
      text: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setLoading(true);
    setIsBotTyping(true);

    // 2. Prepare payload
    const payload = parseChatToPayload(textToSend);
    
    // Attach current user identity
    if (currentUser?.id) {
      payload.user_id = currentUser.id;
      payload.user_name = currentUser.name;
    } else {
      const savedUser = localStorage.getItem('memomeir_user');
      try {
        const u = JSON.parse(savedUser);
        if (u?.id) {
          payload.user_id = u.id;
          payload.user_name = u.name;
        }
      } catch {}
    }

    // Detect user tag if mentioned (e.g. #amel or @farrel)
    const tagMatch = textToSend.match(/(?:#|@)(\w+)/);
    if (tagMatch) {
      payload.user_name = tagMatch[1];
    }

    const token = localStorage.getItem('memomeir_token');

    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-webhook-source': 'whatsapp-simulator',
        'x-simulator': 'true'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/webhook/transaction', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Gagal mencatat transaksi`);
      }

      // Simulate realistic WhatsApp bot response latency
      setTimeout(() => {
        setIsBotTyping(false);
        setLoading(false);

        const botReplyMsg = {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          tx: data.transaction
        };

        setMessages(prev => [...prev, botReplyMsg]);

        // Refresh dashboard immediately
        if (onTransactionAdded && data.transaction) {
          onTransactionAdded(data.transaction);
        }
      }, 700);

    } catch (err) {
      setTimeout(() => {
        setIsBotTyping(false);
        setLoading(false);

        const botErrMsg = {
          id: 'bot_err_' + Date.now(),
          sender: 'bot',
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          isError: true,
          errorText: err.message || 'Gagal mengirim pesan webhook ke sistem.'
        };

        setMessages(prev => [...prev, botErrMsg]);
      }, 500);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, padding: 12 }}>
      <div
        className="wa-simulator-modal"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          height: '86vh',
          maxHeight: 700,
          background: '#FFFFFF',
          borderRadius: 24,
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* WhatsApp Signature Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #075E54 0%, #128C7E 100%)',
            color: '#FFFFFF',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
            zIndex: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Back Button */}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                borderRadius: '50%'
              }}
              title="Kembali"
            >
              <ArrowLeft size={20} />
            </button>

            {/* Avatar with Online Badge */}
            <div style={{ position: 'relative', width: 40, height: 40 }}>
              <img
                src="/logo.png"
                alt="Memomeir Cat"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  background: '#0B4E45',
                  border: '1.5px solid rgba(255,255,255,0.4)'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div
                style={{
                  display: 'none',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: '#0B4E45',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}
              >
                <Bot size={20} />
              </div>
              <span
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 11,
                  height: 11,
                  background: '#25D366',
                  borderRadius: '50%',
                  border: '2px solid #075E54'
                }}
              />
            </div>

            {/* Contact Title & Subtitle */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontWeight: 700, fontSize: '0.98rem', letterSpacing: '-0.01em', color: '#FFFFFF' }}>
                  Memomeir Bot AI
                </span>
                <span
                  style={{
                    background: '#25D366',
                    color: '#FFFFFF',
                    borderRadius: '50%',
                    width: 14,
                    height: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.62rem',
                    fontWeight: 900
                  }}
                  title="Official Bot Verified"
                >
                  ✓
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', color: isBotTyping ? '#A7F3D0' : '#E0E7FF', fontWeight: isBotTyping ? 600 : 400 }}>
                {isBotTyping ? 'sedang mengetik... 💬' : 'online • Auto Sync'}
              </span>
            </div>
          </div>

          {/* Header Action Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={resetConversation}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              title="Reset Percakapan"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              title="Tutup"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Chat Wallpaper Canvas */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 14px 10px 14px',
            backgroundColor: '#EFEAE2',
            backgroundImage: `radial-gradient(#D6CCC2 1px, transparent 1px), radial-gradient(#D6CCC2 1px, #EFEAE2 1px)`,
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0, 12px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          {/* Centered Date Badge */}
          <div
            style={{
              alignSelf: 'center',
              background: 'rgba(255, 255, 255, 0.92)',
              color: '#54656F',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: 8,
              boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            HARI INI
          </div>

          {/* Message Stream */}
          {messages.map(msg => {
            if (msg.sender === 'user') {
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: 'flex-end',
                    maxWidth: '82%',
                    background: '#DCF8C6',
                    color: '#111B21',
                    borderRadius: '14px 14px 2px 14px',
                    padding: '8px 12px 6px 12px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                    wordBreak: 'break-word',
                    fontSize: '0.88rem',
                    lineHeight: 1.45
                  }}
                >
                  <div>{msg.text}</div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 4,
                      fontSize: '0.65rem',
                      color: '#667781',
                      marginTop: 3
                    }}
                  >
                    <span>{msg.time}</span>
                    <CheckCheck size={14} color="#53BDEB" />
                  </div>
                </div>
              );
            }

            // Bot messages
            if (msg.tx) {
              const isExpense = msg.tx.type === 'expense';
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: 'flex-start',
                    maxWidth: '88%',
                    background: '#FFFFFF',
                    color: '#111B21',
                    borderRadius: '14px 14px 14px 2px',
                    padding: '12px 14px 8px 14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    fontSize: '0.86rem',
                    lineHeight: 1.5,
                    border: '1px solid #E5E7EB'
                  }}
                >
                  {/* Bot Reply Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: '#059669',
                      fontWeight: 800,
                      fontSize: '0.86rem',
                      marginBottom: 8,
                      borderBottom: '1px solid #F3F4F6',
                      paddingBottom: 6
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Transaksi Berhasil Dicatat!</span>
                  </div>

                  {/* Transaction Details Box */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#374151', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6B7280' }}>💰 Nominal:</span>
                      <strong style={{ color: isExpense ? '#E11D48' : '#059669', fontSize: '0.92rem' }}>
                        {isExpense ? '- ' : '+ '}Rp {Number(msg.tx.amount).toLocaleString('id-ID')}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6B7280' }}>🏷️ Tipe:</span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: isExpense ? '#FFF1F2' : '#ECFDF5',
                          color: isExpense ? '#E11D48' : '#059669'
                        }}
                      >
                        {isExpense ? 'Pengeluaran' : 'Pemasukan'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6B7280' }}>📂 Kategori:</span>
                      <strong>{msg.tx.category}</strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6B7280' }}>💳 Metode:</span>
                      <strong>{msg.tx.payment_method}</strong>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 2 }}>
                      <span style={{ color: '#6B7280' }}>📝 Catatan:</span>
                      <span style={{ fontStyle: 'italic', color: '#1F2937', marginTop: 1 }}>
                        "{msg.tx.description}"
                      </span>
                    </div>

                    {msg.tx.user_name && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                        <span style={{ color: '#6B7280' }}>👤 Akun:</span>
                        <span style={{ fontWeight: 600, color: '#0066FF' }}>{msg.tx.user_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Sync Indicator */}
                  <div
                    style={{
                      marginTop: 8,
                      padding: '5px 8px',
                      borderRadius: 8,
                      background: '#ECFDF5',
                      color: '#065F46',
                      fontSize: '0.73rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5
                    }}
                  >
                    <Zap size={13} style={{ flexShrink: 0, color: '#10B981' }} />
                    <span>Saldo & grafik di dashboard langsung terupdate!</span>
                  </div>

                  <div style={{ fontSize: '0.65rem', color: '#9CA3AF', textAlign: 'right', marginTop: 4 }}>
                    {msg.time}
                  </div>
                </div>
              );
            }

            if (msg.isError) {
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: 'flex-start',
                    maxWidth: '85%',
                    background: '#FEF2F2',
                    color: '#991B1B',
                    border: '1px solid #FCA5A5',
                    borderRadius: '14px 14px 14px 2px',
                    padding: '10px 14px 6px 14px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                    fontSize: '0.84rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4 }}>
                    <AlertCircle size={15} />
                    <span>Gagal Mencatat Transaksi</span>
                  </div>
                  <div style={{ whiteSpace: 'pre-line', fontSize: '0.8rem' }}>{msg.errorText}</div>
                  <div style={{ fontSize: '0.65rem', color: '#B91C1C', textAlign: 'right', marginTop: 4 }}>
                    {msg.time}
                  </div>
                </div>
              );
            }

            // Default introductory / regular bot message
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: 'flex-start',
                  maxWidth: '86%',
                  background: '#FFFFFF',
                  color: '#111B21',
                  borderRadius: '14px 14px 14px 2px',
                  padding: '10px 14px 6px 14px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  fontSize: '0.86rem',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>
                <div style={{ fontSize: '0.65rem', color: '#667781', textAlign: 'right', marginTop: 4 }}>
                  {msg.time}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator Bubble */}
          {isBotTyping && (
            <div
              style={{
                alignSelf: 'flex-start',
                background: '#FFFFFF',
                color: '#111B21',
                borderRadius: '14px 14px 14px 2px',
                padding: '10px 16px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.82rem',
                border: '1px solid #E5E7EB'
              }}
            >
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span className="typing-dot" style={{ width: 6, height: 6, background: '#25D366', borderRadius: '50%' }} />
                <span className="typing-dot" style={{ width: 6, height: 6, background: '#25D366', borderRadius: '50%', animationDelay: '0.2s' }} />
                <span className="typing-dot" style={{ width: 6, height: 6, background: '#25D366', borderRadius: '50%', animationDelay: '0.4s' }} />
              </div>
              <span style={{ color: '#4B5563', fontStyle: 'italic', fontSize: '0.78rem' }}>
                Memomeir Bot sedang memproses...
              </span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Reply Preset Chips (Never Truncates on Mobile) */}
        <div
          style={{
            background: '#F0F2F5',
            borderTop: '1px solid #E5E7EB',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6B7280', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', flexShrink: 0 }}>
            <Sparkles size={13} color="#25D366" />
            <span>Contoh:</span>
          </div>

          {SAMPLE_PRESETS.map(preset => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 11px',
                  borderRadius: 20,
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? '#DCF8C6' : '#FFFFFF',
                  color: isSelected ? '#075E54' : '#374151',
                  border: isSelected ? '1.5px solid #25D366' : '1px solid #D1D5DB',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* WhatsApp Bottom Input Bar */}
        <div
          style={{
            background: '#F0F2F5',
            borderTop: '1px solid #E5E7EB',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 10
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: '#FFFFFF',
              borderRadius: 24,
              padding: '2px 14px',
              border: '1px solid #D1D5DB',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            <Smile size={19} color="#9CA3AF" style={{ marginRight: 8, flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !loading) {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
              placeholder="Ketik pesan transaksi (cth: Kopi 25rb QRIS)..."
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.88rem',
                color: '#111827',
                padding: '9px 0'
              }}
            />
          </div>

          {/* WhatsApp Circular Green Send Button */}
          <button
            type="button"
            onClick={() => handleSendChat()}
            disabled={loading || !chatInput.trim()}
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: chatInput.trim() ? '#25D366' : '#9CA3AF',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: chatInput.trim() && !loading ? 'pointer' : 'default',
              boxShadow: chatInput.trim() ? '0 2px 8px rgba(37, 211, 102, 0.4)' : 'none',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
            title="Kirim Pesan WhatsApp"
          >
            {loading ? <RefreshCw size={17} className="spin" /> : <Send size={17} style={{ marginLeft: 2 }} />}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useStore from '../store/useStore';
import { getSocket } from '../api/socket';

const GIPHY_API_KEY = 'c2fY4eDxlNjVjFBp7UgvFYbkse932duP';
const GIPHY_BASE = 'https://api.giphy.com/v1';

const EMOJI_GROUPS = [
  { label: '😀', title: 'Caras', emojis: ['😀', '😂', '🤣', '😊', '😍', '🥰', '😎', '🤩', '😏', '😴', '😭', '😤', '🤔', '😱', '🥳', '😇', '🤗', '😬', '🙄', '😵', '🥺', '😆', '😋', '🤪', '🤑'] },
  { label: '👍', title: 'Gestos', emojis: ['👍', '👎', '👏', '🙌', '🤝', '👊', '✊', '🤞', '🙏', '👌', '🤙', '💪', '🖐️', '✋', '🤚', '🫶', '💅', '🤌', '🫵', '👉'] },
  { label: '🎮', title: 'Gaming', emojis: ['🎮', '🕹️', '🏆', '🥇', '⚡', '🔥', '💥', '🎯', '🎲', '👾', '🕵️', '🎭', '🎪', '🎉', '🎊', '🚀', '⚔️', '🛡️', '💎', '🌟'] },
  { label: '❤️', title: 'Corazones', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💖', '💗', '💓', '💞', '💔', '❣️', '💟', '🫀', '🩷', '🩵', '🩶'] },
];

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

function GifPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [tab, setTab] = useState('gifs')
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  const search = useCallback(async (q, type) => {
    setLoading(true)
    try {
      const endpoint = type === 'stickers' ? 'stickers' : 'gifs'
      const path = !q.trim() ? 'trending' : 'search'
      const params = !q.trim()
        ? `api_key=${GIPHY_API_KEY}&limit=30&rating=pg`
        : `api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=30&rating=pg`
      const res = await fetch(`${GIPHY_BASE}/${endpoint}/${path}?${params}`)
      const data = await res.json()
      setResults(data.data || [])
    } catch (e) {
      console.error('[GifPicker]', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { search('', tab); inputRef.current?.focus() }, [tab, search])

  const handleChange = (e) => {
    const q = e.target.value
    setQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q, tab), 380)
  }

  return (
    <div className="absolute bottom-full right-0 mb-3 rounded-2xl overflow-hidden shadow-2xl z-50 flex flex-col w-full sm:w-[400px]"
      style={{ height: 340, background: '#0a0a18', border: '1px solid rgba(124,58,237,0.25)', boxShadow: '0 -8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.1)' }}>
      <div className="flex items-center gap-2 p-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex rounded-xl overflow-hidden text-[11px]" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {['gifs', 'stickers'].map(t => (
            <button key={t} onClick={() => { setTab(t); setQuery('') }} className="px-3 py-1.5 font-bold uppercase tracking-wider transition-all"
              style={tab === t ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white' } : { color: 'rgba(255,255,255,0.3)' }}>
              {t === 'gifs' ? '🎬 GIFs' : '✨ Stickers'}
            </button>
          ))}
        </div>
        <input ref={inputRef} type="text" value={query} onChange={handleChange} placeholder="Buscar GIFs..."
          className="flex-1 text-xs text-white placeholder-gray-600 outline-none rounded-xl px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} />
        <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"><CloseIcon /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-2.5">
        {loading ? <div className="flex items-center justify-center h-full"><div className="w-7 h-7 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
          : results.length === 0 ? <div className="flex flex-col items-center justify-center h-full gap-2"><span className="text-3xl">🔍</span><p className="text-gray-500 text-xs">Sin resultados</p></div>
            : <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {results.map(gif => {
                const url = gif.images?.fixed_height_small?.url || gif.images?.fixed_height?.url || gif.images?.downsized?.url
                return (
                  <button key={gif.id} onClick={() => onSelect({ url, title: gif.title })}
                    className="aspect-square rounded-xl overflow-hidden transition-all hover:scale-105 hover:ring-2" style={{ border: '1px solid rgba(255,255,255,0.06)', '--tw-ring-color': '#7c3aed' }}>
                    <img src={url} alt={gif.title} className="w-full h-full object-cover" loading="lazy" />
                  </button>
                )
              })}
            </div>}
      </div>
    </div>
  )
}

function EmojiPicker({ onSelect, onClose }) {
  const [activeGroup, setActiveGroup] = useState(0)
  return (
    <div className="absolute bottom-full right-0 mb-3 rounded-2xl overflow-hidden shadow-2xl z-50 w-full sm:w-72"
      style={{ background: '#0a0a18', border: '1px solid rgba(124,58,237,0.25)', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}>
      <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {EMOJI_GROUPS.map((g, i) => (
          <button key={i} onClick={() => setActiveGroup(i)} className="flex-1 py-2.5 text-sm transition-all"
            style={activeGroup === i ? { color: '#a78bfa', borderBottom: '2px solid #7c3aed' } : { color: 'rgba(255,255,255,0.3)' }} title={g.title}>
            {g.label}
          </button>
        ))}
        <button onClick={onClose} className="px-2.5 text-gray-600 hover:text-white transition-colors"><CloseIcon /></button>
      </div>
      <div className="p-2 grid grid-cols-8 gap-0.5 max-h-44 overflow-y-auto">
        {EMOJI_GROUPS[activeGroup].emojis.map(emoji => (
          <button key={emoji} onClick={() => onSelect(emoji)} className="text-xl p-1.5 rounded-lg transition-all hover:scale-125 hover:bg-white/10">
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function DirectMessages() {
  const { user } = useStore();
  const isAdmin = user?.role === 'admin';

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  
  // Admin spy messages
  const [spyMessages, setSpyMessages] = useState([]);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const spyEndRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket(user);
    socketRef.current = socket;

    socket.emit('dm:join');

    // Listener para lista de usuarios online
    socket.on('dm:online-users', (users) => {
      // Filtrar a sí mismo para que no pueda hablarse a sí mismo
      const filtered = users.filter(u => u.rut !== user.rut);
      setOnlineUsers(filtered);
      
      // Si el usuario seleccionado se desconecta, se mantiene en la lista para ver historial?
      // Idealmente podríamos dejarlo pero marcarlo offline. Por ahora solo mostramos los conectados.
    });

    if (isAdmin) {
      socket.emit('dm:admin-get-all-history');
      socket.on('dm:admin-history', (history) => {
        setSpyMessages(history);
      });
      socket.on('dm:admin-spy', (msg) => {
        setSpyMessages(prev => [...prev, msg]);
      });
    } else {
      socket.on('dm:history', ({ withRut, messages: history }) => {
        if (selectedUser && selectedUser.rut === withRut) {
          setMessages(history);
        }
      });

      socket.on('dm:receive', (msg) => {
        setMessages(prev => {
          // Si el mensaje nos involucra a nosotros y al selectedUser
          if (
            (msg.senderRut === user.rut && msg.receiverRut === selectedUser?.rut) ||
            (msg.senderRut === selectedUser?.rut && msg.receiverRut === user.rut)
          ) {
            return [...prev, msg];
          }
          return prev;
        });
      });
    }

    return () => {
      socket.emit('dm:leave');
      socket.off('dm:online-users');
      socket.off('dm:history');
      socket.off('dm:receive');
      socket.off('dm:admin-history');
      socket.off('dm:admin-spy');
    };
  }, [user, selectedUser]); // selectedUser en dep porque el receive lo usa

  // Petición de historial al cambiar de usuario
  useEffect(() => {
    if (selectedUser && !isAdmin) {
      socketRef.current?.emit('dm:get-history', { withRut: selectedUser.rut });
    }
  }, [selectedUser, isAdmin]);

  // Scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (spyEndRef.current) {
      spyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [spyMessages]);

  const handleSendText = (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedUser) return;
    
    // Check if it's an image link
    const isImage = inputText.match(/\.(jpeg|jpg|gif|png)$/) != null;

    socketRef.current?.emit('dm:send', {
      receiverRut: selectedUser.rut,
      receiverName: selectedUser.name,
      message: isImage ? null : inputText,
      type: isImage ? 'image' : 'text',
      gifUrl: isImage ? inputText : null
    });
    
    setInputText('');
  };

  const handleSendGif = ({ url, title }) => {
    if (!selectedUser) return;
    socketRef.current?.emit('dm:send', {
      receiverRut: selectedUser.rut,
      receiverName: selectedUser.name,
      type: 'gif',
      gifUrl: url,
      gifTitle: title
    });
    setShowGifPicker(false);
  };

  const handleSendEmoji = (emoji) => {
    if (!selectedUser) return;
    socketRef.current?.emit('dm:send', {
      receiverRut: selectedUser.rut,
      receiverName: selectedUser.name,
      type: 'emoji',
      emoji: emoji
    });
    setShowEmojiPicker(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedUser) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      alert("Por favor selecciona una imagen válida.");
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen es demasiado grande. Máximo 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      socketRef.current?.emit('dm:send', {
        receiverRut: selectedUser.rut,
        receiverName: selectedUser.name,
        type: 'image',
        imageBase64: ev.target.result
      });
    };
    reader.readAsDataURL(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  if (isAdmin) {
    return (
      <div className="max-w-5xl mx-auto py-8 animate-fade-in flex flex-col h-[calc(100vh-100px)]">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-brand flex items-center gap-2">
            <span>👁️</span> Centro de Monitoreo DM
          </h1>
          <p className="text-gray-400 font-medium">Modo Espía: Todos los mensajes directos de los estudiantes.</p>
        </div>

        <div className="flex-1 bg-surface-card border border-surface-border rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
          <div className="p-4 border-b border-surface-border bg-[#0a0a0f]">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Registro Global en Vivo
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3 custom-scrollbar">
            {spyMessages.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">No hay mensajes privados registrados.</div>
            ) : (
              spyMessages.map((msg, idx) => (
                <div key={msg._id || idx} className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col gap-1">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-1">
                    <div className="text-xs font-bold">
                      <span className="text-pink-400">{msg.senderName}</span>
                      <span className="text-gray-600 mx-2">→</span>
                      <span className="text-blue-400">{msg.receiverName}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="text-gray-300 text-sm">
                    {msg.msgType === 'text' && msg.message}
                    {msg.msgType === 'emoji' && <div className="text-3xl">{msg.emoji}</div>}
                    {(msg.msgType === 'gif' || msg.msgType === 'image') && <img src={msg.gifUrl} alt="Media" className="max-w-[200px] rounded-lg mt-1" />}
                  </div>
                </div>
              ))
            )}
            <div ref={spyEndRef} />
          </div>
        </div>
      </div>
    );
  }

  // VISTA ESTUDIANTE
  return (
    <div className="max-w-5xl mx-auto py-4 md:py-8 animate-fade-in flex flex-col h-[calc(100vh-100px)]">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white flex items-center gap-2">
          <span>✉️</span> Mensajes Directos
        </h1>
        <p className="text-gray-400 font-medium">Chatea con otros compañeros en línea.</p>
      </div>

      <div className="flex-1 bg-surface-card border border-surface-border rounded-2xl overflow-hidden flex shadow-2xl">
        
        {/* SIDEBAR USUARIOS */}
        <div className="w-1/3 md:w-64 border-r border-surface-border bg-[#0a0a0f] flex flex-col">
          <div className="p-4 border-b border-surface-border">
            <h3 className="text-xs font-bold text-brand-light uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              En Línea ({onlineUsers.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {onlineUsers.length === 0 ? (
              <div className="text-center text-gray-500 text-sm mt-10 p-4">Nadie más conectado.</div>
            ) : (
              onlineUsers.map(u => (
                <button
                  key={u.rut}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full text-left px-4 py-4 border-b border-white/5 transition-colors flex items-center gap-3 ${
                    selectedUser?.rut === u.rut ? 'bg-brand/20 border-l-4 border-l-brand' : 'hover:bg-white/5 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-lg">
                    {u.name.substring(0,2).toUpperCase()}
                  </div>
                  <span className="font-bold text-sm text-gray-200 truncate">{u.name}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* CHAT WINDOW */}
        <div className="flex-1 flex flex-col relative bg-surface">
          {!selectedUser ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
              <span className="text-6xl mb-4 opacity-50">👋</span>
              <p>Selecciona a alguien de la lista a la izquierda para empezar a chatear.</p>
            </div>
          ) : (
            <>
              {/* Header Chat */}
              <div className="p-4 border-b border-surface-border bg-surface-hover flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {selectedUser.name.substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-white">{selectedUser.name}</h3>
                  <p className="text-[10px] text-green-400 font-bold">En línea</p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-10 text-sm">
                    Inicia la conversación. Los mensajes están cifrados... mentira, el admin nos vigila. 🤐
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.senderRut === user.rut;
                    return (
                      <div key={msg._id || idx} className={`flex flex-col max-w-[75%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                          isMe 
                          ? 'bg-brand text-white rounded-br-sm shadow-lg shadow-brand/20' 
                          : 'bg-surface-border text-gray-200 rounded-bl-sm'
                        }`}>
                          {msg.msgType === 'text' && msg.message}
                          {msg.msgType === 'emoji' && <div className="text-[40px] leading-none">{msg.emoji}</div>}
                          {(msg.msgType === 'gif' || msg.msgType === 'image') && (
                            <img src={msg.gifUrl} alt="Media" className="max-w-[200px] rounded-lg" />
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 mt-1 mx-1">{formatTime(msg.timestamp)}</span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-surface-card border-t border-surface-border relative">
                {showGifPicker && <GifPicker onSelect={handleSendGif} onClose={() => setShowGifPicker(false)} />}
                {showEmojiPicker && <EmojiPicker onSelect={handleSendEmoji} onClose={() => setShowEmojiPicker(false)} />}
                
                <form onSubmit={handleSendText} className="flex gap-2 items-center">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl text-gray-400 hover:text-white transition-colors" title="Subir Imagen">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                  </button>
                  <button type="button" onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                    className={`p-2 rounded-xl transition-colors ${showEmojiPicker ? 'bg-amber-500/20 text-amber-500' : 'text-gray-400 hover:text-white'}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><circle cx="12" cy="12" r="10" /><path d="M8 13s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>
                  </button>
                  <button type="button" onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors border ${showGifPicker ? 'bg-brand text-white border-brand' : 'border-brand/30 text-brand-light hover:bg-brand/10'}`}>
                    GIF
                  </button>
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Escribe un mensaje o pega un enlace..."
                    className="flex-1 bg-surface border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="bg-brand text-white px-5 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-light"
                  >
                    Enviar
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

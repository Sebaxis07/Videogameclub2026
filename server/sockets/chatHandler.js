/**
 * chatHandler.js
 * =================
 * WebSocket handler para el módulo de mensajería en tiempo real.
 *
 * Modos de contenido (configurables por admin):
 *  - 'free'      → texto + GIFs + emojis
 *  - 'gif-only'  → solo GIFs / stickers
 *  - 'text-gif'  → texto + GIFs (sin emojis)
 *  - 'text-emoji'→ texto + emojis (sin GIFs)
 *  - 'emoji-only'→ solo emojis
 *  - 'custom'    → configuración manual con toggles
 *
 * Anti-spam: 10 segundos de cooldown por socket (solo estudiantes).
 * El admin puede pausar/despausar el chat, limpiar historial,
 * eliminar mensajes individuales y cambiar el modo en tiempo real.
 */

"use strict";

const MAX_MESSAGES = 120;


// ─── Presets de modo ──────────────────────────────────────────────────────────
const MODE_PRESETS = {
  free:        { allowText: true,  allowGifs: true,  allowEmojis: true  },
  'gif-only':  { allowText: false, allowGifs: true,  allowEmojis: false },
  'text-gif':  { allowText: true,  allowGifs: true,  allowEmojis: false },
  'text-emoji':{ allowText: true,  allowGifs: false, allowEmojis: true  },
  'emoji-only':{ allowText: false, allowGifs: false, allowEmojis: true  },
  custom:      null, // Se define manualmente vía toggles
};

// ─── Estado en memoria del chat ───────────────────────────────────────────────
let chatState = {
  config: {
    mode: 'free',        // uno de los MODE_PRESETS keys
    allowText: true,
    allowGifs: true,
    allowEmojis: true,
    isPaused: false,
    onlineCount: 0,
    cooldown: 10,
  },
  messages: [],
};

// Map de cooldown: socketId -> timestamp del último mensaje enviado
const cooldownMap = new Map();
// Map de usuarios conectados: socketId -> { userName, role }
const connectedUsers = new Map();

let ioInstance = null;

function broadcastConfig() {
  if (ioInstance) {
    ioInstance.to('chat').emit('chat:config-updated', chatState.config);
  }
}

function broadcastOnlineCount() {
  chatState.config.onlineCount = connectedUsers.size;
  if (ioInstance) {
    ioInstance.to('chat').emit('chat:online-count', connectedUsers.size);
  }
}

module.exports = function (io) {
  ioInstance = io;

  // Namespace solo para chat — usamos room "chat" dentro del namespace global
  io.on('connection', (socket) => {
    const role     = socket.handshake.query.role     || 'student';
    const userName = socket.handshake.query.userName || 'Anónimo';
    const userRut  = socket.handshake.query.userRut  || null;

    // Unirse a la sala de chat
    socket.join('chat');
    connectedUsers.set(socket.id, { userName, role });
    broadcastOnlineCount();

    // ─── INIT ──────────────────────────────────────────────────────────────
    const sendInit = () => {
      socket.emit('chat:init', {
        config: chatState.config,
        messages: chatState.messages,
      });
    };

    sendInit();

    socket.on('chat:request-init', sendInit);

    // ─── ENVÍO DE MENSAJE ─────────────────────────────────────────────────
    socket.on('chat:send-message', ({ text, gifUrl, gifTitle, type, emoji }) => {
      const { config } = chatState;

      // Verificar si el chat está pausado
      if (config.isPaused && role !== 'admin') {
        return socket.emit('chat:error', { code: 'CHAT_PAUSED', message: 'El chat está pausado por el administrador.' });
      }

      // Validar tipo de contenido según config
      if (type === 'text'  && !config.allowText  && role !== 'admin') {
        return socket.emit('chat:error', { code: 'NOT_ALLOWED', message: 'El texto está deshabilitado.' });
      }
      if (type === 'gif'   && !config.allowGifs  && role !== 'admin') {
        return socket.emit('chat:error', { code: 'NOT_ALLOWED', message: 'Los GIFs están deshabilitados.' });
      }
      if (type === 'emoji' && !config.allowEmojis && role !== 'admin') {
        return socket.emit('chat:error', { code: 'NOT_ALLOWED', message: 'Los emojis están deshabilitados.' });
      }

      // Validación de contenido
      if (type === 'text' && (!text || !text.trim())) {
        return socket.emit('chat:error', { code: 'EMPTY_MESSAGE', message: 'El mensaje está vacío.' });
      }
      if (type === 'gif' && !gifUrl) {
        return socket.emit('chat:error', { code: 'INVALID_GIF', message: 'GIF inválido.' });
      }

      // Anti-spam: solo para estudiantes
      if (role !== 'admin' && chatState.config.cooldown > 0) {
        const lastSent = cooldownMap.get(socket.id) || 0;
        const now      = Date.now();
        const elapsed  = now - lastSent;
        const cooldownMs = chatState.config.cooldown * 1000;

        if (elapsed < cooldownMs) {
          const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
          return socket.emit('chat:cooldown', {
            remaining,
            cooldownMs: cooldownMs,
            endsAt: lastSent + cooldownMs,
          });
        }
        cooldownMap.set(socket.id, now);
      } else if (role !== 'admin' && chatState.config.cooldown === 0) {
        // Clear spam lock if cooldown was removed
        socket.emit('chat:cooldown', { remaining: 0, cooldownMs: 0, endsAt: 0 });
      }

      // Construir el mensaje
      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type,
        text:     text     ? text.trim().slice(0, 300) : null,
        gifUrl:   gifUrl   || null,
        gifTitle: gifTitle || null,
        emoji:    emoji    || null,
        sender: { name: userName, rut: userRut, role, socketId: socket.id },
        timestamp: Date.now(),
      };

      // Agregar al historial (máx MAX_MESSAGES)
      chatState.messages.push(message);
      if (chatState.messages.length > MAX_MESSAGES) {
        chatState.messages.shift();
      }

      // Broadcast del nuevo mensaje a todos en la sala
      io.to('chat').emit('chat:new-message', message);

      // Confirmar al emisor + dar info de cooldown
      if (role !== 'admin' && chatState.config.cooldown > 0) {
        const cooldownMs = chatState.config.cooldown * 1000;
        socket.emit('chat:cooldown', {
          remaining: chatState.config.cooldown,
          cooldownMs: cooldownMs,
          endsAt: Date.now() + cooldownMs,
        });
      }
    });

    // ─── ADMIN: CAMBIAR MODO (PRESET) ─────────────────────────────────────
    socket.on('chat:admin-set-mode', (mode) => {
      if (role !== 'admin') {
        return socket.emit('chat:error', { code: 'FORBIDDEN', message: 'No tienes permisos.' });
      }
      if (!MODE_PRESETS.hasOwnProperty(mode)) {
        return socket.emit('chat:error', { code: 'INVALID_MODE', message: `Modo desconocido: ${mode}` });
      }

      const preset = MODE_PRESETS[mode];
      chatState.config = {
        ...chatState.config,
        mode,
        ...(preset || {}),
      };

      broadcastConfig();
    });

    // ─── ADMIN: ACTUALIZAR CONFIG CUSTOM ─────────────────────────────────
    socket.on('chat:admin-config', (newConfig) => {
      if (role !== 'admin') {
        return socket.emit('chat:error', { code: 'FORBIDDEN', message: 'No tienes permisos.' });
      }

      chatState.config = {
        ...chatState.config,
        ...newConfig,
        mode: 'custom', // Al tocar toggles manualmente, cambia a custom
      };

      broadcastConfig();
    });

    // ─── ADMIN: LIMPIAR HISTORIAL ─────────────────────────────────────────
    socket.on('chat:admin-clear', () => {
      if (role !== 'admin') return;
      chatState.messages = [];
      io.to('chat').emit('chat:cleared');
    });

    socket.on('chat:admin-set-cooldown', (sec) => {
      if (role !== 'admin') return;
      const parsed = parseInt(sec, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        chatState.config.cooldown = parsed;
        broadcastConfig();
      }
    });

    // ─── Desconexión ──────────────────────────────────────────────────────────
    socket.on('chat:delete-message', (msgId) => {
      if (role !== 'admin') {
        return socket.emit('chat:error', { code: 'FORBIDDEN', message: 'No tienes permisos.' });
      }
      chatState.messages = chatState.messages.filter(m => m.id !== msgId);
      io.to('chat').emit('chat:message-deleted', msgId);
    });

    // ─── DESCONEXIÓN ──────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      cooldownMap.delete(socket.id);
      connectedUsers.delete(socket.id);
      broadcastOnlineCount();
    });
  });
};

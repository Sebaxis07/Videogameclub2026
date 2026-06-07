"use strict";

const DirectMessage = require('../models/DirectMessage');

// Mapeo de rut -> { socketId, name, role }
const onlineUsers = new Map();
// Mapeo de socketId -> rut (para búsquedas inversas rápidas)
const socketToRut = new Map();

function broadcastOnlineUsers(io) {
  const usersArray = [];
  for (const [rut, data] of onlineUsers.entries()) {
    // Solo enviamos estudiantes al listado para chatear
    if (data.role !== 'admin') {
      usersArray.push({ rut, name: data.name, isOnline: true });
    }
  }
  io.to('dm-room').emit('dm:online-users', usersArray);
}

module.exports = function (io) {
  io.on('connection', (socket) => {
    const role = socket.handshake.query.role || 'student';
    const userName = socket.handshake.query.userName || 'Estudiante';
    const userRut = socket.handshake.query.rut || null;

    socket.on('dm:join', () => {
      socket.join('dm-room');
      
      if (userRut) {
        onlineUsers.set(userRut, { socketId: socket.id, name: userName, role });
        socketToRut.set(socket.id, userRut);
      }

      if (role === 'admin') {
        socket.join('dm-admin');
      }

      broadcastOnlineUsers(io);
    });

    socket.on('dm:get-history', async ({ withRut }) => {
      if (!userRut || !withRut) return;
      
      try {
        // Buscar mensajes donde el usuario es el emisor o el receptor (con el `withRut` seleccionado)
        const messages = await DirectMessage.find({
          $or: [
            { senderRut: userRut, receiverRut: withRut },
            { senderRut: withRut, receiverRut: userRut }
          ]
        }).sort({ timestamp: 1 }).lean();

        socket.emit('dm:history', { withRut, messages });
      } catch (err) {
        console.error("Error fetching DM history:", err);
      }
    });

    socket.on('dm:admin-get-all-history', async () => {
      if (role !== 'admin') return;
      try {
        const messages = await DirectMessage.find({}).sort({ timestamp: -1 }).limit(200).lean();
        socket.emit('dm:admin-history', messages.reverse());
      } catch (err) {
        console.error("Error fetching all DMs for admin:", err);
      }
    });

    socket.on('dm:send', async ({ receiverRut, receiverName, message, type = 'text', gifUrl, gifTitle, emoji, imageBase64 }) => {
      if (!userRut || !receiverRut) return;

      try {
        let finalMediaUrl = gifUrl;

        // Si se envía una imagen desde el dispositivo (Base64)
        if (imageBase64) {
          const fs = require('fs');
          const path = require('path');
          
          const uploadsDir = path.join(__dirname, '../public/uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          // Extraer los datos y la extensión si está disponible (data:image/png;base64,...)
          const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          let base64Data = imageBase64;
          let ext = '.png'; // default
          
          if (matches && matches.length === 3) {
            base64Data = matches[2];
            const mimeType = matches[1];
            if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
            else if (mimeType.includes('gif')) ext = '.gif';
            else if (mimeType.includes('webp')) ext = '.webp';
          }
          
          const fileName = `dm_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
          const filePath = path.join(uploadsDir, fileName);
          
          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
          
          finalMediaUrl = `/uploads/${fileName}`;
          type = 'image';
        }

        // 1. Guardar en MongoDB
        const newMsg = new DirectMessage({
          senderRut: userRut,
          senderName: userName,
          receiverRut,
          receiverName,
          message: message?.trim() || '',
          msgType: type,
          gifUrl: finalMediaUrl,
          gifTitle,
          emoji
        });
        await newMsg.save();

        const msgObj = newMsg.toObject();

        // 2. Enviar al propio emisor para actualizar su UI
        socket.emit('dm:receive', msgObj);

        // 3. Enviar al receptor si está conectado
        const receiverData = onlineUsers.get(receiverRut);
        if (receiverData) {
          io.to(receiverData.socketId).emit('dm:receive', msgObj);
        }

        // 4. Modo Espía: Enviar a todos los administradores
        io.to('dm-admin').emit('dm:admin-spy', msgObj);

      } catch (err) {
        console.error("Error sending DM:", err);
      }
    });

    socket.on('disconnect', () => {
      const rut = socketToRut.get(socket.id);
      if (rut) {
        onlineUsers.delete(rut);
        socketToRut.delete(socket.id);
        broadcastOnlineUsers(io);
      }
    });
    
    socket.on('dm:leave', () => {
      const rut = socketToRut.get(socket.id);
      if (rut) {
        onlineUsers.delete(rut);
        socketToRut.delete(socket.id);
        socket.leave('dm-room');
        if (role === 'admin') socket.leave('dm-admin');
        broadcastOnlineUsers(io);
      }
    });
  });
};

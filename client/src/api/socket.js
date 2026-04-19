/**
 * socket.js
 * =====================
 * Inicializa y provee la conexión global de WebSockets
 */

import { io } from 'socket.io-client';
import config from '../config/env';

// We only want one global instance
let socketInstance = null;

export const getSocket = (userOrRole = null) => {
  if (!socketInstance) {
    const socketUrl = config.API_URL.endsWith('/api') 
      ? config.API_URL.slice(0, -4) 
      : config.API_URL;

    let role = 'student';
    let userName = 'Estudiante';
    let rut = null;

    if (typeof userOrRole === 'string') {
      role = userOrRole;
    } else if (userOrRole && typeof userOrRole === 'object') {
      role = userOrRole.role || 'student';
      userName = userOrRole.nombre || 'Estudiante';
      rut = userOrRole.rut || null;
    }

    socketInstance = io(socketUrl, {
      query: { role, userName, rut, authTimestamp: Date.now() },
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('Socket conectado:', socketInstance.id);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket desconectado');
    });
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

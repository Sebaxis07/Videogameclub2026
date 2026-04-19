const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

// Configurar el cliente JWKS para obtener las llaves públicas de Microsoft Entra ID
const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxEntries: 5, // Default scale
  cacheMaxAge: 3600000 // 1 h
});

// Función de ayuda para obtener la llave de firma usando el kid (key id) del header del token
function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err) {
      return callback(err, null);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

/**
 * Socket.io Middleware
 * Protege la conexión exigiendo un JWT emitido por Entra ID
 */
const socketAuthMiddleware = (socket, next) => {
  // Intentar obtener el token desde el auth payload o los headers
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

  if (!token) {
    console.error(`[Socket Auth] Conexión rechazada: Token no proporcionado (ID: ${socket.id})`);
    return next(new Error("Authentication error: No token provided"));
  }

  // Opciones estandar de validación Entra ID
  const verifyOptions = {
    audience: process.env.AZURE_AD_CLIENT_ID,
    issuer: `https://sts.windows.net/${process.env.AZURE_AD_TENANT_ID}/`,
    algorithms: ['RS256']
  };

  // Validar el JWT
  jwt.verify(token, getKey, verifyOptions, (err, decoded) => {
    if (err) {
      console.error(`[Socket Auth] JWT Inválido para Socket ${socket.id}: ${err.message}`);
      return next(new Error("Authentication error: Invalid or expired token"));
    }

    // Almacenamos el payload limpio en el socket para uso posterior (ej. roles, upn)
    socket.user = {
      id: decoded.oid,
      email: decoded.preferred_username || decoded.upn,
      name: decoded.name,
      roles: decoded.roles || []
    };

    console.log(`[Socket Auth] Conexión autenticada: ${socket.user.email} (ID: ${socket.id})`);
    next();
  });
};

module.exports = socketAuthMiddleware;

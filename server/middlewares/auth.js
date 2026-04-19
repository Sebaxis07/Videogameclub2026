const passport = require("passport");
const { BearerStrategy } = require("passport-azure-ad");
const config = require("../config/env"); // Referencia a variables de entorno para fallback

// Configuración de las opciones para Azure AD Bearer Strategy
const options = {
    // Identity Metadata URL es fundamental para obtener las keys dinámicas.
    // Tenant ID se toma de environment variables.
    identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0/.well-known/openid-configuration`,
    
    clientID: process.env.AZURE_AD_CLIENT_ID,
    
    // El audience (aud) por defecto es el clientID para el resource
    audience: process.env.AZURE_AD_CLIENT_ID,

    // Dependiendo si es tenante único o multi-tenant
    validateIssuer: true,
    issuer: `https://sts.windows.net/${process.env.AZURE_AD_TENANT_ID}/`,
    
    // Solo permitimos autenticación de tokens via Header (Authorization: Bearer <token>)
    passReqToCallback: false,
    
    // En entornos de producción logging al minimo. En dev puedes requerirlo para debugear SSO
    loggingLevel: process.env.NODE_ENV === "production" ? "error" : "info",
    loggingNoPII: true // Cumplimiento de normativas de privacidad
};

// Inicializamos la estrategia si las variables de entorno existen
if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_TENANT_ID) {
    const bearerStrategy = new BearerStrategy(options, (token, done) => {
        // Validación personalizada del payload del token si fuese necesario
        // Por ejemplo verificar un Role, Group, etc.
        if (!token.oid) {
            return done(new Error("Token does not contain user OID"), null);
        }
        
        // Retornar al usuario/token como válido
        const user = {
            id: token.oid,
            name: token.name,
            email: token.preferred_username || token.upn,
            roles: token.roles || []
        };
        
        return done(null, user, token);
    });

    passport.use(bearerStrategy);
} else {
    console.warn("[Auth] IMPORTANTE: Variables de entorno de AZURE AD (CLIENT_ID o TENANT_ID) no definidas. SSO inactivo o fallará.");
}

// Middleware simplificado que exportamos para usar en rutas de express
// Ej: router.get('/admin', requireAzureAuth, (req, res) => ... )
const requireAzureAuth = passport.authenticate("oauth-bearer", { session: false });

module.exports = {
    passport,
    requireAzureAuth
};

import React from 'react';

export default function FormQR() {
  const formLink = "https://docs.google.com/spreadsheets/d/17oLPkIhqpUzrLztAjfmCsJxdnnSvurqIi4Lfpyof7eg/edit?usp=sharing";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(formLink)}`;

  return (
    <div className="card-glow animate-fade-in flex flex-col items-center justify-center p-8 sm:p-12 min-h-[500px]">
      <div className="text-center mb-8">
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-2">Escanea el Código QR</h2>
        <p className="text-gray-400 max-w-md mx-auto">
          Muestra este código en pantalla completa para que los asistentes puedan escanearlo y acceder directamente al formulario / documento.
        </p>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-[0_0_40px_rgba(124,58,237,0.3)] border-4 border-brand-light">
        <img 
          src={qrUrl} 
          alt="QR Code" 
          className="w-64 h-64 sm:w-80 sm:h-80 object-contain mx-auto"
        />
      </div>

      <div className="mt-8 text-center bg-surface-card border border-surface-border py-3 px-6 rounded-xl max-w-xl w-full">
        <p className="text-xs text-brand-light font-bold uppercase tracking-widest mb-1">Enlace Directo</p>
        <a 
          href={formLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-white hover:text-brand transition-colors text-sm break-all font-medium"
        >
          {formLink}
        </a>
      </div>
    </div>
  );
}

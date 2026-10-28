'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, QrCode, Copy, Check, ExternalLink, Wifi, X, Edit2, RotateCcw } from 'lucide-react';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export default function QrModal({ isOpen, onClose, isDarkMode = false }: QrModalProps) {
  const [copied, setCopied] = useState(false);
  const [hostIp, setHostIp] = useState('192.168.1.7');
  const [port, setPort] = useState('3000');
  const [isEditingIp, setIsEditingIp] = useState(false);

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const currentPort = window.location.port || '3000';
      setPort(currentPort);

      // Check if user already saved a preferred IP
      const savedIp = localStorage.getItem('pos_mobile_host_ip');
      if (savedIp) {
        setHostIp(savedIp);
        return;
      }

      // If already accessed via LAN IP (e.g. http://192.168.1.7:3000)
      const hostname = window.location.hostname;
      if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('172.')) {
        setHostIp(hostname);
        return;
      }

      // Query network API
      fetch('/api/network')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.ip && !data.ip.startsWith('172.') && data.ip !== 'localhost') {
            setHostIp(data.ip);
          } else {
            // Default detected LAN IP for this machine
            setHostIp('192.168.1.7');
          }
        })
        .catch(() => {
          setHostIp('192.168.1.7');
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const mobileUrl = `http://${hostIp}${port ? `:${port}` : ''}`;

  const handleCopy = () => {
    if (!mobileUrl) return;
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleIpChange = (newIp: string) => {
    setHostIp(newIp);
    localStorage.setItem('pos_mobile_host_ip', newIp);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`border rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden transition-colors ${
        isDarkMode
          ? 'bg-slate-900 border-slate-700 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Acceso Móvil / Código QR
              </h3>
              <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Escanea desde tu teléfono en la misma red Wi-Fi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center space-y-4 text-center">
          {/* QR Container */}
          <div className={`p-4 rounded-2xl border shadow-md flex items-center justify-center ${
            isDarkMode ? 'bg-white border-slate-200' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <QRCodeSVG
              value={mobileUrl}
              size={190}
              level="M"
              includeMargin={false}
            />
          </div>

          {/* Wi-Fi Hint */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium border ${
            isDarkMode
              ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
              : 'bg-indigo-50 border-indigo-200 text-indigo-700'
          }`}>
            <Wifi className="w-3.5 h-3.5" />
            <span>Conecta tu teléfono al mismo Wi-Fi</span>
          </div>

          {/* IP Config / Selector */}
          <div className={`w-full p-2.5 rounded-xl border text-left text-xs ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Dirección IP de este equipo:
              </span>
              <button
                type="button"
                onClick={() => setIsEditingIp(!isEditingIp)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                {isEditingIp ? 'Listo' : 'Modificar'}
              </button>
            </div>

            {isEditingIp ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={hostIp}
                  onChange={(e) => handleIpChange(e.target.value)}
                  placeholder="Ej. 192.168.1.7"
                  className={`w-full px-2 py-1 rounded-lg border text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                  {mobileUrl}
                </span>
                <button
                  onClick={handleCopy}
                  title="Copiar enlace"
                  className={`p-1 rounded-md border transition shrink-0 ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 hover:text-white'
                      : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex justify-end ${
          isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
        }`}>
          <button
            onClick={onClose}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-600/20"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, AlertCircle } from "lucide-react";

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const [error, setError] = useState<string | null>(null);

  // Play a soft beep sound on successful scan
  const playBeep = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.type = "sine";
      osc.frequency.value = 800; // Frequency in Hz
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1); // Play for 100ms
    } catch (err) {
      console.warn("Audio not supported", err);
    }
  };

  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);

  // Update refs when props change so we don't need them in useEffect dependencies
  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onScan, onClose]);

  const initRef = useRef(false);

  useEffect(() => {
    let html5QrCode: Html5Qrcode;
    let isScanning = false;
    let isMounted = true;

    const startScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          throw new Error("لم يتم العثور على كاميرا في هذا الجهاز.");
        }
        
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
        const cameraId = backCamera ? backCamera.id : devices[0].id;

        const { Html5QrcodeSupportedFormats } = await import("html5-qrcode");

        html5QrCode = new Html5Qrcode("reader", {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE
          ]
        });

        html5QrCode.start(
          cameraId,
          {
            fps: 10,
            disableFlip: false,
            videoConstraints: {
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          },
          (decodedText) => {
            if (isMounted) {
              playBeep();
              onScanRef.current(decodedText);
              if (isScanning) {
                html5QrCode.stop().then(() => {
                  isScanning = false;
                  onCloseRef.current();
                }).catch(console.error);
              }
            }
          },
          (err) => {
            // Ignore background scanning errors
          }
        ).then(() => {
          isScanning = true;
        }).catch((err: any) => {
          if (isMounted) setError("فشل بدء الكاميرا، يرجى التأكد من عدم استخدامها في تطبيق آخر.");
        });
      } catch (err: any) {
        if (isMounted) setError(err.message || "الرجاء السماح بالوصول للكاميرا.");
      }
    };
    
    startScanner();

    return () => {
      isMounted = false;
      if (isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, []); // Run ONLY once on mount

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md m-4 overflow-hidden animate-fade-in-up" 
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-600" />
            مسح الباركود بالكاميرا
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
              <p className="text-rose-600 font-semibold">{error}</p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black min-h-[300px]">
              {/* Camera Feed Container for HTML5-QRCode */}
              <div id="reader" className="w-full h-full object-cover"></div>
              
              {/* Scanning Overlay UI */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <p className="absolute bottom-6 text-white text-sm font-semibold bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                  وجه الكاميرا نحو الباركود مباشرة
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button onClick={onClose} className="btn-ghost w-full">إلغاء الأمر</button>
        </div>
      </div>
    </div>
  );
}

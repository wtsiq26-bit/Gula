"use client";

// ──────────────────────────────────────────────────────────────
// Gula PMS — Point of Sale Page (Phase 3)
// Full POS interface with:
//   - Global barcode scanner listener (HID keyboard wedge)
//   - Manual medicine search
//   - Cart management with quantity controls
//   - Checkout with stock deduction
//   - Thermal receipt printing (80mm/58mm via CSS @media print)
//   - PDF invoice download
// ──────────────────────────────────────────────────────────────

import { useEffect, useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

export default function POSPage() {
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const searchInputRef = useRef(null);

  // ─── Global Barcode Scanner Listener (HID Keyboard Wedge) ──
  // Barcode scanners act as HID keyboards, typing rapidly and
  // ending with Enter. We detect rapid keystrokes (< 50ms gap)
  // to differentiate scanner input from human typing.
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = 0;
    const SCAN_THRESHOLD = 50; // Max ms between keystrokes for scanner
    let scanTimer = null;

    const handleKeyDown = (e) => {
      const now = Date.now();

      // Ignore if user is typing in an input (except if it's rapid like a scanner)
      const activeTag = document.activeElement?.tagName;
      const isInputFocused = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";

      if (e.key === "Enter" && barcodeBuffer.length >= 3) {
        e.preventDefault();
        e.stopPropagation();
        const barcode = barcodeBuffer;
        barcodeBuffer = "";
        lookupBarcode(barcode);
        return;
      }

      // Only accumulate single printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (now - lastKeyTime < SCAN_THRESHOLD || barcodeBuffer.length === 0) {
          barcodeBuffer += e.key;
        } else {
          barcodeBuffer = isInputFocused ? "" : e.key;
        }
        lastKeyTime = now;

        // Clear buffer after 200ms of no input (human stopped typing)
        clearTimeout(scanTimer);
        scanTimer = setTimeout(() => {
          barcodeBuffer = "";
        }, 200);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      clearTimeout(scanTimer);
    };
  }, []);

  // ─── Barcode Lookup ────────────────────────────────────────
  const lookupBarcode = async (barcode) => {
    try {
      const res = await api.get(`/medicines/barcode/${barcode}`);
      if (res.data) {
        addToCart(res.data);
        toast.success(`Scanned: ${res.data.tradeName}`);
      }
    } catch {
      toast.error(`No medicine found for barcode: ${barcode}`);
    }
  };

  // ─── Manual Search ─────────────────────────────────────────
  const handleSearch = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(`/medicines?search=${encodeURIComponent(query)}&limit=10`);
      setSearchResults(res.data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // ─── Cart Management ──────────────────────────────────────
  const addToCart = (medicine) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.medicineId === medicine.id);
      if (existing) {
        if (existing.quantity >= medicine.stock) {
          toast.error(`Only ${medicine.stock} available for ${medicine.tradeName}`);
          return prev;
        }
        return prev.map((item) =>
          item.medicineId === medicine.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      if (medicine.stock <= 0) {
        toast.error(`${medicine.tradeName} is out of stock`);
        return prev;
      }
      return [...prev, {
        medicineId: medicine.id,
        tradeName: medicine.tradeName,
        genericName: medicine.genericName,
        sellingPrice: medicine.sellingPrice,
        stock: medicine.stock,
        quantity: 1,
      }];
    });
    setSearchQuery("");
    setSearchResults([]);
  };

  const updateQuantity = (medicineId, delta) => {
    setCart((prev) => prev.map((item) => {
      if (item.medicineId !== medicineId) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return null;
      if (newQty > item.stock) {
        toast.error(`Only ${item.stock} available`);
        return item;
      }
      return { ...item, quantity: newQty };
    }).filter(Boolean));
  };

  const removeFromCart = (medicineId) => {
    setCart((prev) => prev.filter((item) => item.medicineId !== medicineId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ─── Checkout ──────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const res = await api.post("/sales", {
        items: cart.map(({ medicineId, quantity }) => ({ medicineId, quantity })),
        paymentMethod,
      });
      setLastSale(res.data);
      setCart([]);
      toast.success("Sale completed!");
    } catch (err) {
      toast.error(err.message || "Checkout failed.");
    } finally {
      setProcessing(false);
    }
  };

  // ─── Print Receipt ────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  // ─── Download PDF Invoice ─────────────────────────────────
  const handleDownloadPDF = async (saleId) => {
    try {
      const token = localStorage.getItem("gula_token");
      const response = await fetch(`${API_BASE}/api/sales/${saleId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${saleId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download invoice.");
    }
  };

  return (
    <>
      <div className="p-6 h-screen flex flex-col animate-fade-in print:hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Point of Sale</h1>
            <p className="text-sm text-on-surface-variant mt-1">Scan barcode or search to add items</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-success-container text-secondary font-semibold">
              <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
              Scanner Active
            </span>
          </div>
        </div>

        {/* Main Content: Search + Cart */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-5 min-h-0">
          {/* ── Left Panel: Search & Results ─────────────────── */}
          <div className="lg:col-span-3 flex flex-col min-h-0">
            {/* Search Bar */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                <SearchIcon />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search medicine by name or barcode..."
                className="input-field pl-10 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searching && (
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                  <div className="spinner" style={{ width: 16, height: 16, borderColor: 'rgba(0,85,164,0.2)', borderTopColor: '#0055a4' }} />
                </div>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="bg-surface-container-lowest border border-border-light rounded-lg overflow-hidden mb-4 max-h-64 overflow-y-auto">
                {searchResults.map((med) => (
                  <button
                    key={med.id}
                    onClick={() => addToCart(med)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-container-low transition-colors text-left border-b border-border-light last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {med.image ? (
                        <img src={`${API_BASE}${med.image}`} alt="" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-outline"><PillIcon /></div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-on-surface">{med.tradeName}</p>
                        <p className="text-xs text-on-surface-variant">{med.genericName || med.category || ""} {med.barcode ? `· ${med.barcode}` : ""}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-on-surface font-mono">${med.sellingPrice?.toFixed(2)}</p>
                      <p className="text-xs text-on-surface-variant">{med.stock} in stock</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Last Sale Receipt Card */}
            {lastSale && (
              <div className="bg-success-container border border-secondary rounded-lg p-4 mb-4 animate-fade-in-up">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-secondary">✓ Sale Completed</p>
                    <p className="text-xs text-on-secondary-container font-mono">{lastSale.invoiceNumber} · ${lastSale.totalAmount?.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handlePrint} className="btn-ghost text-xs text-secondary">
                      <PrinterIcon /> Print
                    </button>
                    <button onClick={() => handleDownloadPDF(lastSale.id)} className="btn-ghost text-xs text-secondary">
                      <DownloadIcon /> PDF
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state or instructions */}
            {!searchQuery && cart.length === 0 && !lastSale && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-container flex items-center justify-center text-outline">
                    <BarcodeIcon />
                  </div>
                  <p className="text-sm font-medium text-on-surface-variant">Scan a barcode or search to begin</p>
                  <p className="text-xs text-outline mt-1">Barcode scanners are automatically detected</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Panel: Cart ────────────────────────────── */}
          <div className="lg:col-span-2 bg-surface-container-lowest border border-border-light rounded-lg flex flex-col min-h-0">
            {/* Cart Header */}
            <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
              <h3 className="text-sm font-semibold text-on-surface">
                Cart <span className="text-on-surface-variant font-normal">({cartItemCount} items)</span>
              </h3>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-error hover:underline">Clear all</button>
              )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-border-light">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-on-surface-variant">Cart is empty</div>
              ) : (
                cart.map((item) => (
                  <div key={item.medicineId} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{item.tradeName}</p>
                      <p className="text-xs text-on-surface-variant font-mono">${item.sellingPrice.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQuantity(item.medicineId, -1)} className="w-7 h-7 rounded bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm font-bold">−</button>
                      <span className="w-8 text-center text-sm font-semibold font-mono">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.medicineId, 1)} className="w-7 h-7 rounded bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm font-bold">+</button>
                    </div>
                    <p className="text-sm font-bold text-on-surface font-mono w-16 text-right">${(item.sellingPrice * item.quantity).toFixed(2)}</p>
                    <button onClick={() => removeFromCart(item.medicineId)} className="p-1 rounded hover:bg-error-container text-on-surface-variant hover:text-error transition-colors">
                      <XSmallIcon />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="border-t border-border-light p-4 space-y-3">
                {/* Payment Method */}
                <div className="flex gap-2">
                  {["CASH", "CARD", "MOBILE"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                        paymentMethod === m
                          ? "bg-primary-fixed text-primary border-primary"
                          : "bg-surface-container text-on-surface-variant border-border-light hover:bg-surface-container-high"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant">Total</span>
                  <span className="text-2xl font-bold text-on-surface font-mono">${cartTotal.toFixed(2)}</span>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={processing}
                  className="btn-primary w-full py-3.5 text-base"
                >
                  {processing ? (
                    <><span className="spinner" /> Processing...</>
                  ) : (
                    <><CheckoutIcon /> Complete Sale</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
         THERMAL RECEIPT — Print-Only View
         Optimized for 80mm and 58mm thermal receipt printers.
         Uses @media print CSS to show only this section.
         ══════════════════════════════════════════════════════════ */}
      {lastSale && (
        <div className="hidden print:block" id="receipt">
          <div style={{ width: '72mm', margin: '0 auto', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.4' }}>
            {/* Pharmacy Header */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {JSON.parse(localStorage.getItem("gula_pharmacy") || "{}").name || "Gula Pharmacy"}
              </div>
              <div style={{ fontSize: '10px' }}>
                {JSON.parse(localStorage.getItem("gula_pharmacy") || "{}").location || ""}
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

            {/* Invoice Info */}
            <div style={{ fontSize: '10px' }}>
              <div>Invoice: {lastSale.invoiceNumber}</div>
              <div>Date: {new Date(lastSale.createdAt).toLocaleString()}</div>
              <div>Cashier: {lastSale.user?.username}</div>
              <div>Payment: {lastSale.paymentMethod}</div>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

            {/* Items */}
            <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingBottom: '2px' }}>Item</th>
                  <th style={{ textAlign: 'center', paddingBottom: '2px' }}>Qty</th>
                  <th style={{ textAlign: 'right', paddingBottom: '2px' }}>Price</th>
                  <th style={{ textAlign: 'right', paddingBottom: '2px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {lastSale.items?.map((item, i) => (
                  <tr key={i}>
                    <td style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.medicine?.tradeName}
                    </td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{item.unitPrice?.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>{(item.quantity * item.unitPrice)?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

            {/* Total */}
            <div style={{ textAlign: 'right', fontSize: '14px', fontWeight: 'bold', margin: '4px 0' }}>
              TOTAL: ${lastSale.totalAmount?.toFixed(2)}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '8px' }}>
              <div>Thank you for your purchase!</div>
              <div>Powered by Gula PMS</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Print Stylesheet ──────────────────────────────────── */}
      <style jsx global>{`
        @media print {
          /* Hide everything except the receipt */
          body > *:not(#receipt),
          .print\\:hidden,
          header, nav, aside, footer,
          [class*="Sidebar"],
          [class*="Toaster"] {
            display: none !important;
          }

          /* Show receipt */
          .print\\:block,
          #receipt {
            display: block !important;
          }

          /* Reset page for thermal printer */
          @page {
            size: 80mm auto;
            margin: 2mm;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* 58mm printer override */
          @page narrow {
            size: 58mm auto;
            margin: 1mm;
          }
        }
      `}</style>
    </>
  );
}

// ─── Icons ───────────────────────────────────────────────────
function SearchIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function PillIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>; }
function BarcodeIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5v14"/><path d="M8 5v14"/><path d="M12 5v14"/><path d="M17 5v14"/><path d="M21 5v14"/><path d="M6 5v14"/><path d="M10 5v14"/><path d="M14 5v14"/><path d="M19 5v14"/></svg>; }
function XSmallIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function CheckoutIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>; }
function PrinterIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>; }
function DownloadIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }

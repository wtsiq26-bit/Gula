"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useReactToPrint } from "react-to-print";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { usePOSNavigation } from "@/hooks/usePOSNavigation";
import { Search, MonitorCheck, Plus, Minus, Trash2, CheckCircle2, Download, Printer, Camera } from "lucide-react";
import SkeletonTable from "@/components/SkeletonTable";
import CameraScanner from "@/components/CameraScanner";
import { formatCurrency } from "@/lib/formatCurrency";

interface CartItem {
  medicineId: string;
  tradeName: string;
  sellingPrice: number;
  stock: number;
  quantity: number;
}

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [quickAccess, setQuickAccess] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Checkout Modal State
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [lastSale, setLastSale] = useState<any>(null);

  // Camera Scanner State
  const [showScanner, setShowScanner] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
  });

  // ─── Keyboard Hooks ─────────────────────────────────────────
  useBarcodeScanner(async (barcode) => {
    try {
      const res = await api.get(`/medicines/barcode/${barcode}`);
      if (res.data) {
        addToCart(res.data);
        toast.success(`تم مسح: ${res.data.tradeName}`);
      }
    } catch {
      toast.error(`باركود غير صالح: ${barcode}`);
    }
  });

  usePOSNavigation({
    onFocusSearch: () => {
      searchInputRef.current?.focus();
    },
    onTriggerCheckout: () => {
      if (cart.length > 0 && !showCheckout && !lastSale) {
        setShowCheckout(true);
      }
    },
    onClearCart: () => {
      if (cart.length > 0 && !showCheckout) {
        if (confirm("هل أنت متأكد من مسح الفاتورة الحالية؟")) {
          setCart([]);
          toast.success("تم مسح الفاتورة");
        }
      } else if (showCheckout) {
        setShowCheckout(false); 
      }
    }
  });

  // ─── Data Fetching ──────────────────────────────────────────
  useEffect(() => {
    const fetchQuickAccess = async () => {
      try {
        const res: any = await api.get(`/medicines?limit=12`);
        setQuickAccess(Array.isArray(res) ? res : (res?.data || []));
      } catch (e) {
        console.error(e);
      }
    };
    fetchQuickAccess();
  }, []);

  const handleSearch = useCallback(async (query: string) => {
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

  // ─── Cart Management ───────────────────────────────────────
  const addToCart = (medicine: any) => {
    const existing = cart.find((item) => item.medicineId === medicine.id);
    if (existing) {
      if (existing.quantity >= medicine.stock) {
        toast.error(`وصلت للحد الأقصى للمخزون (${medicine.stock}) للمادة ${medicine.tradeName}`);
        return;
      }
      setCart(cart.map((item) =>
        item.medicineId === medicine.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      if (medicine.stock <= 0) {
        toast.error(`${medicine.tradeName} نفذت من المخزون`);
        return;
      }
      setCart([...cart, {
        medicineId: medicine.id,
        tradeName: medicine.tradeName,
        sellingPrice: medicine.sellingPrice,
        stock: medicine.stock,
        quantity: 1,
      }]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const updateQuantity = (medicineId: string, delta: number) => {
    const itemToUpdate = cart.find(item => item.medicineId === medicineId);
    if (!itemToUpdate) return;
    
    const newQty = itemToUpdate.quantity + delta;
    if (newQty <= 0) {
      setCart(cart.filter(item => item.medicineId !== medicineId));
      return;
    }
    if (newQty > itemToUpdate.stock) {
      toast.error(`المخزون الأقصى المتوفر هو ${itemToUpdate.stock}`);
      return;
    }
    setCart(cart.map((item) => 
      item.medicineId === medicineId ? { ...item, quantity: newQty } : item
    ));
  };

  const removeFromCart = (medicineId: string) => {
    setCart((prev) => prev.filter((item) => item.medicineId !== medicineId));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);

  // ─── Checkout ──────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0 || processing) return;
    setProcessing(true);
    try {
      const payload = {
        items: cart.map(item => ({ medicineId: item.medicineId, quantity: item.quantity })),
        paymentMethod,
        amountPaid: amountPaid ? parseFloat(amountPaid) : totalAmount
      };
      const res = await api.post("/sales", payload);
      setLastSale(res.data);
      setCart([]);
      setShowCheckout(false);
      setAmountPaid("");
      toast.success("تمت عملية البيع بنجاح!");
    } catch (err: any) {
      toast.error(err.message || "فشل في إتمام عملية البيع");
    } finally {
      setProcessing(false);
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const res = await api.get(`/sales/${invoiceId}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error("فشل تحميل ملف الـ PDF للفاتورة");
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] animate-fade-in flex gap-6 print:hidden">
      
      {/* ─── LEFT PANEL (in RTL, this is the main 8 cols) ─── */}
      <div className="flex-1 lg:w-2/3 flex flex-col bg-surface-container-lowest dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden relative">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MonitorCheck className="w-5 h-5 text-emerald-600" /> الفاتورة الحالية
          </h2>
          <div className="text-sm text-slate-500 flex gap-4">
            <span className="hidden sm:inline">اختصار F4: بحث</span>
            <span className="hidden sm:inline">F12: محاسبة</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-start">
            <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="p-4 text-start">اسم المادة</th>
                <th className="p-4 text-center">الكمية</th>
                <th className="p-4 text-end">سعر الوحدة</th>
                <th className="p-4 text-end">الإجمالي</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500">
                    <p className="mb-2">الفاتورة فارغة</p>
                    <p className="text-xs opacity-70">امسح الباركود أو استخدم البحث لإضافة مواد.</p>
                  </td>
                </tr>
              ) : (
                cart.map((item) => (
                  <tr key={item.medicineId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 font-semibold text-start">{item.tradeName}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => updateQuantity(item.medicineId, -1)} className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-bold text-lg" dir="ltr">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.medicineId, 1)} className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-end font-mono" dir="ltr">{formatCurrency(item.sellingPrice)}</td>
                    <td className="p-4 text-end font-mono font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">
                      {formatCurrency(item.sellingPrice * item.quantity)}
                    </td>
                    <td className="p-4 text-end">
                      <button onClick={() => removeFromCart(item.medicineId)} className="p-1.5 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Total & Checkout Bar */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-1">المجموع الكلي</p>
            <p className="text-5xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight" dir="ltr">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <button 
            onClick={() => setShowCheckout(true)} 
            disabled={cart.length === 0}
            className="btn-primary !px-8 !py-4 text-lg !rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            <CheckCircle2 className="w-6 h-6 me-2" />
            محاسبة (F12)
          </button>
        </div>
      </div>

      {/* ─── RIGHT PANEL (in RTL, this is the 4 cols) ─── */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6">
        
        {/* Search */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                className="input-field ps-11 text-lg py-3"
                placeholder="بحث (F4)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searching && <div className="absolute end-4 top-1/2 -translate-y-1/2 spinner border-emerald-600 w-4 h-4" />}
            </div>
            <button 
              onClick={() => setShowScanner(true)}
              className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 px-4 rounded-xl flex items-center justify-center hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors shadow-sm"
              title="مسح بالكاميرا"
            >
              <Camera className="w-6 h-6" />
            </button>
          </div>

          {/* Search Dropdown */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-20 relative">
              {searchResults.map((med) => (
                <button
                  key={med.id}
                  onClick={() => addToCart(med)}
                  className="w-full text-start px-4 py-3 border-b border-slate-200 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex justify-between items-center"
                >
                  <span className="font-semibold">{med.tradeName}</span>
                  <span className="text-emerald-600 font-mono font-bold" dir="ltr">{formatCurrency(med.sellingPrice)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Access */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex-1 flex flex-col overflow-hidden">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">مواد الوصول السريع</h3>
          <div className="flex-1 overflow-y-auto pe-2">
            <div className="grid grid-cols-2 gap-3">
              {quickAccess.length === 0 && Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4 mb-2"></div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/4"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/3"></div>
                  </div>
                </div>
              ))}
              {quickAccess.map(med => (
                <button 
                  key={med.id} 
                  onClick={() => addToCart(med)}
                  className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-transparent hover:border-emerald-600 transition-all text-start group"
                >
                  <div className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">{med.tradeName}</div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-slate-500">{med.stock} متبقي</span>
                    <span className="text-emerald-600 font-mono font-bold" dir="ltr">{formatCurrency(med.sellingPrice)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Checkout Modal ─── */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowCheckout(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg m-4 overflow-hidden animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="bg-emerald-600 p-6 text-white text-center">
              <h2 className="text-2xl font-bold">إتمام البيع</h2>
              <p className="text-emerald-100 mt-1">يرجى تأكيد تفاصيل الدفع</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="text-center">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">المبلغ الإجمالي</p>
                <p className="text-6xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tracking-tighter" dir="ltr">
                  {formatCurrency(totalAmount)}
                </p>
              </div>

              <div>
                <label className="input-label text-center block">المبلغ المدفوع</label>
                <input 
                  type="number" 
                  className="input-field text-3xl font-mono py-4 text-center font-bold" 
                  placeholder={totalAmount.toString()}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  dir="ltr"
                  autoFocus
                />
              </div>

              {amountPaid && parseFloat(amountPaid) >= totalAmount && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                  <p className="text-sm text-slate-500">المتبقي للعميل</p>
                  <p className="text-3xl font-bold text-emerald-600 font-mono mt-1" dir="ltr">
                    {formatCurrency(parseFloat(amountPaid) - totalAmount)}
                  </p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowCheckout(false)} className="flex-1 btn-ghost !py-4 text-lg">إلغاء (Esc)</button>
                <button 
                  onClick={handleCheckout} 
                  disabled={processing || (amountPaid !== "" && parseFloat(amountPaid) < totalAmount)}
                  className="flex-1 btn-primary !py-4 text-lg"
                >
                  {processing ? "جاري المعالجة..." : "تأكيد الدفع"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Last Sale Receipt Modal ─── */}
      {lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fade-in print:hidden">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 max-w-sm w-full text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">تمت عملية الدفع بنجاح</h2>
            <p className="text-slate-500 mt-2 font-mono text-lg">{lastSale.invoiceNumber || lastSale.invoiceNo || lastSale.id}</p>
            
            <div className="my-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-sm text-slate-500">الإجمالي المدفوع</p>
              <p className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1" dir="ltr">{formatCurrency(lastSale.totalAmount)}</p>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => downloadInvoice(lastSale.id)} className="flex-1 btn-secondary">
                <Download className="w-4 h-4 me-2" /> PDF
              </button>
              <button onClick={() => handlePrint()} className="flex-1 btn-secondary">
                <Printer className="w-4 h-4 me-2" /> طباعة
              </button>
            </div>
            <button onClick={() => setLastSale(null)} className="w-full btn-primary mt-4">
              فاتورة جديدة
            </button>
          </div>
        </div>
      )}

      {/* ─── Hidden Thermal Receipt Component for react-to-print ─── */}
      <div className="hidden">
        <div ref={receiptRef} className="p-6 bg-white text-black font-mono text-xs text-right w-[300px] mx-auto" dir="rtl">
          <div className="text-center font-bold text-base mb-1">صيدلية النور</div>
          <div className="text-center text-xs text-slate-600 mb-2">بغداد، العراق</div>
          <div className="border-b border-dashed border-black my-2"></div>
          
          {lastSale && (
            <>
              <div className="flex justify-between text-xs my-1">
                <span>رقم الفاتورة:</span>
                <span className="font-bold">{lastSale.invoiceNumber || lastSale.invoiceNo || lastSale.id}</span>
              </div>
              <div className="flex justify-between text-xs my-1">
                <span>التاريخ:</span>
                <span>{new Date(lastSale.createdAt).toLocaleString("ar-IQ")}</span>
              </div>
              {lastSale.user?.username && (
                <div className="flex justify-between text-xs my-1">
                  <span>الكاشير:</span>
                  <span>{lastSale.user.username}</span>
                </div>
              )}
              
              <div className="border-b border-dashed border-black my-2"></div>
              
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black">
                    <th className="pb-1 text-right font-bold">المادة</th>
                    <th className="pb-1 text-center font-bold">الكمية</th>
                    <th className="pb-1 text-left font-bold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-slate-300">
                  {lastSale.items && lastSale.items.map((item: any, i: number) => {
                    const name = item.medicine?.tradeName || item.tradeName || "مادة";
                    const qty = item.quantity || 1;
                    const price = item.unitPrice || item.sellingPrice || 0;
                    const subtotal = item.subtotal || (qty * price);
                    return (
                      <tr key={i}>
                        <td className="py-1 text-right font-semibold">{name}</td>
                        <td className="py-1 text-center">{qty}</td>
                        <td className="py-1 text-left font-bold" dir="ltr">{formatCurrency(subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="border-b border-dashed border-black my-2"></div>
              <div className="flex justify-between items-center text-sm font-extrabold my-2">
                <span>المجموع:</span>
                <span dir="ltr" className="text-base">{formatCurrency(lastSale.totalAmount)}</span>
              </div>
              <div className="border-b border-dashed border-black my-2"></div>
              <div className="text-center text-xs mt-4">شكراً لزيارتكم! نتمنى لكم الشفاء العاجل.</div>
            </>
          )}
        </div>
      </div>

      {/* ─── Camera Scanner Modal ─── */}
      {showScanner && (
        <CameraScanner 
          onClose={() => setShowScanner(false)}
          onScan={async (barcode) => {
            try {
              const res = await api.get(`/medicines/barcode/${barcode}`);
              if (res.data) {
                addToCart(res.data);
                toast.success(`تم مسح: ${res.data.tradeName}`);
              }
            } catch {
              toast.error(`باركود غير صالح: ${barcode}`);
            }
          }}
        />
      )}
    </div>
  );
}

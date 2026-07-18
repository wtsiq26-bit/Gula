"use client";

// ──────────────────────────────────────────────────────────────
// Gula PMS — Inventory Management Page (Phase 2)
// Medicine listing with search, add/edit modal, delete
// confirmation, and image upload.
// ──────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

// ─── Zod Schema for Medicine Form ────────────────────────────
const medicineSchema = z.object({
  tradeName: z.string().min(1, "Trade name is required"),
  genericName: z.string().optional(),
  category: z.string().optional(),
  barcode: z.string().optional(),
  costPrice: z.string().optional(),
  sellingPrice: z.string().optional(),
  stock: z.string().optional(),
  expiryDate: z.string().optional(),
  supplierId: z.string().optional(),
});

export default function InventoryPage() {
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(medicineSchema),
  });

  const fetchMedicines = useCallback(async () => {
    try {
      const res = await api.get(`/medicines?search=${search}&limit=200`);
      setMedicines(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get("/suppliers");
      setSuppliers(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchMedicines();
    fetchSuppliers();
  }, [fetchMedicines]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchMedicines(), 300);
    return () => clearTimeout(timer);
  }, [search, fetchMedicines]);

  // ─── Open Add/Edit Modal ───────────────────────────────────
  const openModal = (medicine = null) => {
    if (medicine) {
      setEditing(medicine);
      reset({
        tradeName: medicine.tradeName || "",
        genericName: medicine.genericName || "",
        category: medicine.category || "",
        barcode: medicine.barcode || "",
        costPrice: String(medicine.costPrice || ""),
        sellingPrice: String(medicine.sellingPrice || ""),
        stock: String(medicine.stock || ""),
        expiryDate: medicine.expiryDate ? new Date(medicine.expiryDate).toISOString().split("T")[0] : "",
        supplierId: medicine.supplierId || "",
      });
      setImagePreview(medicine.image ? `${API_BASE}${medicine.image}` : null);
    } else {
      setEditing(null);
      reset({ tradeName: "", genericName: "", category: "", barcode: "", costPrice: "", sellingPrice: "", stock: "", expiryDate: "", supplierId: "" });
      setImagePreview(null);
    }
    setImageFile(null);
    setShowModal(true);
  };

  // ─── Handle Image Selection ────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // ─── Submit Form ───────────────────────────────────────────
  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, val]) => {
        if (val) formData.append(key, val);
      });
      if (imageFile) formData.append("image", imageFile);

      if (editing) {
        await api.put(`/medicines/${editing.id}`, formData);
        toast.success("Medicine updated!");
      } else {
        await api.post("/medicines", formData);
        toast.success("Medicine added!");
      }
      setShowModal(false);
      fetchMedicines();
    } catch (err) {
      toast.error(err.message || "Failed to save medicine.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete Medicine ───────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/medicines/${deleteTarget.id}`);
      toast.success("Medicine deleted.");
      setDeleteTarget(null);
      fetchMedicines();
    } catch (err) {
      toast.error(err.message || "Failed to delete medicine.");
    }
  };

  const getStockBadge = (stock) => {
    if (stock === 0) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-error-container text-error">Out of stock</span>;
    if (stock <= 10) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warning-container text-warning">{stock} left</span>;
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-success-container text-secondary">{stock} in stock</span>;
  };

  const getExpiryStatus = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return <span className="text-xs text-error font-semibold">Expired</span>;
    if (diffDays <= 30) return <span className="text-xs text-warning font-semibold">{diffDays}d left</span>;
    return <span className="text-xs text-on-surface-variant">{d.toLocaleDateString()}</span>;
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Inventory</h1>
          <p className="text-sm text-on-surface-variant mt-1">{medicines.length} medicines in stock</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary">
          <PlusIcon /> Add Medicine
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Search by name, generic name, or barcode..."
          className="input-field pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Medicine Table */}
      <div className="bg-surface-container-lowest border border-border-light rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-on-surface-variant">Medicine</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-on-surface-variant">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-on-surface-variant">Barcode</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-on-surface-variant">Cost</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-on-surface-variant">Price</th>
                <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-on-surface-variant">Stock</th>
                <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-on-surface-variant">Expiry</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-on-surface-variant">Supplier</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-on-surface-variant">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {loading ? (
                <tr><td colSpan="9" className="py-12 text-center text-on-surface-variant"><div className="spinner mx-auto" style={{ borderColor:'rgba(0,85,164,0.2)', borderTopColor:'#0055a4' }}/></td></tr>
              ) : medicines.length === 0 ? (
                <tr><td colSpan="9" className="py-12 text-center text-on-surface-variant">No medicines found. Add your first medicine to get started.</td></tr>
              ) : (
                medicines.map((med, i) => (
                  <tr key={med.id} className={`hover:bg-surface-container-low transition-colors ${i % 2 === 0 ? '' : 'bg-surface'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {med.image ? (
                          <img src={`${API_BASE}${med.image}`} alt="" className="w-8 h-8 rounded object-cover border border-border-light" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-outline"><PillIcon /></div>
                        )}
                        <div>
                          <p className="font-medium text-on-surface">{med.tradeName}</p>
                          {med.genericName && <p className="text-xs text-on-surface-variant">{med.genericName}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{med.category || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{med.barcode || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">${med.costPrice?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">${med.sellingPrice?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">{getStockBadge(med.stock)}</td>
                    <td className="px-4 py-3 text-center">{getExpiryStatus(med.expiryDate)}</td>
                    <td className="px-4 py-3 text-on-surface-variant text-xs">{med.supplier?.name || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openModal(med)} className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors" title="Edit">
                          <EditIcon />
                        </button>
                        <button onClick={() => setDeleteTarget(med)} className="p-1.5 rounded hover:bg-error-container text-on-surface-variant hover:text-error transition-colors" title="Delete">
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add/Edit Modal ───────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="bg-surface-container-lowest rounded-xl border border-border-light shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border-light flex items-center justify-between sticky top-0 bg-surface-container-lowest z-10">
              <h2 className="text-lg font-semibold text-on-surface">{editing ? "Edit Medicine" : "Add New Medicine"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-surface-container text-on-surface-variant"><XIcon /></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Trade Name *</label>
                  <input className={`input-field ${errors.tradeName ? "input-error" : ""}`} {...register("tradeName")} />
                  {errors.tradeName && <p className="field-error">{errors.tradeName.message}</p>}
                </div>
                <div>
                  <label className="input-label">Generic Name</label>
                  <input className="input-field" {...register("genericName")} />
                </div>
                <div>
                  <label className="input-label">Category</label>
                  <input className="input-field" placeholder="e.g., Antibiotics" {...register("category")} />
                </div>
                <div>
                  <label className="input-label">Barcode</label>
                  <input className="input-field font-mono" {...register("barcode")} />
                </div>
                <div>
                  <label className="input-label">Cost Price ($)</label>
                  <input type="number" step="0.01" className="input-field font-mono" {...register("costPrice")} />
                </div>
                <div>
                  <label className="input-label">Selling Price ($)</label>
                  <input type="number" step="0.01" className="input-field font-mono" {...register("sellingPrice")} />
                </div>
                <div>
                  <label className="input-label">Stock Quantity</label>
                  <input type="number" className="input-field font-mono" {...register("stock")} />
                </div>
                <div>
                  <label className="input-label">Expiry Date</label>
                  <input type="date" className="input-field" {...register("expiryDate")} />
                </div>
                <div>
                  <label className="input-label">Supplier</label>
                  <select className="input-field" {...register("supplierId")}>
                    <option value="">— No Supplier —</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Image</label>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="input-field text-xs file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary-fixed file:text-primary hover:file:bg-surface-container-high cursor-pointer" />
                </div>
              </div>

              {imagePreview && (
                <div className="flex items-center gap-3">
                  <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-lg object-cover border border-border-light" />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="text-xs text-error hover:underline">Remove</button>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-border-light">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <><span className="spinner" /> Saving...</> : editing ? "Update Medicine" : "Add Medicine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteTarget(null)}>
          <div className="bg-surface-container-lowest rounded-xl border border-border-light shadow-xl w-full max-w-sm m-4 p-6 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-on-surface">Delete Medicine</h3>
            <p className="text-sm text-on-surface-variant mt-2">
              Are you sure you want to delete <strong>{deleteTarget.tradeName}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)} className="btn-ghost">Cancel</button>
              <button onClick={handleDelete} className="btn-primary" style={{ background: '#ba1a1a' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Icons ───────────────────────────────────────────────────
function PlusIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function SearchIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function EditIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>; }
function TrashIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>; }
function PillIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>; }
function XIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }

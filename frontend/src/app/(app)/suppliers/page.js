"use client";

// ──────────────────────────────────────────────────────────────
// Gula PMS — Supplier Management Page (Phase 4)
// Full CRUD for supplier companies with search, add/edit modal,
// and delete confirmation.
// ──────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

// ─── Zod Schema ──────────────────────────────────────────────
const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
});

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(supplierSchema),
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await api.get(`/suppliers?search=${search}`);
      setSuppliers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    const timer = setTimeout(() => fetchSuppliers(), 300);
    return () => clearTimeout(timer);
  }, [search, fetchSuppliers]);

  const openModal = (supplier = null) => {
    if (supplier) {
      setEditing(supplier);
      reset({
        name: supplier.name || "",
        contactPerson: supplier.contactPerson || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
      });
    } else {
      setEditing(null);
      reset({ name: "", contactPerson: "", phone: "", email: "", address: "" });
    }
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, data);
        toast.success("Supplier updated!");
      } else {
        await api.post("/suppliers", data);
        toast.success("Supplier added!");
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) {
      toast.error(err.message || "Failed to save supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/suppliers/${deleteTarget.id}`);
      toast.success("Supplier deleted.");
      setDeleteTarget(null);
      fetchSuppliers();
    } catch (err) {
      toast.error(err.message || "Failed to delete supplier.");
    }
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Suppliers</h1>
          <p className="text-sm text-on-surface-variant mt-1">{suppliers.length} supplier companies</p>
        </div>
        <button onClick={() => openModal()} className="btn-secondary">
          <PlusIcon /> Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Search by name, contact person, or phone..."
          className="input-field pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center">
            <div className="spinner mx-auto" style={{ borderColor: 'rgba(0,85,164,0.2)', borderTopColor: '#0055a4' }} />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-on-surface-variant">
            No suppliers found. Add your first supplier to get started.
          </div>
        ) : (
          suppliers.map((supplier) => (
            <div key={supplier.id} className="bg-surface-container-lowest border border-border-light rounded-lg p-5 hover:shadow-sm transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant">
                  <BuildingIcon />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(supplier)} className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors" title="Edit">
                    <EditIcon />
                  </button>
                  <button onClick={() => setDeleteTarget(supplier)} className="p-1.5 rounded hover:bg-error-container text-on-surface-variant hover:text-error transition-colors" title="Delete">
                    <TrashIcon />
                  </button>
                </div>
              </div>

              <h3 className="text-base font-semibold text-on-surface">{supplier.name}</h3>

              {supplier.contactPerson && (
                <div className="flex items-center gap-2 mt-2 text-xs text-on-surface-variant">
                  <UserIcon /> {supplier.contactPerson}
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant">
                  <PhoneIcon /> {supplier.phone}
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant">
                  <MailIcon /> {supplier.email}
                </div>
              )}
              {supplier.address && (
                <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant">
                  <MapIcon /> {supplier.address}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-border-light">
                <span className="text-xs text-on-surface-variant">
                  {supplier._count?.medicines || 0} medicines supplied
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Add/Edit Modal ───────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="bg-surface-container-lowest rounded-xl border border-border-light shadow-xl w-full max-w-lg m-4 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
              <h2 className="text-lg font-semibold text-on-surface">{editing ? "Edit Supplier" : "Add Supplier"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-surface-container text-on-surface-variant"><XIcon /></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="input-label">Company Name *</label>
                <input className={`input-field ${errors.name ? "input-error" : ""}`} placeholder="e.g., PharmaCorp" {...register("name")} />
                {errors.name && <p className="field-error">{errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Contact Person</label>
                  <input className="input-field" placeholder="Full name" {...register("contactPerson")} />
                </div>
                <div>
                  <label className="input-label">Phone</label>
                  <input className="input-field" placeholder="+964 xxx xxx" {...register("phone")} />
                </div>
              </div>
              <div>
                <label className="input-label">Email</label>
                <input type="email" className="input-field" placeholder="contact@supplier.com" {...register("email")} />
              </div>
              <div>
                <label className="input-label">Address</label>
                <textarea className="input-field" rows={2} placeholder="Full address" {...register("address")} />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-light">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <><span className="spinner" /> Saving...</> : editing ? "Update Supplier" : "Add Supplier"}
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
            <h3 className="text-lg font-semibold text-on-surface">Delete Supplier</h3>
            <p className="text-sm text-on-surface-variant mt-2">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? Medicines linked to this supplier will have their supplier unset.
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
function BuildingIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/></svg>; }
function UserIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function PhoneIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>; }
function MailIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>; }
function MapIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>; }
function XIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }

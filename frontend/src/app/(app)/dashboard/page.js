"use client";

// ──────────────────────────────────────────────────────────────
// Gula PMS — Dashboard Page (Phase 4)
// Comprehensive analytics dashboard with KPI cards, alerts,
// and recent activity.
// ──────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get("/dashboard/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner" style={{ borderColor: 'rgba(0,85,164,0.2)', borderTopColor: '#0055a4', width: 32, height: 32 }} />
      </div>
    );
  }

  const { overview, sales, recentSales, alerts } = stats || {};

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Dashboard</h1>
        <p className="text-sm text-on-surface-variant mt-1">Overview of your pharmacy operations</p>
      </div>

      {/* ── KPI Cards Row 1: Sales ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Today's Revenue"
          value={`$${(sales?.todayRevenue || 0).toFixed(2)}`}
          subtitle={`${sales?.todayCount || 0} sales today`}
          icon={<DollarIcon />}
          color="primary"
        />
        <KPICard
          title="Monthly Revenue"
          value={`$${(sales?.monthRevenue || 0).toFixed(2)}`}
          subtitle={`${sales?.monthCount || 0} sales this month`}
          icon={<CalendarIcon />}
          color="secondary"
        />
        <KPICard
          title="Total Stock"
          value={overview?.totalStock?.toLocaleString() || "0"}
          subtitle={`${overview?.totalMedicines || 0} medicine types`}
          icon={<BoxIcon />}
          color="info"
        />
        <KPICard
          title="Suppliers"
          value={overview?.totalSuppliers || 0}
          subtitle="Active suppliers"
          icon={<UsersIcon />}
          color="neutral"
        />
      </div>

      {/* ── Alert Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AlertCard
          title="Low Stock"
          count={overview?.lowStockCount || 0}
          color="warning"
          icon={<AlertTriangleIcon />}
        />
        <AlertCard
          title="Expiring Soon"
          count={overview?.expiringSoonCount || 0}
          color="error"
          icon={<ClockIcon />}
        />
        <AlertCard
          title="Expired"
          count={overview?.expiredCount || 0}
          color="danger"
          icon={<XCircleIcon />}
        />
      </div>

      {/* ── Bottom Grid: Recent Sales + Alerts ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-surface-container-lowest border border-border-light rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
            <h3 className="text-sm font-semibold text-on-surface">Recent Sales</h3>
            <span className="text-xs text-on-surface-variant">{recentSales?.length || 0} latest</span>
          </div>
          <div className="divide-y divide-border-light">
            {(!recentSales || recentSales.length === 0) ? (
              <div className="px-5 py-8 text-center text-sm text-on-surface-variant">No sales recorded yet</div>
            ) : (
              recentSales.map((sale) => (
                <div key={sale.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                  <div>
                    <p className="text-sm font-medium text-on-surface font-mono">{sale.invoiceNumber}</p>
                    <p className="text-xs text-on-surface-variant">
                      {sale.user?.username} · {sale._count?.items} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-on-surface">${sale.totalAmount.toFixed(2)}</p>
                    <p className="text-xs text-on-surface-variant">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-surface-container-lowest border border-border-light rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
            <h3 className="text-sm font-semibold text-on-surface">Low Stock Alerts</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-warning-container text-warning font-semibold">
              {alerts?.lowStock?.length || 0}
            </span>
          </div>
          <div className="divide-y divide-border-light">
            {(!alerts?.lowStock || alerts.lowStock.length === 0) ? (
              <div className="px-5 py-8 text-center text-sm text-on-surface-variant">All medicines are well-stocked</div>
            ) : (
              alerts.lowStock.map((med) => (
                <div key={med.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                  <div>
                    <p className="text-sm font-medium text-on-surface">{med.tradeName}</p>
                    <p className="text-xs text-on-surface-variant">${med.sellingPrice?.toFixed(2)}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    med.stock === 0
                      ? "bg-error-container text-error"
                      : "bg-warning-container text-warning"
                  }`}>
                    {med.stock} left
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Expiring Medicines ───────────────────────────────── */}
      {alerts?.expiring && alerts.expiring.length > 0 && (
        <div className="bg-surface-container-lowest border border-border-light rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
            <h3 className="text-sm font-semibold text-on-surface">⚠️ Expiring Within 30 Days</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-error-container text-error font-semibold">
              {alerts.expiring.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container text-on-surface-variant">
                <tr>
                  <th className="text-left px-5 py-2.5 font-semibold text-xs uppercase tracking-wider">Medicine</th>
                  <th className="text-left px-5 py-2.5 font-semibold text-xs uppercase tracking-wider">Expiry Date</th>
                  <th className="text-right px-5 py-2.5 font-semibold text-xs uppercase tracking-wider">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {alerts.expiring.map((med) => (
                  <tr key={med.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-5 py-3 font-medium">{med.tradeName}</td>
                    <td className="px-5 py-3 text-error font-mono text-xs">
                      {new Date(med.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">{med.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KPI Card Component ──────────────────────────────────────

function KPICard({ title, value, subtitle, icon, color }) {
  const colorMap = {
    primary: { bg: "bg-primary-fixed", text: "text-primary", icon: "text-primary-container" },
    secondary: { bg: "bg-secondary-container", text: "text-secondary", icon: "text-secondary" },
    info: { bg: "bg-surface-container-high", text: "text-primary-light", icon: "text-primary-light" },
    neutral: { bg: "bg-surface-container", text: "text-on-surface-variant", icon: "text-tertiary" },
  };
  const c = colorMap[color] || colorMap.neutral;

  return (
    <div className="bg-surface-container-lowest border border-border-light rounded-lg p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{title}</p>
          <p className="text-2xl font-bold text-on-surface mt-1 font-mono">{value}</p>
          <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center ${c.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Alert Card Component ────────────────────────────────────

function AlertCard({ title, count, color, icon }) {
  const colorMap = {
    warning: { bg: "bg-warning-container", text: "text-warning", border: "border-warning" },
    error: { bg: "bg-error-container", text: "text-error", border: "border-error" },
    danger: { bg: "bg-error-container", text: "text-on-error-container", border: "border-error" },
  };
  const c = colorMap[color] || colorMap.warning;

  return (
    <div className={`${c.bg} border ${c.border} border-opacity-20 rounded-lg p-4 flex items-center gap-3`}>
      <span className={c.text}>{icon}</span>
      <div>
        <p className={`text-2xl font-bold ${c.text} font-mono`}>{count}</p>
        <p className={`text-xs font-medium ${c.text} opacity-80`}>{title}</p>
      </div>
    </div>
  );
}

// ─── Icons ───────────────────────────────────────────────────

function DollarIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
}
function CalendarIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function BoxIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
}
function UsersIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function AlertTriangleIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}
function ClockIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function XCircleIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
}

import { useEffect, useMemo, useState } from "react";
import {
  Crown,
  MedalMilitary,
  Star,
  UserCircle,
  UsersThree,
  MagnifyingGlass,
  Trash,
  ClockCounterClockwise,
  X,
} from "@phosphor-icons/react";
import Layout from "../../components/Layout";
import API from "../../services/api";

const MEMBERSHIP = {
  thuong: {
    label: "Thường",
    icon: Star,
    tone: "bg-slate-100 text-slate-600",
    border: "border-slate-200 bg-slate-50",
    color: "text-slate-500",
  },
  bac: {
    label: "Bạc",
    icon: MedalMilitary,
    tone: "bg-blue-50 text-blue-700",
    border: "border-blue-200 bg-blue-50",
    color: "text-blue-500",
  },
  vang: {
    label: "Vàng",
    icon: Crown,
    tone: "bg-amber-50 text-amber-700",
    border: "border-amber-200 bg-amber-50",
    color: "text-amber-500",
  },
};

function MembershipBadge({ level }) {
  const cfg = MEMBERSHIP[level] || MEMBERSHIP.thuong;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${cfg.tone}`}>
      <Icon size={11} weight="fill" />
      {cfg.label}
    </span>
  );
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await API.get("/api/customers");
      setCustomers(res.data || []);
    } catch {
      setError("Không tải được danh sách khách hàng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(t);
  }, [success]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const counts = useMemo(
    () => ({
      total: customers.length,
      thuong: customers.filter((c) => c.membership === "thuong").length,
      bac: customers.filter((c) => c.membership === "bac").length,
      vang: customers.filter((c) => c.membership === "vang").length,
    }),
    [customers]
  );

  const loadHistory = async (customerId) => {
    setHistoryLoading(true);
    setHistory([]);
    try {
      const res = await API.get(`/api/customers/${customerId}/points-history`);
      setHistory(res.data || []);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelect = (customer) => {
    setSelected(customer);
    loadHistory(customer.id);
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Xóa khách hàng ${customer.full_name || customer.phone}?`)) return;
    try {
      await API.delete(`/api/customers/${customer.id}`);
      setSuccess("Đã xóa khách hàng.");
      if (selected?.id === customer.id) setSelected(null);
      fetchCustomers();
    } catch (err) {
      setError(err.response?.data?.message || "Không xóa được khách hàng.");
    }
  };

  return (
    <Layout>
      <div className="admin-page">
        <header className="admin-header">
          <div>
            <p className="admin-kicker">Quản trị</p>
            <h1 className="admin-title">Khách hàng thành viên</h1>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Tổng</p>
              <p className="mt-0.5 text-xl font-black text-slate-950">{counts.total}</p>
            </div>
          </div>
        </header>

        {(error || success) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-bold ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || success}
          </div>
        )}

        {/* Stats */}
        <section className="grid gap-3 xl:grid-cols-3">
          {[
            { key: "thuong", label: "Hạng Thường", icon: Star, tone: "bg-slate-100 text-slate-600" },
            { key: "bac", label: "Hạng Bạc", icon: MedalMilitary, tone: "bg-blue-50 text-blue-700" },
            { key: "vang", label: "Hạng Vàng", icon: Crown, tone: "bg-amber-50 text-amber-700" },
          ].map(({ key, label, icon: Icon, tone }) => (
            <article key={key} className="admin-panel-pad admin-lift">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">{label}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-400">
                    {key === "thuong" ? "0 – 999 điểm" : key === "bac" ? "1.000 – 4.999 điểm" : "5.000+ điểm"}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${tone}`}>
                  {counts[key]}
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* Table */}
          <div className="admin-panel flex min-h-[430px] flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
              <div>
                <h2 className="admin-section-title">Danh sách khách hàng</h2>
              </div>
              <div className="relative">
                <MagnifyingGlass
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm tên, SĐT, email..."
                  className="admin-field w-52 pl-8"
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <UsersThree size={36} weight="duotone" className="mx-auto mb-3 text-slate-300" />
                <p className="font-black text-slate-800">Chưa có khách hàng</p>
                <p className="mt-1 text-sm font-semibold text-slate-400">
                  Khách hàng sẽ xuất hiện khi đăng ký thành viên.
                </p>
              </div>
            ) : (
              <div className="max-h-[calc(100vh-320px)] overflow-auto">
                <table className="admin-table">
                  <thead>
                    <tr className="sticky top-0 z-10 bg-white">
                      <th>Khách hàng</th>
                      <th>Hạng</th>
                      <th>Điểm</th>
                      <th>Ngày tham gia</th>
                      <th className="text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((customer) => (
                      <tr
                        key={customer.id}
                        className={`cursor-pointer ${selected?.id === customer.id ? "bg-emerald-50" : ""}`}
                        onClick={() => handleSelect(customer)}
                      >
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-sm font-black text-white shrink-0">
                              {customer.full_name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-black text-slate-900">
                                {customer.full_name || "Chưa có tên"}
                              </p>
                              <p className="text-xs font-semibold text-slate-400">{customer.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <MembershipBadge level={customer.membership} />
                        </td>
                        <td>
                          <span className="font-black text-emerald-700">
                            {customer.points.toLocaleString("vi-VN")}
                          </span>
                        </td>
                        <td className="font-semibold text-slate-400">
                          {new Date(customer.created_at).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(customer); }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none"
                            aria-label={`Xóa ${customer.full_name}`}
                          >
                            <Trash size={17} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="admin-panel flex flex-col overflow-hidden">
            {!selected ? (
              <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
                <UserCircle size={44} weight="duotone" className="mb-3 text-slate-300" />
                <p className="text-sm font-black text-slate-400">Chọn khách hàng để xem chi tiết</p>
              </div>
            ) : (
              <>
                {/* Customer info */}
                <div className={`border-b border-slate-200 p-4 ${MEMBERSHIP[selected.membership]?.border || "bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm shrink-0">
                        <UserCircle
                          size={26}
                          weight="duotone"
                          className={MEMBERSHIP[selected.membership]?.color || "text-slate-400"}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {selected.full_name || "Chưa có tên"}
                        </p>
                        <p className="text-xs font-bold text-slate-500">{selected.phone}</p>
                        {selected.email && (
                          <p className="text-xs font-semibold text-slate-400">{selected.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <MembershipBadge level={selected.membership} />
                      <button
                        type="button"
                        onClick={() => setSelected(null)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-600"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
                    <span className="text-xs font-bold text-slate-500">Điểm tích lũy</span>
                    <span className="text-lg font-black text-emerald-700">
                      {selected.points.toLocaleString("vi-VN")}
                    </span>
                  </div>
                </div>

                {/* Points history */}
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <ClockCounterClockwise size={15} weight="duotone" className="text-emerald-700" />
                    <h2 className="admin-section-title">Lịch sử điểm</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">
                    {history.length}
                  </span>
                </div>

                <div className="flex-1 overflow-auto">
                  {historyLoading ? (
                    <div className="space-y-2 p-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />
                      ))}
                    </div>
                  ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <ClockCounterClockwise size={28} weight="duotone" className="mb-2" />
                      <p className="text-xs font-bold">Chưa có giao dịch điểm</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {history.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between px-4 py-2.5">
                          <div>
                            <p className="text-xs font-bold text-slate-700">{tx.note || "—"}</p>
                            <p className="text-[11px] font-semibold text-slate-400">
                              {formatDateTime(tx.created_at)}
                              {tx.order_id ? ` · Đơn #${tx.order_id}` : ""}
                            </p>
                          </div>
                          <span
                            className={`text-sm font-black ${
                              tx.type === "cong" ? "text-emerald-700" : "text-red-600"
                            }`}
                          >
                            {tx.type === "cong" ? "+" : "-"}{tx.points.toLocaleString("vi-VN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

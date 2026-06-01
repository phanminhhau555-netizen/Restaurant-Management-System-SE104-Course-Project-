import { useEffect, useState } from "react";
import {
  UserCircle,
  Phone,
  ArrowClockwise,
  CheckCircle,
  PlusCircle,
  Receipt,
  Crown,
  MedalMilitary,
  Star,
  MinusCircle,
} from "@phosphor-icons/react";
import API from "../../services/api";

// ── Hạng thành viên config ────────────────────────────────
const MEMBERSHIP = {
  thuong: {
    label: "Thường",
    icon: Star,
    color: "text-slate-500",
    bg: "bg-slate-50",
    border: "border-slate-200",
    badge: "bg-slate-100 text-slate-600",
    min: 0,
    next: 1000,
  },
  bac: {
    label: "Bạc",
    icon: MedalMilitary,
    color: "text-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
    min: 1000,
    next: 5000,
  },
  vang: {
    label: "Vàng",
    icon: Crown,
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    min: 5000,
    next: null,
  },
};

function MembershipBadge({ level }) {
  const cfg = MEMBERSHIP[level] || MEMBERSHIP.thuong;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${cfg.badge}`}>
      <Icon size={12} weight="fill" />
      {cfg.label}
    </span>
  );
}

function PointsBar({ points, level }) {
  const cfg = MEMBERSHIP[level] || MEMBERSHIP.thuong;
  if (!cfg.next) {
    return (
      <p className="text-[11px] font-bold text-amber-600">
        Đã đạt hạng cao nhất 🎉
      </p>
    );
  }
  const pct = Math.min((points / cfg.next) * 100, 100);
  const nextCfg = Object.values(MEMBERSHIP).find((m) => m.min === cfg.next);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold text-slate-500">
          {points.toLocaleString("vi-VN")} / {cfg.next.toLocaleString("vi-VN")} điểm
        </span>
        {nextCfg && (
          <span className="text-[11px] font-bold text-slate-400">
            → Hạng {nextCfg.label}
          </span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function StaffCustomersPage() {
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState(null);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Tự clear success sau 3s
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(t);
  }, [success]);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");
    setCustomer(null);
    setPointsHistory([]);
    setIsEditing(false);

    try {
      const res = await API.post("/api/customers/lookup", { phone: phone.trim() });
      const c = res.data.customer;
      setCustomer(c);
      setEditName(c.full_name || "");
      setEditEmail(c.email || "");

      if (res.data.isNew) {
        setIsEditing(true);
        setSuccess("Đã tạo tài khoản mới! Vui lòng bổ sung thông tin.");
      } else {
        setSuccess("Tìm thấy khách hàng.");
        loadHistory(c.id);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tra cứu khách hàng.");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (customerId) => {
    setHistoryLoading(true);
    try {
      const res = await API.get(`/api/customers/${customerId}/points-history`);
      setPointsHistory(res.data);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSave = async () => {
    if (!customer) return;
    setSaving(true);
    setError("");
    try {
      const res = await API.put(`/api/customers/${customer.id}`, {
        full_name: editName,
        phone: customer.phone,
        email: editEmail,
      });
      // Refresh lại customer data
      const updated = await API.post("/api/customers/lookup", { phone: customer.phone });
      setCustomer(updated.data.customer);
      setIsEditing(false);
      setSuccess("Đã lưu thông tin khách hàng.");
      loadHistory(customer.id);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi lưu thông tin.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPhone("");
    setCustomer(null);
    setPointsHistory([]);
    setError("");
    setSuccess("");
    setIsEditing(false);
  };

  return (
    <div className="admin-page space-y-4">
      <header className="admin-header items-start">
        <div>
          <p className="admin-kicker">Phục vụ</p>
          <h1 className="admin-title">Đăng ký thành viên</h1>
        </div>
        {customer && (
          <button onClick={handleReset} className="admin-secondary-btn shrink-0">
            <ArrowClockwise size={15} weight="bold" />
            Tra cứu mới
          </button>
        )}
      </header>

      <div className="flex gap-4">
        {/* ── Left column ── */}
        <div className="flex w-[360px] shrink-0 flex-col gap-4">

          {/* Form tra cứu */}
          <div className="admin-panel-pad space-y-3">
            <div>
              <p className="admin-section-title">Tra cứu theo SĐT</p>
            </div>
            <form onSubmit={handleLookup} className="flex gap-2">
              <div className="relative flex-1">
                <Phone
                  size={14}
                  weight="bold"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="admin-field w-full pl-8"
                  placeholder="0912 345 678"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="admin-primary-btn shrink-0 px-4"
              >
                {loading ? "..." : "Tra cứu"}
              </button>
            </form>
          </div>

          {/* Alerts */}
          <div aria-live="polite" className="space-y-2">
            {success && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                <CheckCircle size={16} weight="fill" />
                {success}
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Customer card */}
          {customer && (
            <div
              className={`rounded-[14px] border-2 p-4 ${
                MEMBERSHIP[customer.membership]?.border || "border-slate-200"
              } ${MEMBERSHIP[customer.membership]?.bg || "bg-slate-50"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
                    <UserCircle
                      size={26}
                      weight="duotone"
                      className={MEMBERSHIP[customer.membership]?.color || "text-slate-400"}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {customer.full_name || "Chưa có tên"}
                    </p>
                    <p className="text-xs font-bold text-slate-500">{customer.phone}</p>
                  </div>
                </div>
                <MembershipBadge level={customer.membership} />
              </div>

              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Điểm tích lũy</span>
                  <span className="text-lg font-black text-emerald-700">
                    {customer.points.toLocaleString("vi-VN")}
                  </span>
                </div>
                <PointsBar points={customer.points} level={customer.membership} />
              </div>

              {customer.email && (
                <p className="mt-3 text-xs font-semibold text-slate-400">
                  {customer.email}
                </p>
              )}
              <p className="mt-1.5 text-[11px] font-semibold text-slate-400">
                Thành viên từ{" "}
                {new Date(customer.created_at).toLocaleDateString("vi-VN")}
              </p>

              <button
                type="button"
                onClick={() => setIsEditing((v) => !v)}
                className="mt-3 text-xs font-black text-emerald-700 hover:underline"
              >
                {isEditing ? "Huỷ chỉnh sửa" : "Chỉnh sửa thông tin"}
              </button>
            </div>
          )}

          {/* Edit form */}
          {customer && isEditing && (
            <div className="admin-panel-pad space-y-3">
              <p className="admin-section-title">Cập nhật thông tin</p>
              <label className="admin-label">
                Họ tên
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="admin-field mt-1"
                  placeholder="Nguyễn Văn A"
                />
              </label>
              <label className="admin-label">
                Email
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="admin-field mt-1"
                  placeholder="email@example.com"
                />
              </label>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="admin-primary-btn w-full"
              >
                {saving ? "Đang lưu..." : "Lưu thông tin"}
              </button>
            </div>
          )}

          {/* Quy định tích điểm */}
          <div className="admin-panel-pad">
            <p className="admin-section-title mb-3">Quy định tích điểm</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(MEMBERSHIP).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-2.5 ${cfg.border} ${cfg.bg}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon size={13} weight="fill" className={cfg.color} />
                      <span className="text-[11px] font-black text-slate-700">
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500">
                      {cfg.next
                        ? `Từ ${cfg.min.toLocaleString("vi-VN")}`
                        : `${cfg.min.toLocaleString("vi-VN")}+`}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] font-semibold text-slate-400">
              1.000đ thanh toán = 1 điểm tích lũy
            </p>
          </div>
        </div>

        {/* ── Right column — lịch sử điểm ── */}
        <div className="flex flex-1 flex-col gap-4">
          {!customer ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-slate-200 bg-white/60 py-24 text-center">
              <UserCircle size={48} weight="duotone" className="mb-3 text-slate-300" />
            <p className="text-sm font-black text-slate-400">
              Tra cứu SĐT để xem thông tin khách hàng
            </p>
          </div>
          ) : (
            <section className="admin-panel flex-1 overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div>
                  <p className="admin-section-title">Lịch sử tích điểm</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {pointsHistory.length} giao dịch
                  </span>
                  <button
                    type="button"
                    onClick={() => loadHistory(customer.id)}
                    className="admin-secondary-btn px-2.5"
                  >
                    <ArrowClockwise size={14} weight="bold" />
                  </button>
                </div>
              </div>

              {historyLoading ? (
                <div className="flex min-h-48 items-center justify-center text-sm font-bold text-slate-400">
                  Đang tải lịch sử...
                </div>
              ) : pointsHistory.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-slate-400">
                  <Receipt size={32} weight="duotone" />
                  <p className="text-sm font-bold">Chưa có giao dịch điểm nào.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Loại</th>
                        <th>Điểm</th>
                        <th>Đơn hàng</th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pointsHistory.map((tx) => (
                        <tr key={tx.id}>
                          <td className="font-bold text-slate-500">
                            {formatDateTime(tx.created_at)}
                          </td>
                          <td>
                            {tx.type === "cong" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-700">
                                <PlusCircle size={11} weight="fill" />
                                Cộng
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-black text-red-600">
                                <MinusCircle size={11} weight="fill" />
                                Trừ
                              </span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`text-sm font-black ${
                                tx.type === "cong" ? "text-emerald-700" : "text-red-600"
                              }`}
                            >
                              {tx.type === "cong" ? "+" : "-"}
                              {tx.points.toLocaleString("vi-VN")}
                            </span>
                          </td>
                          <td className="font-bold text-slate-500">
                            {tx.order_id ? `#${tx.order_id}` : "—"}
                          </td>
                          <td className="text-slate-400">{tx.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
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

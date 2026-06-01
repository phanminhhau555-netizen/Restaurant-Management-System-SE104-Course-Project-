import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  CookingPot,
  HourglassMedium,
  Receipt,
  Timer,
  WarningCircle,
} from "@phosphor-icons/react";
import API from "../../services/api";
import { joinRealtimeRoom, subscribeRealtime } from "../../services/socketService";

const STATUS_COPY = {
  cho: "Đang chờ",
  dang_nau: "Đang chế biến",
};

const getImageUrl = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const baseUrl = API.defaults.baseURL || "";
  return `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
};

const formatWaitTime = (createdAt, now) => {
  if (!createdAt) return "00:00";
  const seconds = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
};

const getWaitSeconds = (createdAt, now) => {
  if (!createdAt) return 0;
  return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
};

export default function KitchenOrdersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyItemId, setBusyItemId] = useState(null);
  const [now, setNow] = useState(0);

  const refreshItems = async ({ showLoading = false } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const res = await API.get("/api/orders/kitchen");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setMessage(err.response?.data?.message || "Không tải được hàng đợi bếp.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadInitial = async () => {
      try {
        const res = await API.get("/api/orders/kitchen");
        if (!cancelled) setItems(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (!cancelled) {
          setMessage(err.response?.data?.message || "Không tải được hàng đợi bếp.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    joinRealtimeRoom("kitchen");
    const unsubscribeNewOrder = subscribeRealtime("NEW_KITCHEN_ORDER", () => refreshItems());
    const unsubscribeItemStatus = subscribeRealtime("ITEM_STATUS_UPDATED", () => refreshItems());

    loadInitial();
    const refreshTimer = window.setInterval(() => refreshItems(), 15000);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      cancelled = true;
      unsubscribeNewOrder();
      unsubscribeItemStatus();
      window.clearInterval(refreshTimer);
      window.clearInterval(clockTimer);
    };
  }, []);

  const fifoItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const orderTime = new Date(a.order_created_at || 0) - new Date(b.order_created_at || 0);
      if (orderTime !== 0) return orderTime;
      return Number(a.id) - Number(b.id);
    });
  }, [items]);

  const counts = useMemo(() => {
    return fifoItems.reduce(
      (total, item) => {
        total.all += 1;
        total.waiting += item.status === "cho" ? 1 : 0;
        total.cooking += item.status === "dang_nau" ? 1 : 0;
        return total;
      },
      { all: 0, waiting: 0, cooking: 0 }
    );
  }, [fifoItems]);

  const updateItemStatus = async (item, status) => {
    setBusyItemId(item.id);
    setMessage("");
    try {
      await API.patch(`/api/orders/${item.order_id}/items/${item.id}/status`, { status });
      await refreshItems();
      setMessage(status === "dang_nau" ? "Đã nhận món." : "Đã hoàn tất món.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Không cập nhật được trạng thái món.");
    } finally {
      setBusyItemId(null);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-kicker">Bếp</p>
          <h1 className="admin-title">Hàng đợi món</h1>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <div className="admin-command-strip">
            <Receipt size={16} weight="duotone" />
            {counts.all} món
          </div>
          <div className="admin-command-strip text-amber-700">
            <HourglassMedium size={16} weight="duotone" />
            {counts.waiting} chờ
          </div>
          <div className="admin-command-strip text-emerald-700">
            <CookingPot size={16} weight="duotone" />
            {counts.cooking} đang làm
          </div>
        </div>
      </header>

      {message ? (
        <div
          className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      ) : null}

      {loading ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="admin-panel min-h-[260px] animate-pulse bg-slate-100" />
          ))}
        </section>
      ) : fifoItems.length === 0 ? (
        <section className="admin-panel-pad flex min-h-[360px] flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <CheckCircle size={30} weight="duotone" />
          </div>
          <h2 className="mt-4 text-lg font-black text-slate-950">Bếp đang trống hàng đợi</h2>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fifoItems.map((item, index) => {
            const waitSeconds = getWaitSeconds(item.order_created_at, now);
            const urgent = waitSeconds >= 15 * 60;
            const isWaiting = item.status === "cho";
            const imageUrl = getImageUrl(item.image_url);
            const busy = busyItemId === item.id;

            return (
              <article
                key={item.id}
                className="admin-panel flex min-h-[282px] flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(15,23,42,0.09)]"
              >
                <div className={`${urgent ? "bg-rose-50" : "bg-sky-50"} border-b border-slate-100 px-3.5 py-3`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div
                        className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[11px] font-black uppercase tracking-wide ${
                          urgent
                            ? "border-rose-200 bg-rose-100 text-rose-700"
                            : "border-emerald-200 bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {urgent ? "Khẩn cấp" : "Thường"}
                      </div>
                      <p className="mt-2 text-[13px] font-black text-slate-950">
                        {item.table_name || "Mang về"}
                      </p>
                      <p className="text-[11px] font-bold text-slate-400">Order #{item.order_id}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-slate-500">
                        {urgent ? <WarningCircle size={14} weight="duotone" /> : <Timer size={14} weight="duotone" />}
                        Thời gian chờ
                      </div>
                      <p className={`mt-1 font-mono text-sm font-black ${urgent ? "text-rose-700" : "text-slate-950"}`}>
                        {formatWaitTime(item.order_created_at, now)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-3.5">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={item.mon_ten}
                      className="h-24 w-full rounded-xl border border-slate-100 object-cover"
                    />
                  ) : null}

                  <div className="flex flex-1 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-black text-emerald-800">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-black leading-5 text-slate-950">
                            <span className="mr-1 text-emerald-700">{item.quantity}x</span>
                            {item.mon_ten || "Món chưa đặt tên"}
                          </p>
                          {item.note ? (
                            <p className="mt-1 text-xs font-semibold italic leading-5 text-slate-500">{item.note}</p>
                          ) : null}
                        </div>
                        <span
                          className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-black ${
                            isWaiting ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"
                          }`}
                        >
                          {STATUS_COPY[item.status] || item.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      className="admin-secondary-btn"
                      disabled={!isWaiting || busy}
                      onClick={() => updateItemStatus(item, "dang_nau")}
                    >
                      {isWaiting ? "Nhận" : "Đã nhận"}
                    </button>
                    <button
                      type="button"
                      className="admin-primary-btn"
                      disabled={busy}
                      onClick={() => updateItemStatus(item, "hoan_thanh")}
                    >
                      {busy ? "Đang lưu" : "Hoàn tất"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

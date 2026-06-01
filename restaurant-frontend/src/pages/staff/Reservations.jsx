import { useEffect, useMemo, useState } from "react";
import TableMap from "../../components/TableMap";
import API from "../../services/api";
import { joinRealtimeRoom, subscribeRealtime } from "../../services/socketService";

const emptyForm = {
  table_id: "",
  customer_name: "",
  phone: "",
  arrive_time: "",
  num_guests: 2,
};

export default function StaffReservationsPage() {
  const [tables, setTables] = useState([]);
  const [areas, setAreas] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [activeArea, setActiveArea] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const availableTables = useMemo(
    () => tables.filter((table) => table.status === "trong"),
    [tables]
  );
  const reservedTables = useMemo(
    () => tables.filter((table) => table.status === "da_dat"),
    [tables]
  );
  const occupiedTables = useMemo(
    () => tables.filter((table) => table.status === "dang_dung"),
    [tables]
  );

  async function refreshData() {
    setLoading(true);
    setError("");

    try {
      const [tablesRes, areasRes, reservationsRes] = await Promise.all([
        API.get("/api/tables"),
        API.get("/api/tables/areas"),
        API.get("/api/tables/reservations/all"),
      ]);

      setTables(tablesRes.data);
      setAreas(areasRes.data);
      setReservations(reservationsRes.data);
      setActiveArea((current) => current ?? areasRes.data[0]?.id ?? null);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được dữ liệu đặt bàn.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    joinRealtimeRoom("staff");
    const unsubscribeStatus = subscribeRealtime("TABLE_STATUS_UPDATED", () => refreshData());
    const unsubscribeList = subscribeRealtime("TABLE_LIST_UPDATED", () => refreshData());
    const unsubscribePayment = subscribeRealtime("PAYMENT_COMPLETED", () => refreshData());

    Promise.all([API.get("/api/tables"), API.get("/api/tables/areas"), API.get("/api/tables/reservations/all")])
      .then(([tablesRes, areasRes, reservationsRes]) => {
        if (cancelled) return;
        setTables(tablesRes.data);
        setAreas(areasRes.data);
        setReservations(reservationsRes.data);
        setActiveArea((current) => current ?? areasRes.data[0]?.id ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.message || "Không tải được dữ liệu đặt bàn.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribeStatus();
      unsubscribeList();
      unsubscribePayment();
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await API.post("/api/tables/reservations", {
        table_id: Number(form.table_id),
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim(),
        arrive_time: normalizeDateTime(form.arrive_time),
        num_guests: Number(form.num_guests),
      });

      setSuccess("Đã tạo đặt bàn thành công.");
      setForm(emptyForm);
      await refreshData();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi tạo đặt bàn.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAreaChange = (areaId) => {
    setActiveArea(areaId);
  };

  const handleToggleOccupancy = async (table) => {
    const nextStatus = table.status === "dang_dung" ? "trong" : "dang_dung";
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await API.patch(`/api/tables/${table.id}/status`, { status: nextStatus });
      setSuccess(
        `${table.name} đã chuyển sang ${nextStatus === "dang_dung" ? "có khách" : "trống"}.`
      );
      await refreshData();
    } catch (err) {
      setError(err.response?.data?.message || "Không chuyển được trạng thái bàn.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiveReservedTable = async (tableId, tableName) => {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await API.patch(`/api/tables/${tableId}/status`, { status: "dang_dung" });
      setSuccess(`${tableName} đã chuyển sang có khách.`);
      await refreshData();
    } catch (err) {
      setError(err.response?.data?.message || "Không chuyển được trạng thái bàn.");
    } finally {
      setSubmitting(false);
    }
  };

  const upcomingReservations = reservations.slice(0, 12);

  return (
    <div className="admin-page space-y-4">
      <header className="admin-header items-start">
        <div>
          <p className="admin-kicker">Phục vụ</p>
          <h1 className="admin-title">Quản lí bàn</h1>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <span className="admin-command-strip">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            Trống {availableTables.length}
          </span>
          <span className="admin-command-strip">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            Có khách {occupiedTables.length}
          </span>
          <span className="admin-command-strip">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            Đã đặt {reservedTables.length}
          </span>
        </div>
      </header>

      <div aria-live="polite" className="space-y-2">
        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {success}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <TableMap
        title="Quản lí bàn"
        tables={tables}
        areas={areas}
        loading={loading}
        activeArea={activeArea}
        onAreaChange={handleAreaChange}
        onToggleOccupancy={handleToggleOccupancy}
        onReceiveGuests={(table) => handleReceiveReservedTable(table.id, table.name)}
        totalLabel="Tổng số bàn"
        showHeader={false}
        showSummary={false}
      />

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="admin-panel-pad space-y-4">
            <div>
              <p className="admin-section-title">Đặt bàn trước</p>
            </div>

            <label className="admin-label">
              Bàn
              <select
                value={form.table_id}
                onChange={(event) => setForm({ ...form, table_id: event.target.value })}
                className="admin-field mt-1"
                required
              >
                <option value="">Chọn bàn trống</option>
                {availableTables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name} · {table.area_name || "Chưa có khu vực"}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-label">
              Tên khách
              <input
                type="text"
                value={form.customer_name}
                onChange={(event) => setForm({ ...form, customer_name: event.target.value })}
                className="admin-field mt-1"
                placeholder="Tên người đặt"
                required
              />
            </label>

            <label className="admin-label">
              Số điện thoại
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                className="admin-field mt-1"
                placeholder="Số điện thoại liên hệ"
                required
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="admin-label">
                Thời gian đến
                <input
                  type="datetime-local"
                  value={form.arrive_time}
                  onChange={(event) => setForm({ ...form, arrive_time: event.target.value })}
                  className="admin-field mt-1"
                  required
                />
              </label>

              <label className="admin-label">
                Số khách
                <input
                  type="number"
                  min="1"
                  value={form.num_guests}
                  onChange={(event) => setForm({ ...form, num_guests: event.target.value })}
                  className="admin-field mt-1"
                  required
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || availableTables.length === 0}
              className="admin-primary-btn w-full"
            >
              {submitting ? "Đang xử lý..." : "Tạo đặt bàn"}
            </button>
          </form>

          <section className="admin-panel-pad">
            <p className="admin-section-title">Khách đặt trước đã tới</p>

            {reservedTables.length === 0 ? (
              <p className="mt-4 rounded-lg bg-slate-50 px-3 py-4 text-center text-xs font-bold text-slate-400">
                Không có bàn đang đặt.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {reservedTables.map((table) => (
                  <div key={table.id} className="flex items-center justify-between gap-3 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-800">{table.name}</p>
                      <p className="text-xs font-bold text-orange-700">{table.area_name || "Chưa có khu vực"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleReceiveReservedTable(table.id, table.name)}
                      disabled={submitting}
                      className="min-h-9 shrink-0 rounded-lg bg-blue-600 px-3 text-xs font-black text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                    >
                      Nhận khách
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="admin-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <p className="admin-section-title">Lịch đặt bàn</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {reservations.length} lượt
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center text-sm font-bold text-slate-400">
              Đang tải đặt bàn...
            </div>
          ) : upcomingReservations.length === 0 ? (
            <div className="flex min-h-72 items-center justify-center text-sm font-bold text-slate-400">
              Chưa có lịch đặt bàn.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Khách</th>
                    <th>Bàn</th>
                    <th>Thời gian</th>
                    <th>Số khách</th>
                    <th>Liên hệ</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingReservations.map((reservation) => (
                    <tr key={reservation.id}>
                      <td className="font-black text-slate-800">{reservation.customer_name}</td>
                      <td className="font-bold text-slate-600">{reservation.table_name}</td>
                      <td className="font-bold text-slate-600">{formatDateTime(reservation.arrive_time)}</td>
                      <td className="font-bold text-slate-600">{reservation.num_guests}</td>
                      <td className="font-bold text-slate-500">{reservation.phone}</td>
                      <td>
                        {reservation.table_id && reservation.table_status === "da_dat" ? (
                          <button
                            type="button"
                            onClick={() => handleReceiveReservedTable(reservation.table_id, reservation.table_name)}
                            disabled={submitting}
                            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-60"
                          >
                            Nhận khách
                          </button>
                        ) : reservation.table_status === "dang_dung" ? (
                          <span className="text-xs font-bold text-blue-600">Đã nhận khách</span>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">Không có bàn</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function normalizeDateTime(value) {
  if (!value) return value;
  return value.length === 16 ? `${value.replace("T", " ")}:00` : value.replace("T", " ");
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

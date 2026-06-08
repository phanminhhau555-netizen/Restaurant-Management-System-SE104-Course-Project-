import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarBlank, Users } from "@phosphor-icons/react";
import API from "../../services/api";
import { joinRealtimeRoom, subscribeRealtime } from "../../services/socketService";
const STATUS_CONFIG = {
  trong: {
    label: "Bàn trống",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    ring: "border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100/60",
    circle: "bg-emerald-500",
  },
  dang_dung: {
    label: "Có khách",
    dot: "bg-blue-500",
    text: "text-blue-700",
    ring: "border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100/60",
    circle: "bg-blue-500",
  },
  da_dat: {
    label: "Đã đặt",
    dot: "bg-orange-400",
    text: "text-orange-700",
    ring: "border-orange-200 bg-orange-50",
    circle: "bg-orange-400",
  },
  sap_den: {
    label: "Sắp đến",
    dot: "bg-orange-500",
    text: "text-orange-700",
    ring: "border-orange-400 bg-orange-100",
    circle: "bg-orange-500",
  },
};

function getMinDateTime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function isWithinOneHour(arriveTime) {
  if (!arriveTime) return false;
  const diff = new Date(arriveTime) - new Date();
  return diff > 0 && diff <= 60 * 60 * 1000;
}

function isReservationLate(reservedAt) {
  if (!reservedAt) return false;
  return (new Date() - new Date(reservedAt)) / (1000 * 60) > 30;
}

const emptyReserveForm = {
  customer_name: "",
  phone: "",
  num_guests: 2,
  arrive_time: "",
};

export default function TablesPage() {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [areas, setAreas] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeArea, setActiveArea] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [closeTableData, setCloseTableData] = useState(null);
  const [reserveTableData, setReserveTableData] = useState(null);
  const [reserveForm, setReserveForm] = useState(emptyReserveForm);
  const [reserveError, setReserveError] = useState("");
  const [rightPanelWidth, setRightPanelWidth] = useState(240);
  const [selectedQRTable, setSelectedQRTable] = useState(null);
  const [serverIP, setServerIP] = useState("");

  async function fetchAll() {
    try {
      const [tablesRes, areasRes, reservationsRes] = await Promise.all([
        API.get("/api/tables"),
        API.get("/api/tables/areas"),
        API.get("/api/tables/reservations/all"),
      ]);
      setTables(tablesRes.data);
      setAreas(areasRes.data);
      setReservations(reservationsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  let cancelled = false;

  joinRealtimeRoom("staff");
  const unsubscribeTableStatus = subscribeRealtime("TABLE_STATUS_UPDATED", (payload) => {
    console.log("[Socket] Nhận cập nhật trạng thái bàn:", payload);
        setTables((prevTables) =>
      prevTables.map((t) =>
        Number(t.id) === Number(payload.table_id) ? { ...t, status: payload.status } : t
      )
    );
    API.get("/api/tables/reservations/all")
      .then((res) => { if (!cancelled) setReservations(res.data); })
      .catch(console.error);
  });
  Promise.all([
    API.get("/api/tables"),
    API.get("/api/tables/areas"),
    API.get("/api/tables/reservations/all"),
  ]).then(([tablesRes, areasRes, reservationsRes]) => {
    if (cancelled) return;
    setTables(tablesRes.data);
    setAreas(areasRes.data);
    setReservations(reservationsRes.data);
  }).catch(console.error)
    .finally(() => { if (!cancelled) setLoading(false); });

  API.get("/api/settings/server-ip")
    .then((res) => { if (!cancelled && res.data?.ip) setServerIP(res.data.ip); })
    .catch(() => {});

  const closeMenu = () => setContextMenu(null);
  window.addEventListener("click", closeMenu);
  return () => {
    cancelled = true;
    unsubscribeTableStatus();
    window.removeEventListener("click", closeMenu);
  };
}, []);

  const qrBaseUrl = serverIP && serverIP !== "127.0.0.1"
    ? `http://${serverIP}:${window.location.port || "5173"}`
    : window.location.origin;

  const getTableReservation = (tableId) =>
    reservations.find((r) => r.table_id === tableId && r.status === "cho");

  const getUIStatus = (table) => {
    if (table.status === "da_dat") {
      const res = getTableReservation(table.id);
      if (res && isWithinOneHour(res.arrive_time)) return "sap_den";
    }
    return table.status;
  };

  const handleUpdateTableStatus = async (tableId, nextStatus, reservedAt = null) => {
    try {
      await API.patch(`/api/tables/${tableId}/status`, { status: nextStatus, reserved_at: reservedAt });
      fetchAll();
    } catch (err) {
      alert("Lỗi đổi trạng thái bàn: " + (err.response?.data?.message || err.message));
    }
  };

  const handleConfirmCloseTable = async () => {
    await handleUpdateTableStatus(closeTableData.id, "trong");
    setCloseTableData(null);
  };

  const handleConfirmReserveTable = async () => {
    setReserveError("");

    if (!reserveForm.customer_name.trim()) return setReserveError("Vui lòng nhập tên khách.");
    if (!reserveForm.phone.trim()) return setReserveError("Vui lòng nhập số điện thoại.");
    if (!/^[0-9]{9,11}$/.test(reserveForm.phone.trim())) return setReserveError("Số điện thoại không hợp lệ (9-11 số).");
    if (!reserveForm.num_guests || Number(reserveForm.num_guests) < 1) return setReserveError("Số khách phải ít nhất 1 người.");
    if (!reserveForm.arrive_time) return setReserveError("Vui lòng chọn thời gian đến.");
    if (new Date(reserveForm.arrive_time) <= new Date()) return setReserveError("Thời gian không hợp lệ. Vui lòng chọn lại.");

    try {
      await API.post("/api/tables/reservations", {
        table_id:      reserveTableData.id,
        customer_name: reserveForm.customer_name.trim(),
        phone:         reserveForm.phone.trim(),
        num_guests:    Number(reserveForm.num_guests),
        arrive_time:   reserveForm.arrive_time.replace("T", " ") + ":00",
      });
      setReserveTableData(null);
      setReserveForm(emptyReserveForm);
      setReserveError("");
      fetchAll();
    } catch (err) {
      setReserveError(err.response?.data?.message || "Lỗi đặt bàn.");
    }
  };

  const handleDeleteReservation = async (reservationId) => {
    if (!window.confirm("Xác nhận xóa đặt bàn này?")) return;
    try {
      await API.delete(`/api/tables/reservations/${reservationId}`);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi xóa đặt bàn");
    }
  };

  const filteredTables = activeArea ? tables.filter((t) => t.area_id === activeArea) : tables;
  const counts = {
    trong:     tables.filter((t) => t.status === "trong").length,
    dang_dung: tables.filter((t) => t.status === "dang_dung").length,
    da_dat:    tables.filter((t) => t.status === "da_dat").length,
  };
  const occupancyRate = Math.round((counts.dang_dung / (tables.length || 1)) * 100);

  return (
    <div className="admin-soft-grid flex min-h-screen flex-col bg-[#eff1ea]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#fbfbf8]/95 px-5 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-4">
          <div>
            <p className="admin-kicker">Nhân viên</p>
            <h1 className="text-[18px] font-black leading-tight text-slate-950">Sơ đồ bàn</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1480px] flex-1 gap-2 p-4">
        <div className="flex flex-1 flex-col gap-4">
          {/* Legend + Tabs */}
          <div className="admin-panel-pad flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {Object.entries(STATUS_CONFIG).filter(([k]) => k !== "sap_den").map(([key, val]) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${val.dot}`} />
                  <span className="text-xs font-semibold text-slate-500">{val.label} ({counts[key] ?? 0})</span>
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span className="text-xs font-semibold text-slate-500">Sắp đến</span>
              </span>
            </div>
            {areas.length > 0 && (
              <div className="flex gap-2">
                <button onClick={() => setActiveArea(null)} className={`admin-tab ${activeArea === null ? "admin-tab-active" : ""}`}>Tất cả</button>
                {areas.map((area) => (
                  <button key={area.id} onClick={() => setActiveArea(area.id)} className={`admin-tab ${activeArea === area.id ? "admin-tab-active" : ""}`}>{area.name}</button>
                ))}
              </div>
            )}
          </div>

          {/* Tables Grid */}
          {loading ? (
            <div className="admin-panel flex items-center justify-center py-20 text-slate-400"><p className="text-sm font-semibold">Đang tải...</p></div>
          ) : filteredTables.length === 0 ? (
            <div className="admin-panel flex items-center justify-center py-20 text-slate-400"><p className="text-sm font-semibold">Chưa có bàn nào</p></div>
          ) : (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
              {filteredTables.map((table) => {
                const uiStatus = getUIStatus(table);
                const config = STATUS_CONFIG[uiStatus] || STATUS_CONFIG.trong;
                const reservation = getTableReservation(table.id);
                return (
                  <button
                    key={table.id}
                    onClick={() => { if (table.status === "dang_dung") navigate(`/staff/orders/${table.id}`); }}
                    onDoubleClick={() => {
                      if (table.status === "trong") {
                        handleUpdateTableStatus(table.id, "dang_dung").then(() => navigate(`/staff/orders/${table.id}`));
                      }
                    }}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, table }); }}
                    className={`admin-lift flex flex-col items-center rounded-[10px] border p-2.5 text-center transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${config.ring} cursor-pointer`}
                  >
                    <div className={`mb-1.5 flex h-11 w-11 items-center justify-center rounded-full ${config.circle} shadow-sm`}>
                      <span className="text-xs font-black text-white">{table.name}</span>
                    </div>
                    <p className={`text-[10px] font-black ${config.text}`}>{config.label}</p>
                    {table.status === "dang_dung" && table.total_amount > 0 && (
                      <p className="mt-1 text-[11px] font-bold text-slate-500">{new Intl.NumberFormat("vi-VN").format(table.total_amount)}đ</p>
                    )}
                    {table.status === "da_dat" && reservation && (
                      <p className="mt-1 text-[11px] font-bold text-orange-600">
                        {new Date(reservation.arrive_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        {isWithinOneHour(reservation.arrive_time) && <span className="block text-[9px] font-black text-orange-700">Sắp đến!</span>}
                      </p>
                    )}
                    {table.status === "trong" && <p className="mt-1 text-[11px] font-semibold text-slate-400">Nhấp đúp để đặt món</p>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX; const startWidth = rightPanelWidth;
            const onMove = (ev) => setRightPanelWidth(Math.max(180, Math.min(380, startWidth + startX - ev.clientX)));
            const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
            document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
          }}
          className="w-1.5 hover:w-2 bg-slate-200 hover:bg-emerald-600 active:bg-emerald-700 cursor-col-resize self-stretch transition-all duration-150 mx-1 rounded"
        />

        {/* Right Panel */}
        <div className="flex shrink-0 flex-col gap-4" style={{ width: `${rightPanelWidth}px` }}>
          <div className="rounded-[14px] bg-emerald-700 p-4 text-white shadow-[0_18px_40px_rgba(4,120,87,0.18)]">
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} weight="duotone" className="opacity-80" />
              <p className="text-xs font-black uppercase tracking-wide opacity-80">Trực tiếp</p>
              <span className="admin-live-dot ml-auto" />
            </div>
            <p className="text-3xl font-black mt-1">{counts.dang_dung}</p>
            <p className="text-xs font-bold opacity-70 mt-0.5">bàn đang có khách</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${occupancyRate}%` }} />
            </div>
            <p className="mt-1 text-[11px] font-black opacity-70">Công suất {occupancyRate}%</p>
          </div>

          <div className="admin-panel-pad flex-1">
            <div className="mb-3 flex items-center gap-2">
              <CalendarBlank size={15} weight="duotone" className="text-emerald-700" />
              <p className="admin-section-title">Đặt bàn sắp tới</p>
            </div>
            <ReservationList
              reservations={reservations}
              onDelete={handleDeleteReservation}
            />
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 min-w-[170px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">{contextMenu.table.name}</p>
          <button onClick={() => { setSelectedQRTable(contextMenu.table); setContextMenu(null); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors">Mã QR Bàn</button>

          {contextMenu.table.status === "trong" && (<>
            <button onClick={() => { handleUpdateTableStatus(contextMenu.table.id, "dang_dung").then(() => navigate(`/staff/orders/${contextMenu.table.id}`)); setContextMenu(null); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors">Mở bàn</button>
            <button onClick={() => { setReserveTableData({ id: contextMenu.table.id, name: contextMenu.table.name }); setContextMenu(null); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-orange-600 hover:bg-orange-50 transition-colors">Đặt trước</button>
          </>)}

          {contextMenu.table.status === "dang_dung" && (<>
            <button onClick={() => { navigate(`/staff/orders/${contextMenu.table.id}`); setContextMenu(null); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors">Order món</button>
            <button onClick={() => { navigate(`/staff/payments/${contextMenu.table.id}`); setContextMenu(null); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors">Thanh toán</button>
            <button onClick={() => { setCloseTableData({ id: contextMenu.table.id, name: contextMenu.table.name }); setContextMenu(null); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">Đóng bàn</button>
          </>)}

          {contextMenu.table.status === "da_dat" && (<>
            {isWithinOneHour(getTableReservation(contextMenu.table.id)?.arrive_time) && (
              <button onClick={() => { handleUpdateTableStatus(contextMenu.table.id, "dang_dung").then(() => navigate(`/staff/orders/${contextMenu.table.id}`)); setContextMenu(null); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors">Mở bàn sớm</button>
            )}
            {(() => {
              const res = getTableReservation(contextMenu.table.id);
              return res ? (
                <button onClick={() => { handleDeleteReservation(res.id); setContextMenu(null); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-red-500 hover:bg-red-50 transition-colors border-t border-slate-100">Xóa đặt bàn</button>
              ) : null;
            })()}
            {isReservationLate(contextMenu.table.reserved_at) && (
              <button onClick={() => { if (window.confirm("Bàn trễ hơn 30 phút. Xác nhận hủy?")) handleUpdateTableStatus(contextMenu.table.id, "trong"); setContextMenu(null); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 transition-colors">Hủy bàn trễ</button>
            )}
          </>)}
        </div>
      )}

      {/* Close Table Modal */}
      {closeTableData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-black text-slate-900 mb-2">Xác nhận đóng bàn {closeTableData.name}</h3>
            <p className="text-xs font-bold text-slate-500 mb-4">Bàn sẽ chuyển về trạng thái trống.</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setCloseTableData(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50">Hủy</button>
              <button type="button" onClick={handleConfirmCloseTable}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600">Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Reserve Modal */}
      {reserveTableData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-black text-slate-900 mb-4">Đặt trước bàn {reserveTableData.name}</h3>

            {reserveError && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700">{reserveError}</div>
            )}

            <div className="space-y-3">
              <input
                className="admin-field w-full"
                placeholder="Tên khách *"
                value={reserveForm.customer_name}
                onChange={(e) => setReserveForm({ ...reserveForm, customer_name: e.target.value })}
              />
              <input
                className="admin-field w-full"
                placeholder="Số điện thoại *"
                value={reserveForm.phone}
                onChange={(e) => setReserveForm({ ...reserveForm, phone: e.target.value })}
              />
              <input
                type="number" min="1"
                className="admin-field w-full"
                placeholder="Số khách *"
                value={reserveForm.num_guests}
                onChange={(e) => setReserveForm({ ...reserveForm, num_guests: e.target.value })}
              />
              <input
                type="datetime-local"
                className="admin-field w-full"
                min={getMinDateTime()}
                value={reserveForm.arrive_time}
                onChange={(e) => setReserveForm({ ...reserveForm, arrive_time: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => { setReserveTableData(null); setReserveForm(emptyReserveForm); setReserveError(""); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50">Hủy</button>
              <button type="button" onClick={handleConfirmReserveTable}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700">Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {selectedQRTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 print:hidden">
          <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.22)] text-center">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Mã QR {selectedQRTable.name}</h2>
              <button type="button" onClick={() => setSelectedQRTable(null)} className="admin-tab h-9 min-h-9 px-3 font-bold">✕</button>
            </div>
            <p className="text-xs font-bold text-slate-400 mb-4 uppercase">
              Khu vực: {areas.find((a) => a.id === selectedQRTable.area_id)?.name || "Chưa xác định"}
            </p>
            <div className="mx-auto my-6 flex h-60 w-60 items-center justify-center border border-slate-100 rounded-xl bg-slate-50 p-3 shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`${qrBaseUrl}/staff/orders/qr/${selectedQRTable.qr_token}?mode=qr`)}`}
                alt={`QR ${selectedQRTable.name}`}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex gap-3">
              <a href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${qrBaseUrl}/staff/orders/qr/${selectedQRTable.qr_token}?mode=qr`)}`}
                target="_blank" rel="noreferrer"
                className="flex-1 admin-primary-btn text-center flex items-center justify-center min-h-11">Mở ảnh lớn để in</a>
              <button type="button" onClick={() => setSelectedQRTable(null)} className="flex-1 admin-tab min-h-11">Đóng</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function ReservationList({ reservations, onDelete }) {
  const upcoming = reservations.filter((r) => r.status === "cho").slice(0, 5);

  if (upcoming.length === 0) {
    return <p className="py-6 text-center text-xs font-semibold text-slate-400">Chưa có đặt bàn</p>;
  }

  return (
    <div className="space-y-2">
      {upcoming.map((r) => (
        <div key={r.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">
            {r.num_guests}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black text-slate-800">{r.customer_name}</p>
            <p className="text-[11px] font-semibold text-slate-400">
              {new Date(r.arrive_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · {r.table_name}
            </p>
          </div>
          <button type="button" onClick={() => onDelete(r.id)}
            className="shrink-0 rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors" title="Xóa">✕</button>
        </div>
      ))}
    </div>
  );
}
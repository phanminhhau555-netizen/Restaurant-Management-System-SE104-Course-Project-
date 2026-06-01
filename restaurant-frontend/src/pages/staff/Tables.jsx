 import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowClockwise, CalendarBlank, Users } from "@phosphor-icons/react";
import API from "../../services/api";

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
};

export default function TablesPage() {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeArea, setActiveArea] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [closeTableData, setCloseTableData] = useState(null);
  const [closeReason, setCloseReason] = useState("");
  const [reserveTableData, setReserveTableData] = useState(null);
  const [reserveTime, setReserveTime] = useState("");
  const [cardSize, setCardSize] = useState(160);
  const [rightPanelWidth, setRightPanelWidth] = useState(240);
  const [selectedQRTable, setSelectedQRTable] = useState(null);
  const [serverIP, setServerIP] = useState("");

  useEffect(() => {
    fetchTables();
    
    API.get("/api/settings/server-ip")
      .then((res) => {
        if (res.data && res.data.ip) {
          setServerIP(res.data.ip);
        }
      })
      .catch((err) => console.error("Error fetching server IP:", err));

    // Đóng context menu khi click bất kỳ đâu trên màn hình
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const qrBaseUrl = serverIP && serverIP !== "127.0.0.1"
    ? `http://${serverIP}:${window.location.port || "5173"}`
    : window.location.origin;

  const fetchTables = async () => {
    try {
      const [tablesRes, areasRes] = await Promise.all([
        API.get("/api/tables"),
        API.get("/api/tables/areas"),
      ]);
      setTables(tablesRes.data);
      setAreas(areasRes.data);
      if (areasRes.data.length > 0) setActiveArea(areasRes.data[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTable = (table) => {
    if (table.status === "da_dat") return;
    navigate(`/staff/tables/${table.id}/order`);
  };

  const handleUpdateTableStatus = async (tableId, nextStatus, reservedAt = null) => {
    try {
      await API.patch(`/api/tables/${tableId}/status`, { 
        status: nextStatus, 
        reserved_at: reservedAt 
      });
      fetchTables();
    } catch (err) {
      alert("Lỗi đổi trạng thái bàn: " + (err.response?.data?.message || err.message));
    }
  };

  const handleConfirmCloseTable = async () => {
    if (!closeReason.trim()) {
      alert("Vui lòng nhập lý do đóng bàn");
      return;
    }
    if (!window.confirm(`Xác nhận: Bạn có chắc chắn muốn đóng bàn ${closeTableData.name} với lý do đã nhập chứ?`)) {
      return;
    }
    await handleUpdateTableStatus(closeTableData.id, "trong");
    setCloseTableData(null);
    setCloseReason("");
  };

  const handleConfirmReserveTable = async () => {
    if (!reserveTime) {
      alert("Vui lòng chọn thời gian đặt trước");
      return;
    }
    await handleUpdateTableStatus(reserveTableData.id, "da_dat", reserveTime);
    setReserveTableData(null);
    setReserveTime("");
  };

  const isReservationLate = (reservedAt) => {
    if (!reservedAt) return false;
    const reservedTime = new Date(reservedAt).getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - reservedTime) / (1000 * 60);
    return diffMinutes > 30;
  };

  const filteredTables = activeArea
    ? tables.filter((t) => t.area_id === activeArea)
    : tables;

  const counts = {
    trong: tables.filter((t) => t.status === "trong").length,
    dang_dung: tables.filter((t) => t.status === "dang_dung").length,
    da_dat: tables.filter((t) => t.status === "da_dat").length,
  };

  const occupancyRate = Math.round((counts.dang_dung / (tables.length || 1)) * 100);

  return (
    <div className="admin-soft-grid flex min-h-screen flex-col bg-[#eff1ea]">

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#fbfbf8]/95 px-5 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-4">
          <div>
            <p className="admin-kicker">Nhân viên</p>
            <h1 className="text-[18px] font-black leading-tight text-slate-950">
              Sơ đồ bàn
            </h1>
          </div>
          <button onClick={fetchTables} className="admin-secondary-btn">
            <ArrowClockwise size={15} weight="bold" />
            Làm mới
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1480px] flex-1 gap-2 p-4">

        {/* Main */}
        <div className="flex flex-1 flex-col gap-4">

          {/* Status Legend + Area Tabs */}
          <div className="admin-panel-pad flex items-center justify-between gap-4">
            {/* Legend */}
            <div className="flex items-center gap-4">
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${val.dot}`} />
                  <span className="text-xs font-semibold text-slate-500">
                    {val.label} ({counts[key]})
                  </span>
                </span>
              ))}
            </div>

            {/* Area Tabs & Size Slider */}
            <div className="flex items-center gap-4">
              {areas.length > 0 && (
                <div className="flex gap-2">
                  {areas.map((area) => (
                    <button
                      key={area.id}
                      onClick={() => setActiveArea(area.id)}
                      className={`admin-tab ${activeArea === area.id ? "admin-tab-active" : ""}`}
                    >
                      {area.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setActiveArea(null)}
                    className={`admin-tab ${activeArea === null ? "admin-tab-active" : ""}`}
                  >
                    Tất cả
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">
                  Kích cỡ ô: {cardSize}px
                </span>
                <input
                  type="range"
                  min="110"
                  max="240"
                  value={cardSize}
                  onChange={(e) => setCardSize(Number(e.target.value))}
                  className="w-20 accent-emerald-700 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Tables Grid */}
          {loading ? (
            <div className="admin-panel flex flex-col items-center justify-center py-20 text-slate-400">
              <p className="text-sm font-semibold">Đang tải...</p>
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="admin-panel flex flex-col items-center justify-center py-20 text-slate-400">
              <p className="text-sm font-semibold">Chưa có bàn nào</p>
            </div>
          ) : (
            <div 
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))` }}
            >
              {filteredTables.map((table) => {
                const config = STATUS_CONFIG[table.status] || STATUS_CONFIG.trong;
                return (
                  <button
                    key={table.id}
                    onClick={() => {
                      if (table.status === "dang_dung") {
                        navigate(`/staff/orders/${table.id}`);
                      }
                    }}
                    onDoubleClick={() => {
                      if (table.status === "trong") {
                        handleUpdateTableStatus(table.id, "dang_dung").then(() => {
                          navigate(`/staff/orders/${table.id}`);
                        });
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        table: table
                      });
                    }}
                    className={`admin-lift flex flex-col items-center rounded-[10px] border p-2.5 text-center transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${config.ring} cursor-pointer`}
                  >
                    {/* Circle */}
                    <div className={`mb-1.5 flex h-11 w-11 items-center justify-center rounded-full ${config.circle} shadow-sm`}>
                      <span className="text-xs font-black text-white">{table.name}</span>
                    </div>

                    <p className={`text-[10px] font-black ${config.text}`}>
                      {config.label}
                    </p>

                    {table.status === "dang_dung" && table.total_amount > 0 && (
                      <p className="mt-1 text-[11px] font-bold text-slate-500">
                        {new Intl.NumberFormat("vi-VN").format(table.total_amount)}đ
                      </p>
                    )}
                    {table.status === "da_dat" && (
                      <p className="mt-1 text-[11px] font-bold text-orange-500">
                        Đã đặt trước
                        {table.reserved_at && (
                          <span className="block text-[9px] font-semibold text-orange-600">
                            {new Date(table.reserved_at).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        )}
                      </p>
                    )}
                    {table.status === "trong" && (
                      <p className="mt-1 text-[11px] font-semibold text-slate-400">Nhấp đúp để đặt món</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Excel-style resizable divider */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = rightPanelWidth;
            const handleMouseMove = (moveEvent) => {
              const deltaX = startX - moveEvent.clientX;
              const newWidth = Math.max(180, Math.min(380, startWidth + deltaX));
              setRightPanelWidth(newWidth);
            };
            const handleMouseUp = () => {
              document.removeEventListener("mousemove", handleMouseMove);
              document.removeEventListener("mouseup", handleMouseUp);
            };
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
          }}
          className="w-1.5 hover:w-2 bg-slate-200 hover:bg-emerald-600 active:bg-emerald-700 cursor-col-resize self-stretch transition-all duration-150 mx-1 rounded"
          title="Kéo để chỉnh kích cỡ"
        />

        {/* Right Panel */}
        <div 
          className="flex shrink-0 flex-col gap-4"
          style={{ width: `${rightPanelWidth}px` }}
        >

          {/* Tổng quan */}
          <div className="rounded-[14px] bg-emerald-700 p-4 text-white shadow-[0_18px_40px_rgba(4,120,87,0.18)]">
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} weight="duotone" className="opacity-80" />
              <p className="text-xs font-black uppercase tracking-wide opacity-80">Trực tiếp</p>
              <span className="admin-live-dot ml-auto" />
            </div>
            <p className="text-3xl font-black mt-1">
              {counts.dang_dung}
            </p>
            <p className="text-xs font-bold opacity-70 mt-0.5">
              bàn đang có khách
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] font-black opacity-70">
              Công suất {occupancyRate}%
            </p>
          </div>

          {/* Đặt bàn sắp tới */}
          <div className="admin-panel-pad flex-1">
            <div className="mb-3 flex items-center gap-2">
              <CalendarBlank size={15} weight="duotone" className="text-emerald-700" />
              <p className="admin-section-title">Đặt bàn sắp tới</p>
            </div>
            <ReservationList />
          </div>
        </div>
      </div>

      {/* Floating Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 min-w-[170px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
            {contextMenu.table.name}
          </p>
          
          <button
            onClick={() => {
              setSelectedQRTable(contextMenu.table);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            Mã QR Bàn
          </button>
          
          {contextMenu.table.status === "trong" && (
            <>
              <button
                onClick={() => {
                  handleUpdateTableStatus(contextMenu.table.id, "dang_dung").then(() => {
                    navigate(`/staff/orders/${contextMenu.table.id}`);
                  });
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Mở bàn
              </button>
              <button
                onClick={() => {
                  setReserveTableData({ id: contextMenu.table.id, name: contextMenu.table.name });
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-orange-600 hover:bg-orange-50 transition-colors"
              >
                Đặt trước
              </button>
            </>
          )}

          {contextMenu.table.status === "dang_dung" && (
            <>
              <button
                onClick={() => {
                  navigate(`/staff/orders/${contextMenu.table.id}`);
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                Order món
              </button>
              <button
                onClick={() => {
                  navigate(`/staff/payments/${contextMenu.table.id}`);
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors"
              >
                Thanh toán
              </button>
              <button
                onClick={() => {
                  setCloseTableData({ id: contextMenu.table.id, name: contextMenu.table.name });
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Đóng bàn
              </button>
            </>
          )}

          {contextMenu.table.status === "da_dat" && (
            <>
              <button
                onClick={() => {
                  handleUpdateTableStatus(contextMenu.table.id, "dang_dung").then(() => {
                    navigate(`/staff/orders/${contextMenu.table.id}`);
                  });
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Mở bàn
              </button>
              <button
                onClick={() => {
                  setCloseTableData({ id: contextMenu.table.id, name: contextMenu.table.name });
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Đóng bàn
              </button>
              {isReservationLate(contextMenu.table.reserved_at) && (
                <button
                  onClick={() => {
                    if (window.confirm("Bàn đã trễ hẹn hơn 30 phút. Xác nhận hủy bàn đặt trước này?")) {
                      handleUpdateTableStatus(contextMenu.table.id, "trong");
                    }
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
                >
                  Hủy bàn trễ
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Confirmation Modal for closing table */}
      {closeTableData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-black text-slate-900 mb-2">
              Xác nhận đóng bàn {closeTableData.name}
            </h3>
            <p className="text-xs font-bold text-slate-500 mb-4">
              Bạn có chắc chắn muốn đóng bàn này không? Vui lòng nhập ghi chú lý do đóng bàn bên dưới.
            </p>
            <textarea
              className="w-full h-24 rounded-xl border border-slate-200 p-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 mb-4 resize-none"
              placeholder="Nhập lý do đóng bàn tại đây..."
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setCloseTableData(null);
                  setCloseReason("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseTable}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-md shadow-red-500/10"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reservation Time Modal */}
      {reserveTableData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-black text-slate-900 mb-2">
              Đặt trước bàn {reserveTableData.name}
            </h3>
            <p className="text-xs font-bold text-slate-500 mb-4">
              Vui lòng chọn thời gian khách sẽ đến nhận bàn:
            </p>
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 mb-4"
              value={reserveTime}
              onChange={(e) => setReserveTime(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setReserveTableData(null);
                  setReserveTime("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmReserveTable}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/10"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedQRTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 print:hidden">
          <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.22)] text-center">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Mã QR {selectedQRTable.name}</h2>
              <button 
                type="button" 
                onClick={() => setSelectedQRTable(null)} 
                className="admin-tab h-9 min-h-9 px-3 font-bold"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs font-bold text-slate-400 mb-4 uppercase">
              Khu vực: {areas.find(a => a.id === selectedQRTable.area_id)?.name || "Chưa xác định"}
            </p>

            <div className="mx-auto my-6 flex h-60 w-60 items-center justify-center border border-slate-100 rounded-xl bg-slate-50 p-3 shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                  `${qrBaseUrl}/staff/orders/${selectedQRTable.id}?mode=qr`
                )}`}
                alt={`QR code for ${selectedQRTable.name}`}
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex gap-3">
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                  `${qrBaseUrl}/staff/orders/${selectedQRTable.id}?mode=qr`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 admin-primary-btn text-center flex items-center justify-center min-h-11"
              >
                Mở ảnh lớn để in
              </a>
              <button
                type="button"
                onClick={() => setSelectedQRTable(null)}
                className="flex-1 admin-tab min-h-11"
              >
                Đóng
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function ReservationList() {
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get("/api/tables/reservations/all");
        setReservations(res.data.slice(0, 5));
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  if (reservations.length === 0) {
    return (
      <p className="py-6 text-center text-xs font-semibold text-slate-400">
        Chưa có đặt bàn
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {reservations.map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">
            {r.num_guests}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-black text-slate-800">{r.customer_name}</p>
            <p className="text-[11px] font-semibold text-slate-400">
              {new Date(r.arrive_time).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })} • {r.table_name}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

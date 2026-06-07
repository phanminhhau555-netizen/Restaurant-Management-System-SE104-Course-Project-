import { useState, useRef, useEffect } from "react";
import { DotsThreeVertical, Plus, QrCode, Trash } from "@phosphor-icons/react";
import API from "../services/api";

const STATUS_CONFIG = {
  trong: {
    label: "Bàn trống",
    color: "bg-emerald-500",
    text: "text-emerald-700",
    border: "border-emerald-200",
    surface: "bg-emerald-50",
  },
  dang_dung: {
    label: "Có khách",
    color: "bg-blue-400",
    text: "text-blue-700",
    border: "border-blue-200",
    surface: "bg-blue-50",
  },
  da_dat: {
    label: "Đã đặt",
    color: "bg-orange-400",
    text: "text-orange-700",
    border: "border-orange-200",
    surface: "bg-orange-50",
  },
};

export { STATUS_CONFIG };

export default function TableMap({
  title = "Sơ đồ bàn",
  tables = [],
  areas = [],
  loading = false,
  activeArea,
  onAreaChange,
  editable = false,
  onAddArea,
  onAddTable,
  onDeleteArea,
  onDeleteTable,
  onUpdateStatus,
  onSelectTable,
  onReceiveGuests,
  onToggleOccupancy,
  emptyActionLabel,
  aside,
  totalLabel = "Tổng số bàn",
  kicker,
  showHeader = true,
  showSummary = true,
}) {
  const [selectedQRTable, setSelectedQRTable] = useState(null);
  const [serverIP, setServerIP] = useState("");

  useEffect(() => {
    API.get("/api/settings/server-ip")
      .then((res) => {
        if (res.data && res.data.ip) {
          setServerIP(res.data.ip);
        }
      })
      .catch((err) => console.error("Error fetching server IP:", err));
  }, []);

  const qrBaseUrl = serverIP && serverIP !== "127.0.0.1"
    ? `http://${serverIP}:${window.location.port || "5173"}`
    : window.location.origin;

  const filteredTables = activeArea
    ? tables.filter((table) => table.area_id === activeArea)
    : tables;

  const activeAreaName = activeArea
    ? areas.find((area) => area.id === activeArea)?.name
    : null;

  const counts = {
    trong: tables.filter((table) => table.status === "trong").length,
    dang_dung: tables.filter((table) => table.status === "dang_dung").length,
    da_dat: tables.filter((table) => table.status === "da_dat").length,
  };

  return (
    <div className="admin-page">
      {showHeader ? (
        <header className="admin-header items-start">
          <div>
            <p className="admin-kicker">{kicker || (editable ? "Quản trị" : "Phục vụ")}</p>
            <h1 className="admin-title">{title}</h1>
          </div>

          {editable ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <AreaMenuButton
                onAddArea={onAddArea}
                onDeleteArea={() => onDeleteArea?.(activeArea)}
                hasActiveArea={!!activeArea}
              />
              <button type="button" onClick={onAddTable} className="admin-primary-btn">
                <Plus size={15} weight="bold" />
                Bàn
              </button>
            </div>
          ) : null}
        </header>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <section className="min-w-0 space-y-4">
          {showSummary ? (
            <div className="admin-panel-pad flex flex-wrap items-center gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <span
                  key={key}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm font-black ${config.border} ${config.surface} ${config.text}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
                  {config.label}
                  <span className="rounded-lg bg-white/70 px-2 py-0.5 text-xs text-slate-700">{counts[key]}</span>
                </span>
              ))}
            </div>
          ) : null}

          {areas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onAreaChange?.(null)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-black transition-colors ${
                  activeArea === null
                    ? "bg-emerald-700 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Tất cả <span className={activeArea === null ? "text-emerald-100" : "text-slate-400"}>{tables.length}</span>
              </button>
              {areas.map((area) => {
                const isActive = activeArea === area.id;
                const areaCount = tables.filter((table) => table.area_id === area.id).length;
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => onAreaChange?.(area.id)}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-black transition-colors ${
                      isActive
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {area.name} <span className={isActive ? "text-emerald-100" : "text-slate-400"}>{areaCount}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {loading ? (
            <div className="admin-panel-pad flex min-h-72 items-center justify-center text-sm font-bold text-slate-400">
              Đang tải sơ đồ bàn...
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="admin-panel-pad flex min-h-72 flex-col items-center justify-center text-center">
              <p className="text-sm font-bold text-slate-500">
                {activeAreaName ? `Chưa có bàn nào trong ${activeAreaName}` : "Chưa có bàn nào"}
              </p>
              {editable && onAddTable ? (
                <button type="button" onClick={onAddTable} className="mt-3 admin-primary-btn">
                  {emptyActionLabel || "+ Thêm bàn"}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {filteredTables.map((table) => {
                const config = STATUS_CONFIG[table.status] || STATUS_CONFIG.trong;
                const areaName = areas.find((area) => area.id === table.area_id)?.name || "Chưa có khu vực";
                const hasInlineActions = !editable && Boolean(onToggleOccupancy || onReceiveGuests);
                const canOpenOrder = !editable && table.status === "dang_dung" && onSelectTable && !hasInlineActions;
                const TableShell = canOpenOrder ? "button" : "article";

                return (
                  <TableShell
                    key={table.id}
                    type={TableShell === "button" ? "button" : undefined}
                    onClick={TableShell === "button" ? () => onSelectTable(table) : undefined}
                    className={`min-h-44 rounded-xl border bg-white p-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-all duration-200 ${config.border} ${
                      TableShell === "button"
                        ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(15,23,42,0.085)]"
                        : ""
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-black ${config.border} ${config.surface} ${config.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${config.color}`} />
                        {config.label}
                      </span>
                      {canOpenOrder ? (
                        <span className="text-[11px] font-black text-blue-600">Mở order</span>
                      ) : null}
                    </div>

                    <div className="rounded-lg bg-slate-50/80 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Bàn</p>
                          <p className="mt-0.5 truncate text-2xl font-black leading-tight text-slate-950">{table.name}</p>
                        </div>
                        <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${config.color}`} />
                      </div>
                      <div className="mt-3 grid grid-cols-[70px_minmax(0,1fr)] gap-2 text-xs">
                        <span className="font-bold text-slate-400">Khu vực</span>
                        <span className="truncate text-right font-black text-slate-700">{areaName}</span>
                      </div>
                    </div>

                    {!editable && table.status === "dang_dung" && table.total_amount > 0 ? (
                      <div className="mt-2 grid grid-cols-[70px_minmax(0,1fr)] gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs">
                        <span className="font-bold text-slate-400">Tạm tính</span>
                        <span className="text-right font-black text-slate-800">
                          {new Intl.NumberFormat("vi-VN").format(table.total_amount)}đ
                        </span>
                      </div>
                    ) : null}

                    {!editable && table.status === "da_dat" ? (
                      <div className="mt-2 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
                        <p className="text-xs font-black text-orange-700">Bàn đang được giữ</p>
                      </div>
                    ) : null}

                    {editable ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Trạng thái</p>
                        <select
                          value={table.status}
                          onChange={(event) => onUpdateStatus?.(table.id, event.target.value)}
                          className="admin-field min-h-9 text-xs"
                        >
                          <option value="trong">Bàn trống</option>
                          <option value="dang_dung">Có khách</option>
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedQRTable(table)}
                            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-50"
                          >
                            <QrCode size={14} weight="bold" />
                            QR
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTable?.(table.id)}
                            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-black text-red-500 transition-colors hover:bg-red-50"
                          >
                            <Trash size={14} weight="bold" />
                            Xóa
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {!editable && ["trong", "dang_dung"].includes(table.status) && onToggleOccupancy ? (
                      <button
                        type="button"
                        onClick={() => onToggleOccupancy(table)}
                        className={`mt-4 min-h-10 w-full rounded-lg px-3 text-xs font-black text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${
                          table.status === "trong"
                            ? "bg-blue-600 hover:bg-blue-700 hover:shadow-[0_14px_26px_rgba(37,99,235,0.18)]"
                            : "bg-slate-700 hover:bg-slate-800 hover:shadow-sm"
                        }`}
                      >
                        {table.status === "trong" ? "Có khách" : "Trống"}
                      </button>
                    ) : null}

                    {!editable && table.status === "da_dat" && onReceiveGuests ? (
                      <button
                        type="button"
                        onClick={() => onReceiveGuests(table)}
                        className="mt-4 min-h-10 w-full rounded-lg bg-blue-600 px-3 text-xs font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_14px_26px_rgba(37,99,235,0.18)] active:translate-y-0"
                      >
                        Khách đã tới
                      </button>
                    ) : null}
                  </TableShell>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl bg-emerald-700 p-4 text-white shadow-[0_18px_42px_rgba(4,120,87,0.18)]">
            <p className="text-sm font-bold text-emerald-50/80">{totalLabel}</p>
            <p className="mt-1 text-3xl font-black">{tables.length}</p>
            <p className="mt-1 text-xs font-bold text-emerald-50/70">{areas.length} khu vực</p>
          </div>

          <div className="admin-panel-pad">
            <p className="admin-section-title mb-3">Theo khu vực</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onAreaChange?.(null)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  activeArea === null ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="truncate text-xs font-bold">Tất cả</span>
                <span className="shrink-0 text-xs font-black">{tables.length} bàn</span>
              </button>
              {areas.map((area) => {
                const areaTables = tables.filter((table) => table.area_id === area.id);
                const isActive = activeArea === area.id;
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => onAreaChange?.(area.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      isActive ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate text-xs font-bold">{area.name}</span>
                    <span className="shrink-0 text-xs font-black">{areaTables.length} bàn</span>
                  </button>
                );
              })}
            </div>
          </div>

          {aside}
        </aside>
      </div>

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
                  `${qrBaseUrl}/staff/orders/qr/${selectedQRTable.qr_token}?mode=qr`
                )}`}
                alt={`QR code for ${selectedQRTable.name}`}
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex gap-3">
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                  `${qrBaseUrl}/staff/orders/qr/${selectedQRTable.qr_token}?mode=qr`
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

function AreaMenuButton({ onAddArea, onDeleteArea, hasActiveArea }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="admin-secondary-btn"
      >
        <DotsThreeVertical size={17} weight="bold" />
        Khu vực
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          <button
            type="button"
            onClick={() => { setOpen(false); onAddArea?.(); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            + Thêm khu vực
          </button>
          <button
            type="button"
            disabled={!hasActiveArea}
            onClick={() => { setOpen(false); onDeleteArea?.(); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Xóa khu vực này
          </button>
        </div>
      )}
    </div>
  );
}

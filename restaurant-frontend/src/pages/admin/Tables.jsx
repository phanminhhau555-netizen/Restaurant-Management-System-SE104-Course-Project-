import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import TableMap from "../../components/TableMap";
import API from "../../services/api";
import { joinRealtimeRoom, subscribeRealtime } from "../../services/socketService";

export default function AdminTablesPage() {
  const [tables, setTables] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeArea, setActiveArea] = useState(null);
  const [showAddTable, setShowAddTable] = useState(false);
  const [showAddArea, setShowAddArea] = useState(false);
  const [tableForm, setTableForm] = useState({ name: "", area_id: "" });
  const [areaForm, setAreaForm] = useState({ name: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      const [tablesRes, areasRes] = await Promise.all([
        API.get("/api/tables"),
        API.get("/api/tables/areas"),
      ]);

      setTables(tablesRes.data);
      setAreas(areasRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được sơ đồ bàn.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    joinRealtimeRoom("admin");
    const unsubscribeStatus = subscribeRealtime("TABLE_STATUS_UPDATED", () => fetchData());
    const unsubscribeList = subscribeRealtime("TABLE_LIST_UPDATED", () => fetchData());
    const unsubscribePayment = subscribeRealtime("PAYMENT_COMPLETED", () => fetchData());

    Promise.all([API.get("/api/tables"), API.get("/api/tables/areas")])
      .then(([tablesRes, areasRes]) => {
        if (cancelled) return;
        setTables(tablesRes.data);
        setAreas(areasRes.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.message || "Không tải được sơ đồ bàn.");
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

  const handleAddTable = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await API.post("/api/tables", {
        name: tableForm.name,
        area_id: Number(tableForm.area_id),
      });
      setSuccess("Thêm bàn thành công.");
      setTableForm({ name: "", area_id: "" });
      setShowAddTable(false);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi thêm bàn.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddArea = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await API.post("/api/tables/areas", { name: areaForm.name });
      const createdAreaId = res.data?.id;

      setSuccess("Thêm khu vực thành công.");
      setAreaForm({ name: "" });
      setShowAddArea(false);
      setActiveArea(createdAreaId ?? null);
      setTableForm((prev) => ({ ...prev, area_id: createdAreaId ? String(createdAreaId) : prev.area_id }));
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi thêm khu vực.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTable = async (id) => {
    if (!window.confirm("Xóa bàn này?")) return;

    try {
      await API.delete(`/api/tables/${id}`);
      setSuccess("Xóa bàn thành công.");
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi xóa bàn.");
    }
  };

  const handleDeleteArea = async (id) => {
    if (!window.confirm("Xóa khu vực này? Tất cả bàn trong khu vực sẽ bị xóa.")) return;

    try {
      await API.delete(`/api/tables/areas/${id}`);
      setSuccess("Xóa khu vực thành công.");
      setActiveArea(null);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi xóa khu vực.");
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await API.patch(`/api/tables/${id}/status`, { status });
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi cập nhật trạng thái bàn.");
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {success}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        <TableMap
          title="Quản lý sơ đồ bàn"
          subtitle="Tạo khu vực, thêm bàn và cập nhật trạng thái vận hành."
          tables={tables}
          areas={areas}
          loading={loading}
          activeArea={activeArea}
          onAreaChange={setActiveArea}
          editable
          onAddArea={() => setShowAddArea(true)}
          onAddTable={() => {
            setTableForm((prev) => ({ ...prev, area_id: prev.area_id || String(activeArea || "") }));
            setShowAddTable(true);
          }}
          onDeleteArea={handleDeleteArea}
          onDeleteTable={handleDeleteTable}
          onUpdateStatus={handleUpdateStatus}
          emptyActionLabel="+ Thêm bàn ngay"
        />
      </div>

      {showAddTable ? (
        <TableModal title="Thêm bàn mới" onClose={() => setShowAddTable(false)}>
          <form onSubmit={handleAddTable} className="space-y-4">
            <label className="admin-label">
              Tên bàn
              <input
                type="text"
                placeholder="Ví dụ: Bàn 01, T1, B5..."
                value={tableForm.name}
                onChange={(event) => setTableForm({ ...tableForm, name: event.target.value })}
                className="admin-field mt-1"
                required
              />
            </label>
            <label className="admin-label">
              Khu vực
              <select
                value={tableForm.area_id}
                onChange={(event) => setTableForm({ ...tableForm, area_id: event.target.value })}
                className="admin-field mt-1"
                required
              >
                <option value="">Chọn khu vực</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
            <ModalActions
              onCancel={() => setShowAddTable(false)}
              submitting={submitting}
              submitLabel="Thêm bàn"
              submittingLabel="Đang thêm..."
            />
          </form>
        </TableModal>
      ) : null}

      {showAddArea ? (
        <TableModal title="Thêm khu vực mới" onClose={() => setShowAddArea(false)}>
          <form onSubmit={handleAddArea} className="space-y-4">
            <label className="admin-label">
              Tên khu vực
              <input
                type="text"
                placeholder="Ví dụ: Tầng 1, Sân thượng..."
                value={areaForm.name}
                onChange={(event) => setAreaForm({ name: event.target.value })}
                className="admin-field mt-1"
                required
              />
            </label>
            <ModalActions
              onCancel={() => setShowAddArea(false)}
              submitting={submitting}
              submitLabel="Thêm khu vực"
              submittingLabel="Đang thêm..."
            />
          </form>
        </TableModal>
      ) : null}
    </Layout>
  );
}

function TableModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,0.22)]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-black text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="admin-tab h-9 min-h-9 px-3">
            x
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ModalActions({ onCancel, submitting, submitLabel, submittingLabel }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel} className="admin-tab flex-1">
        Hủy
      </button>
      <button type="submit" disabled={submitting} className="admin-primary-btn flex-1">
        {submitting ? submittingLabel : submitLabel}
      </button>
    </div>
  );
}

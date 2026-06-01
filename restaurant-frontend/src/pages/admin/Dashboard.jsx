import { useEffect, useState } from "react";
import { ChartBar, CurrencyCircleDollar, ForkKnife, UsersThree } from "@phosphor-icons/react";
import Layout from "../../components/Layout";
import API from "../../services/api";

const StatCard = ({ label, value, icon: Icon, tone = "emerald" }) => {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-50 text-slate-700",
  }[tone];

  return (
    <div className="admin-panel-pad admin-lift">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon size={23} weight="duotone" />
        </span>
      </div>
    </div>
  );
};

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="h-12 animate-pulse rounded-lg bg-gray-100" />
      ))}
    </div>
  );
}

function EmptyOrders() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl bg-slate-50 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
        <ForkKnife size={24} weight="duotone" />
      </div>
      <p className="mt-4 font-black text-slate-900">Ca này đang yên ắng</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    doanh_thu: 0,
    tong_don: 0,
    tong_mon: 0,
  });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setError("");
      try {
        const [revenueRes, ordersRes] = await Promise.all([
          API.get("/api/reports/revenue/day"),
          API.get("/api/orders/active"),
        ]);
        setStats({
          doanh_thu: revenueRes.data.tong_doanh_thu || 0,
          tong_don: revenueRes.data.tong_don || 0,
        });
        setOrders(ordersRes.data || []);
      } catch {
        setError("Không tải được dữ liệu tổng quan. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatMoney = (amount) =>
    new Intl.NumberFormat("vi-VN").format(amount) + "đ";

  const getStatusColor = (status) => {
    switch (status) {
      case "dang_goi": return "bg-blue-100 text-blue-600";
      case "cho_thanh_toan": return "bg-yellow-100 text-yellow-600";
      case "da_thanh_toan": return "bg-green-100 text-green-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "dang_goi": return "Đang gọi";
      case "cho_thanh_toan": return "Chờ TT";
      case "da_thanh_toan": return "Đã TT";
      default: return status;
    }
  };

  return (
    <Layout>
      <div className="admin-page">
        <header className="admin-header">
          <div>
            <p className="admin-kicker">Tổng quan</p>
            <h1 className="admin-title">Báo cáo hiệu suất</h1>
          </div>
          <div className="flex gap-2">
            {["Ngày", "Tuần", "Tháng"].map((item) => (
              <button
                key={item}
                type="button"
                className={`admin-tab ${item === "Ngày" ? "admin-tab-active" : ""}`}
              >
                {item}
              </button>
            ))}
          </div>
        </header>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {/* Stat Cards */}
      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard icon={CurrencyCircleDollar} label="Doanh thu ngày" value={formatMoney(stats.doanh_thu)} />
        <StatCard icon={ChartBar} label="Tổng đơn hàng" value={stats.tong_don} tone="blue" />
        <StatCard icon={ForkKnife} label="Bàn đang dùng" value={orders.length} tone="amber" />
        <StatCard icon={UsersThree} label="Tổng khách hàng" value={stats.tong_khach || 0} tone="slate" />
      </div>
      {/* Orders Table */}
      <div className="admin-panel-pad">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="admin-section-title">
            Trạng thái đơn hàng trực tiếp
          </h2>
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Đang gọi
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              Chờ thanh toán
            </span>
          </div>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : orders.length === 0 ? (
          <EmptyOrders />
        ) : (
          <div className="overflow-x-auto">
          <table className="admin-table min-w-[720px]">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-3">MÃ ĐƠN</th>
                <th className="text-left pb-3">BÀN</th>
                <th className="text-left pb-3">TỔNG CỘNG</th>
                <th className="text-left pb-3">THỜI GIAN</th>
                <th className="text-left pb-3">TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <tr key={order.id} className="text-sm transition-colors hover:bg-gray-50">
                  <td className="py-3 font-medium text-gray-800">
                    #ORD-{order.id}
                  </td>
                  <td className="py-3 text-gray-600">
                    {order.table_name || `Bàn ${order.table_id}`}
                  </td>
                  <td className="py-3 text-gray-800">
                    {formatMoney(order.total_amount || 0)}
                  </td>
                  <td className="py-3 text-gray-400">
                    {new Date(order.created_at).toLocaleTimeString("vi-VN")}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
      </div>
    </Layout>
  );
}

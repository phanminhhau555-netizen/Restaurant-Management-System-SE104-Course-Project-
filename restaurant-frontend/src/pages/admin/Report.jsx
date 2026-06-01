import { useEffect, useState } from "react";
import {
  Bank,
  ChartLineUp,
  CreditCard,
  CurrencyCircleDollar,
  ForkKnife,
  Package,
  TrendUp,
  WarningCircle,
} from "@phosphor-icons/react";
import Layout from "../../components/Layout";
import API from "../../services/api";

const TABS = [
  { key: "day", label: "Hôm nay" },
  { key: "week", label: "Tuần" },
  { key: "month", label: "Tháng" },
];

const paymentLabels = {
  tien_mat: "Tiền mặt",
  chuyen_khoan: "Chuyển khoản",
  qr: "QR Pay",
};

function MetricCard({ label, value, icon: Icon, tone = "emerald" }) {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <article className="admin-panel-pad admin-lift">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon size={23} weight="duotone" />
        </span>
      </div>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div key={item} className="h-40 animate-pulse rounded-2xl bg-white" />
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState("day");
  const [revenue, setRevenue] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      setLoading(true);
      setError("");
      try {
        const [revRes, topRes, invRes] = await Promise.all([
          API.get(`/api/reports/revenue/${tab}`),
          API.get("/api/reports/top-items?limit=5"),
          API.get("/api/reports/inventory"),
        ]);

        if (mounted) {
          setRevenue(revRes.data);
          setTopItems(topRes.data || []);
          setInventory(invRes.data);
        }
      } catch {
        if (mounted) setError("Không tải được dữ liệu báo cáo.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAll();

    return () => {
      mounted = false;
    };
  }, [tab]);

  const formatMoney = (amount) =>
    new Intl.NumberFormat("vi-VN").format(amount || 0) + "đ";

  const getMaxSold = () =>
    Math.max(...topItems.map((item) => item.tong_so_luong || 0), 1);

  const stockWarningCount =
    (inventory?.canh_bao_sap_het?.length || 0) +
    (inventory?.canh_bao_het_hang?.length || 0);

  return (
    <Layout>
      <div className="admin-page">
        <header className="admin-header">
          <div>
            <p className="admin-kicker">Báo cáo</p>
            <h1 className="admin-title">Hiệu suất kinh doanh</h1>
          </div>

          <div className="flex gap-2">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`admin-tab ${tab === item.key ? "admin-tab-active" : ""}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <LoadingState />
        ) : (
          <>
            <section className="grid gap-4 xl:grid-cols-3">
              <MetricCard
                icon={CurrencyCircleDollar}
                label="Tổng doanh thu"
                value={formatMoney(revenue?.tong_doanh_thu)}
              />
              <MetricCard
                icon={TrendUp}
                label="Giá trị đơn trung bình"
                value={formatMoney((revenue?.tong_doanh_thu || 0) / (revenue?.tong_don || 1))}
                tone="blue"
              />
              <MetricCard
                icon={ForkKnife}
                label="Tổng đơn hàng"
                value={revenue?.tong_don || 0}
                tone="amber"
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="admin-panel-pad">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="admin-section-title">Xu hướng doanh thu</h2>
                  </div>
                  <ChartLineUp size={24} className="text-emerald-700" weight="duotone" />
                </div>

                {tab === "day" ? (
                  <div className="flex min-h-52 items-center justify-center rounded-2xl bg-slate-50">
                    <div className="text-center">
                      <p className="text-4xl font-black tracking-tight text-slate-950">
                        {formatMoney(revenue?.tong_doanh_thu)}
                      </p>
                      <p className="mt-3 text-sm font-semibold text-slate-500">
                        {revenue?.tong_don || 0} đơn hàng đã thanh toán hôm nay
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(revenue?.chi_tiet || []).map((day) => {
                      const maxRevenue = Math.max(
                        ...(revenue?.chi_tiet || []).map((item) => item.tong_doanh_thu || 0),
                        1,
                      );

                      return (
                        <div key={day.ngay} className="grid grid-cols-[110px_1fr_120px] items-center gap-4">
                          <p className="text-xs font-bold text-slate-400">
                            {new Date(day.ngay).toLocaleDateString("vi-VN")}
                          </p>
                          <div className="h-2 rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-emerald-700"
                              style={{
                                width: `${Math.min(((day.tong_doanh_thu || 0) / maxRevenue) * 100, 100)}%`,
                              }}
                            />
                          </div>
                          <p className="text-right text-xs font-black text-slate-700">
                            {formatMoney(day.tong_doanh_thu)}
                          </p>
                        </div>
                      );
                    })}
                    {(!revenue?.chi_tiet || revenue.chi_tiet.length === 0) && (
                      <p className="py-12 text-center text-sm font-semibold text-slate-400">
                        Chưa có dữ liệu trong kỳ này.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="admin-panel-pad">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="admin-section-title">Món bán chạy</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                    Top 5
                  </span>
                </div>

                <div className="space-y-4">
                  {topItems.length === 0 ? (
                    <p className="py-12 text-center text-sm font-semibold text-slate-400">
                      Chưa có dữ liệu món bán.
                    </p>
                  ) : (
                    topItems.map((item, index) => (
                      <div key={`${item.mon_ten}-${index}`}>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-black text-slate-800">{item.mon_ten}</p>
                          <p className="text-sm font-black text-emerald-700">
                            {item.tong_so_luong} đơn
                          </p>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-emerald-700"
                            style={{ width: `${((item.tong_so_luong || 0) / getMaxSold()) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <div className="admin-panel-pad">
                <h2 className="admin-section-title">Phương thức thanh toán</h2>
                <div className="mt-5 space-y-3">
                  {(revenue?.chi_tiet_thanh_toan || []).length === 0 ? (
                    <p className="py-10 text-center text-sm font-semibold text-slate-400">
                      Chưa có dữ liệu thanh toán.
                    </p>
                  ) : (
                    (revenue?.chi_tiet_thanh_toan || []).map((payment) => (
                      <div
                        key={payment.payment_method}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700">
                            {payment.payment_method === "tien_mat" ? (
                              <CurrencyCircleDollar size={22} weight="duotone" />
                            ) : payment.payment_method === "chuyen_khoan" ? (
                              <Bank size={22} weight="duotone" />
                            ) : (
                              <CreditCard size={22} weight="duotone" />
                            )}
                          </span>
                          <p className="text-sm font-black text-slate-800">
                            {paymentLabels[payment.payment_method] || "QR Code"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900">
                            {formatMoney(payment.tong_doanh_thu)}
                          </p>
                          <p className="text-xs font-bold text-slate-400">{payment.tong_don} đơn</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="admin-panel-pad">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="admin-section-title">Cảnh báo kho</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      stockWarningCount > 0
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {stockWarningCount} sự kiện
                  </span>
                </div>

                <div className="space-y-3">
                  {(inventory?.canh_bao_het_hang || []).map((item) => (
                    <div key={`out-${item.id || item.name}`} className="flex gap-3 rounded-xl bg-red-50 p-4">
                      <WarningCircle size={22} className="shrink-0 text-red-600" weight="duotone" />
                      <div>
                        <p className="text-sm font-black text-red-800">Hết nguyên liệu</p>
                        <p className="mt-1 text-xs font-semibold text-red-600">
                          {item.name} đã hết hàng. Cần nhập bổ sung ngay.
                        </p>
                      </div>
                    </div>
                  ))}

                  {(inventory?.canh_bao_sap_het || []).map((item) => (
                    <div key={`low-${item.id || item.name}`} className="flex gap-3 rounded-xl bg-amber-50 p-4">
                      <Package size={22} className="shrink-0 text-amber-700" weight="duotone" />
                      <div>
                        <p className="text-sm font-black text-amber-800">Sắp hết nguyên liệu</p>
                        <p className="mt-1 text-xs font-semibold text-amber-700">
                          {item.name} còn {item.quantity} {item.unit}. Mức tối thiểu: {item.min_quantity} {item.unit}.
                        </p>
                      </div>
                    </div>
                  ))}

                  {stockWarningCount === 0 && (
                    <div className="rounded-xl bg-slate-50 px-4 py-12 text-center">
                      <p className="text-sm font-black text-slate-700">Tồn kho ổn định</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        Không có nguyên liệu cần xử lý ngay.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}

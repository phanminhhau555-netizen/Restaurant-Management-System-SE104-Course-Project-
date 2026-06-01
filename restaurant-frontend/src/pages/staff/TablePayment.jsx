import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  ForkKnife,
  Money,
  QrCode,
  Receipt,
  User,
  WarningCircle,
} from "@phosphor-icons/react";
import API from "../../services/api";

const PAYMENT_METHODS = {
  tien_mat: "Tiền mặt",
  chuyen_khoan: "Thẻ tín dụng",
  qr: "QR Pay",
};

const BANK_CONFIG = {
  bankId: "VCB",
  accountNo: "1049144528",
  accountName: "PHAM TRUONG PHAT",
};

const methodIcons = {
  tien_mat: Money,
  chuyen_khoan: CreditCard,
  qr: QrCode,
};

export default function TablePayment() {
  const { tableId } = useParams();
  const navigate = useNavigate();

  const [table, setTable] = useState(null);
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [activePaymentMethods, setActivePaymentMethods] = useState(["tien_mat", "chuyen_khoan", "qr"]);
  const [paymentMethod, setPaymentMethod] = useState("tien_mat");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customer, setCustomer] = useState(null);
  const [customerMessage, setCustomerMessage] = useState("");
  const [customerWasCreated, setCustomerWasCreated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activeBank = useMemo(() => {
    let currentBankId = BANK_CONFIG.bankId;
    let currentAccountNo = BANK_CONFIG.accountNo;
    let currentAccountName = BANK_CONFIG.accountName;

    if (settings?.invoice_template) {
      try {
        const tpl = JSON.parse(settings.invoice_template);
        if (tpl.bank_id) currentBankId = tpl.bank_id;
        if (tpl.account_no) currentAccountNo = tpl.account_no;
        if (tpl.account_name) currentAccountName = tpl.account_name;
      } catch (e) {}
    }

    return {
      bankId: currentBankId,
      accountNo: currentAccountNo,
      accountName: currentAccountName,
    };
  }, [settings]);

  const visibleItems = useMemo(() => items.filter((item) => item.status !== "huy"), [items]);
  const totalAmount = visibleItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );
  const totalItems = visibleItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  useEffect(() => {
    fetchData();
  }, [tableId]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [tableRes, ordersRes, settingsRes] = await Promise.all([
        API.get(`/api/tables/${tableId}`),
        API.get("/api/orders"),
        API.get("/api/settings"),
      ]);

      setTable(tableRes.data);

      if (settingsRes.data) {
        setSettings(settingsRes.data);
        if (settingsRes.data.payment_methods) {
          const methods = settingsRes.data.payment_methods.split(",").map((s) => s.trim()).filter(Boolean);
          setActivePaymentMethods(methods);
          if (methods.length > 0) setPaymentMethod((current) => methods.includes(current) ? current : methods[0]);
        }
      }

      const currentOrder = (ordersRes.data || []).find(
        (entry) =>
          Number(entry.table_id) === Number(tableId) &&
          ["dang_goi", "cho_thanh_toan"].includes(entry.status)
      );

      if (!currentOrder) {
        setOrder(null);
        setItems([]);
        return;
      }

      const detailRes = await API.get(`/api/orders/${currentOrder.id}`);
      setOrder({ ...currentOrder, ...detailRes.data });
      setItems(detailRes.data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được thông tin thanh toán.");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) => new Intl.NumberFormat("vi-VN").format(amount || 0) + "đ";

  const lookupCustomer = async () => {
    const phone = customerPhone.trim();
    if (!phone) {
      setCustomer(null);
      setCustomerMessage("");
      setCustomerWasCreated(false);
      return null;
    }

    const res = await API.post("/api/customers/lookup", { phone });
    const nextCustomer = res.data?.customer || null;
    const isNew = Boolean(res.data?.isNew);
    setCustomer(nextCustomer);
    setCustomerWasCreated(isNew);
    setCustomerMessage(
      isNew
        ? "Đã tạo khách hàng mới."
        : `Tìm thấy khách hàng${nextCustomer?.full_name ? `: ${nextCustomer.full_name}` : ""}.`
    );
    return {
      customer: nextCustomer,
      isNew,
    };
  };

  const getCheckoutCustomer = async () => {
    if (!customerPhone.trim()) return null;
    if (customer) {
      return {
        customer,
        isNew: customerWasCreated,
      };
    }
    return lookupCustomer();
  };

  const completePayment = async () => {
    if (!order || visibleItems.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const checkoutCustomerResult = await getCheckoutCustomer();
      const checkoutCustomer = checkoutCustomerResult?.customer || null;
      await API.post(`/api/payment/${order.id}/checkout`, {
        payment_method: paymentMethod,
        customer_id: checkoutCustomer?.id || null,
        items: visibleItems.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          price: item.price,
          note: item.note || "",
        })),
      });
      alert(
        checkoutCustomerResult?.isNew
          ? "Đã tạo khách hàng mới."
          : checkoutCustomer
            ? "Thanh toán thành công. Điểm tích lũy đã được cộng cho khách hàng!"
            : "Thanh toán hóa đơn thành công!"
      );
      navigate("/staff/tables");
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi thanh toán.");
      alert("Lỗi thanh toán: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = () => {
    completePayment();
  };

  if (loading) {
    return (
      <div className="admin-soft-grid flex min-h-screen items-center justify-center bg-[#eff1ea]">
        <p className="text-sm font-semibold text-slate-400">Đang tải thanh toán...</p>
      </div>
    );
  }

  return (
    <div className="admin-page flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#fbfbf8]/95 px-5 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/staff/tables")}
              className="admin-secondary-btn h-9 w-9 p-0"
              type="button"
            >
              <ArrowLeft size={16} weight="bold" />
            </button>
            <div>
              <p className="admin-kicker">Thanh toán</p>
              <h1 className="text-[18px] font-black leading-tight text-slate-950">
                {table?.name || "Bàn"}
              </h1>
            </div>
          </div>
          {order && (
            <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
              Đơn #{order.id}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-4 overflow-hidden p-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
            <WarningCircle size={14} weight="duotone" />
            {error}
          </div>
        )}

        {!order ? (
          <section className="admin-panel flex flex-1 flex-col items-center justify-center text-center">
            <ForkKnife size={42} weight="duotone" className="mb-3 text-slate-300" />
            <p className="text-sm font-black text-slate-700">Bàn này chưa có đơn đang mở</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">Quay lại sơ đồ bàn để order món trước khi thanh toán.</p>
          </section>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="admin-panel flex min-h-0 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
                <div>
                  <p className="admin-section-title">Món đã gọi</p>
                  <p className="admin-muted mt-0.5">{totalItems} món trong hóa đơn</p>
                </div>
                <p className="text-lg font-black text-emerald-700">{formatMoney(totalAmount)}</p>
              </div>

              {visibleItems.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-16 text-slate-400">
                  <ForkKnife size={36} weight="duotone" className="mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">Chưa có món để thanh toán</p>
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <table className="w-full border-collapse text-left text-xs font-semibold">
                    <thead>
                      <tr className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50 text-slate-400">
                        <th className="p-3">Tên món</th>
                        <th className="p-3 text-center">Số lượng</th>
                        <th className="p-3 text-right">Đơn giá</th>
                        <th className="p-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                      {visibleItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <span className="block font-black text-slate-900">{item.mon_ten}</span>
                            {item.note && <span className="mt-0.5 block text-[10px] font-semibold text-amber-600">Ghi chú: {item.note}</span>}
                          </td>
                          <td className="p-3 text-center font-black text-slate-900">{item.quantity}</td>
                          <td className="p-3 text-right text-slate-500">{formatMoney(item.price)}</td>
                          <td className="p-3 text-right font-black text-slate-900">
                            {formatMoney(Number(item.price || 0) * Number(item.quantity || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <aside className="admin-panel-pad flex min-h-0 flex-col bg-white">
              <div className="rounded-xl bg-slate-50 px-3 py-3">
                <div className="flex items-center gap-2">
                  <Receipt size={18} weight="duotone" className="text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tổng thanh toán</p>
                </div>
                <p className="mt-1 text-2xl font-black text-emerald-700">{formatMoney(totalAmount)}</p>
              </div>

              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <User size={18} weight="duotone" className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Khách hàng tích điểm
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(event) => {
                      setCustomerPhone(event.target.value);
                      setCustomer(null);
                      setCustomerMessage("");
                      setCustomerWasCreated(false);
                    }}
                    onBlur={() => {
                      if (customerPhone.trim()) lookupCustomer().catch(() => {});
                    }}
                    placeholder="Nhập số điện thoại"
                    className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                  <button
                    type="button"
                    onClick={() => lookupCustomer().catch((err) => setError(err.response?.data?.message || "Không tìm được khách hàng."))}
                    className="admin-secondary-btn h-10 px-3 text-xs"
                  >
                    Kiểm tra
                  </button>
                </div>
                {(customerMessage || customer) && (
                  <p className="mt-2 text-[11px] font-bold text-emerald-700">
                    {customerMessage}
                    {customer?.points != null ? ` Hiện có ${customer.points} điểm.` : ""}
                  </p>
                )}
                <p className="mt-1 text-[10px] font-semibold text-slate-400">
                  Bỏ trống nếu khách không cần tích điểm.
                </p>
              </div>

              <div className="mt-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Phương thức thanh toán
                </span>
                <div className="mt-2 grid gap-2">
                  {Object.entries(PAYMENT_METHODS)
                    .filter(([key]) => activePaymentMethods.includes(key))
                    .map(([key, label]) => {
                      const Icon = methodIcons[key];
                      const active = paymentMethod === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPaymentMethod(key)}
                          className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 transition-colors ${
                            active
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <span className="flex items-center gap-2 text-xs font-black">
                            <Icon size={18} weight="duotone" />
                            {label}
                          </span>
                          <span className={`h-3 w-3 rounded-full border ${active ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"}`} />
                        </button>
                      );
                    })}
                </div>
              </div>

              {paymentMethod === "qr" && (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mx-auto flex h-[220px] w-[220px] items-center justify-center overflow-hidden rounded-xl border border-white bg-white p-1 shadow-sm">
                    <img
                      src={`https://img.vietqr.io/image/${activeBank.bankId}-${activeBank.accountNo}-compact2.png?amount=${totalAmount}&addInfo=NHWOW%20${order.id}&accountName=${encodeURIComponent(activeBank.accountName)}`}
                      alt="VietQR Code"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="mt-3 space-y-1 text-center text-xs font-semibold text-slate-600">
                    <p><span className="font-bold text-slate-800">STK {activeBank.bankId}:</span> {activeBank.accountNo}</p>
                    <p><span className="font-bold text-slate-800">Chủ tài khoản:</span> {activeBank.accountName}</p>
                    <p><span className="font-bold text-slate-800">Số tiền:</span> <span className="font-black text-emerald-700">{formatMoney(totalAmount)}</span></p>
                    <p>
                      <span className="font-bold text-slate-800">Nội dung:</span>{" "}
                      <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono font-bold text-slate-800">
                        NHWOW {order.id}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={visibleItems.length === 0 || submitting}
                className="admin-primary-btn mt-auto h-11 w-full text-xs font-black disabled:opacity-60"
              >
                {submitting ? "Đang xử lý..." : "Thanh toán"}
              </button>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

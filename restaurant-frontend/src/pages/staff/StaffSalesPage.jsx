import { useEffect, useState, useMemo } from "react";
import { CalendarBlank, Clock, MagnifyingGlass, Receipt, User, Users, Money, CreditCard, QrCode } from "@phosphor-icons/react";
import API from "../../services/api";

const STATUS_CONFIG = {
  dang_goi: { label: "Đang gọi", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  cho_thanh_toan: { label: "Chờ thanh toán", bg: "bg-orange-50 text-orange-700 border-orange-200" },
  da_thanh_toan: { label: "Đã thanh toán", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  huy: { label: "Đã hủy", bg: "bg-rose-50 text-rose-700 border-rose-200" }
};

const PAYMENT_METHODS = {
  tien_mat: "Tiền mặt",
  chuyen_khoan: "Thẻ tín dụng",
  qr: "QR Pay"
};

const BANK_CONFIG = {
  bankId: "VCB",
  accountNo: "1049144528",
  accountName: "PHAM TRUONG PHAT"
};

export default function StaffSalesPage() {
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [checkoutMethod, setCheckoutMethod] = useState("tien_mat");
  const [activePaymentMethods, setActivePaymentMethods] = useState(["tien_mat", "chuyen_khoan", "qr"]);
  const [settings, setSettings] = useState(null);
  const [checkoutCustomerPhone, setCheckoutCustomerPhone] = useState("");
  const [checkoutCustomer, setCheckoutCustomer] = useState(null);
  const [checkoutCustomerMessage, setCheckoutCustomerMessage] = useState("");

  const activeBank = useMemo(() => {
    let currentBankId = BANK_CONFIG.bankId;
    let currentAccountNo = BANK_CONFIG.accountNo;
    let currentAccountName = BANK_CONFIG.accountName;

    if (settings && settings.invoice_template) {
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
      accountName: currentAccountName
    };
  }, [settings]);

  useEffect(() => {
    if (checkoutMethod === "qr" && selectedOrder) {
      API.get("/api/settings")
        .then(res => {
          if (res.data) {
            setSettings(res.data);
            if (res.data.payment_methods) {
              const methods = res.data.payment_methods.split(",").map(s => s.trim());
              setActivePaymentMethods(methods);
            }
          }
        })
        .catch(err => console.error("Error updating settings:", err));
    }
  }, [checkoutMethod, selectedOrder]);

  // Filters State
  const [filterDate, setFilterDate] = useState(getTodayString()); // YYYY-MM-DD mặc định là ngày hôm nay
  const [filterMonth, setFilterMonth] = useState(""); // YYYY-MM
  const [filterYear, setFilterYear] = useState(""); // YYYY
  const [startHour, setStartHour] = useState(""); // 0-23
  const [endHour, setEndHour] = useState(""); // 0-23
  const [filterStatus, setFilterStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchOrders();
    API.get("/api/settings")
      .then(res => {
        if (res.data) {
          setSettings(res.data);
          if (res.data.payment_methods) {
            const methods = res.data.payment_methods.split(",").map(s => s.trim());
            setActivePaymentMethods(methods);
            if (methods.length > 0 && !methods.includes(checkoutMethod)) {
              setCheckoutMethod(methods[0]);
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await API.get("/api/orders");
      setOrders(res.data || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách hóa đơn:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetail = async (orderId) => {
    setLoadingDetail(true);
    try {
      const res = await API.get(`/api/orders/${orderId}`);
      setOrderDetail(res.data);
    } catch (err) {
      console.error("Lỗi lấy chi tiết hóa đơn:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setCheckoutCustomerPhone("");
    setCheckoutCustomer(null);
    setCheckoutCustomerMessage("");
    fetchOrderDetail(order.id);
  };

  const lookupCheckoutCustomer = async () => {
    const phone = checkoutCustomerPhone.trim();
    if (!phone) {
      setCheckoutCustomer(null);
      setCheckoutCustomerMessage("");
      return null;
    }

    const res = await API.post("/api/customers/lookup-existing", { phone });
    const customer = res.data?.customer || null;
    setCheckoutCustomer(customer);
    setCheckoutCustomerMessage(
      `Tìm thấy khách hàng${customer?.full_name ? `: ${customer.full_name}` : ""}.`
    );
    return {
      customer,
    };
  };

  const getCheckoutCustomer = async () => {
    if (!checkoutCustomerPhone.trim()) return null;
    if (checkoutCustomer) {
      return {
        customer: checkoutCustomer,
      };
    }
    return lookupCheckoutCustomer();
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilterDate(getTodayString());
    setFilterMonth("");
    setFilterYear("");
    setStartHour("");
    setEndHour("");
    setFilterStatus("");
    setSearchTerm("");
  };

  // Filtered Orders Logic
  const filteredOrders = useMemo(() => {
    console.log("DEBUG - total orders:", orders.length, "filterDate:", filterDate);
    return orders.filter((order) => {
      const orderDate = new Date(order.created_at);
      const d = orderDate.toISOString().split("T")[0];
      const isMatch = d === filterDate;
      console.log(`Order #${order.id} | created_at: ${order.created_at} | converted ISO: ${d} | filterDate: ${filterDate} | Match: ${isMatch}`);
      
      // 1. Ngày tháng năm
      if (filterDate) {
        if (d !== filterDate) return false;
      }
      
      if (filterMonth) {
        const m = orderDate.toISOString().substring(0, 7); // YYYY-MM
        if (m !== filterMonth) return false;
      }

      if (filterYear) {
        const y = orderDate.getFullYear().toString();
        if (y !== filterYear) return false;
      }

      // 2. Bộ lọc giờ
      const hour = orderDate.getHours();
      if (startHour !== "") {
        if (hour < Number(startHour)) return false;
      }
      if (endHour !== "") {
        if (hour > Number(endHour)) return false;
      }

      // 3. Trạng thái
      if (filterStatus && order.status !== filterStatus) return false;

      // 4. Tìm kiếm từ khóa (Mã đơn, Tên bàn, Người tạo)
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        const orderIdStr = order.id.toString();
        const tableName = (order.table_name || "").toLowerCase();
        const creatorName = (order.account_name || "").toLowerCase();
        
        if (
          !orderIdStr.includes(term) &&
          !tableName.includes(term) &&
          !creatorName.includes(term)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [orders, filterDate, filterMonth, filterYear, startHour, endHour, filterStatus, searchTerm]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const completed = filteredOrders.filter(o => o.status === "da_thanh_toan");
    const totalRevenue = completed.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    return {
      totalCount: filteredOrders.length,
      completedCount: completed.length,
      revenue: totalRevenue
    };
  }, [filteredOrders]);

  const formatMoney = (amount) =>
    new Intl.NumberFormat("vi-VN").format(amount) + "đ";

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="admin-soft-grid flex min-h-screen flex-col bg-[#eff1ea]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#fbfbf8]/95 px-5 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-4">
          <div>
            <p className="admin-kicker">Nhân viên</p>
            <h1 className="text-[18px] font-black leading-tight text-slate-950">
              Quản lý bán hàng
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-4 p-4">
        
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="admin-panel-pad bg-[#fbfbf8]">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tổng số đơn hàng</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.totalCount}</p>
          </div>
          <div className="admin-panel-pad bg-[#fbfbf8]">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Đơn hàng hoàn tất</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{stats.completedCount}</p>
          </div>
          <div className="admin-panel-pad bg-[#fbfbf8]">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Doanh thu bộ lọc</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{formatMoney(stats.revenue)}</p>
          </div>
        </div>

        {/* Filter Panel */}
        <div className="admin-panel-pad bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Bộ lọc tìm kiếm</h2>
            <button 
              onClick={handleResetFilters} 
              className="text-[11px] font-black text-emerald-700 hover:text-emerald-800"
            >
              Đặt lại bộ lọc
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">Tìm kiếm từ khóa</span>
              <div className="relative">
                <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Mã đơn, tên bàn, nhân viên..."
                  className="w-full h-8 rounded-lg border border-slate-200 pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100"
                />
              </div>
            </div>

            {/* Date Filters */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-1">Thời gian (Ngày / Tháng / Năm)</span>
              <div className="grid grid-cols-3 gap-1">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    setFilterMonth("");
                    setFilterYear("");
                  }}
                  className="h-8 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-800 outline-none focus:border-emerald-500"
                />
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => {
                    setFilterMonth(e.target.value);
                    setFilterDate("");
                    setFilterYear("");
                  }}
                  className="h-8 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-800 outline-none focus:border-emerald-500"
                />
                <select
                  value={filterYear}
                  onChange={(e) => {
                    setFilterYear(e.target.value);
                    setFilterDate("");
                    setFilterMonth("");
                  }}
                  className="h-8 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-800 outline-none focus:border-emerald-500"
                >
                  <option value="">Năm...</option>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hour Filter */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-1">Khung giờ đặt đơn</span>
              <div className="flex items-center gap-1">
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-800 outline-none focus:border-emerald-500 flex-1"
                >
                  <option value="">Từ...</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i}h</option>
                  ))}
                </select>
                <span className="text-slate-400 text-[10px] font-bold">đến</span>
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-800 outline-none focus:border-emerald-500 flex-1"
                >
                  <option value="">Đến...</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i}h</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-1">Trạng thái</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-8 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="admin-panel overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <p className="text-sm font-semibold">Đang tải danh sách hóa đơn...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <p className="text-sm font-semibold">Không tìm thấy đơn hàng nào trùng khớp</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs font-semibold">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-400">
                    <th className="p-3">Mã đơn</th>
                    <th className="p-3">Bàn</th>
                    <th className="p-3">Thời gian đặt</th>
                    <th className="p-3">Tổng tiền</th>
                    <th className="p-3">Thanh toán</th>
                    <th className="p-3">Nhân viên tạo</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {filteredOrders.map((order) => {
                    const status = STATUS_CONFIG[order.status] || { label: order.status, bg: "bg-slate-100 text-slate-700" };
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 text-slate-900 font-bold">#{order.id}</td>
                        <td className="p-3 font-black text-slate-900">{order.table_name || "Mang về"}</td>
                        <td className="p-3 text-slate-500 font-semibold">{formatDate(order.created_at)}</td>
                        <td className="p-3 font-black text-emerald-700">{formatMoney(order.total_amount || 0)}</td>
                        <td className="p-3 text-slate-600">{PAYMENT_METHODS[order.payment_method] || "Chưa chọn"}</td>
                        <td className="p-3 text-slate-500">{order.account_name || "Hệ thống"}</td>
                        <td className="p-3">
                          <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-black ${status.bg}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => handleViewOrder(order)}
                              className="text-emerald-700 hover:text-emerald-800 font-bold text-xs"
                            >
                              Xem
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(`Bạn có chắc chắn muốn xóa hoàn toàn hóa đơn #${order.id} không? Thao tác này không thể hoàn tác.`)) {
                                  try {
                                    await API.delete(`/api/orders/${order.id}`);
                                    alert("Xóa hóa đơn thành công!");
                                    fetchOrders();
                                  } catch (err) {
                                    alert("Lỗi khi xóa hóa đơn: " + (err.response?.data?.message || err.message));
                                  }
                                }
                              }}
                              className="text-rose-600 hover:text-rose-700 font-bold text-xs"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Chi tiết đơn hàng</span>
                <h3 className="text-base font-black text-slate-900">
                  Đơn hàng #{selectedOrder.id} - Bàn {selectedOrder.table_name || "Mang về"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setOrderDetail(null);
                }}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Meta Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">Thời gian tạo</span>
                  <span className="text-slate-800 font-bold">{formatDate(selectedOrder.created_at)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">Phương thức thanh toán</span>
                  <span className="text-slate-800 font-bold">{PAYMENT_METHODS[selectedOrder.payment_method] || "Chưa thanh toán"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">Nhân viên phục vụ</span>
                  <span className="text-slate-800 font-bold">{selectedOrder.account_name || "Hệ thống"}</span>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">Danh sách món ăn đã gọi</h4>
                {loadingDetail ? (
                  <p className="text-slate-400 text-xs font-semibold py-8 text-center">Đang tải danh sách món ăn...</p>
                ) : !orderDetail || !orderDetail.items || orderDetail.items.filter(item => item.status !== "huy").length === 0 ? (
                  <p className="text-slate-400 text-xs font-semibold py-8 text-center">Không có món ăn nào trong đơn hàng này</p>
                ) : (
                  <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <table className="w-full border-collapse text-left text-xs font-semibold">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400">
                          <th className="p-2">Tên món</th>
                          <th className="p-2 text-center">Số lượng</th>
                          <th className="p-2 text-right">Đơn giá</th>
                          <th className="p-2 text-right">Thành tiền</th>
                          <th className="p-2">Trạng thái bếp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                        {orderDetail.items.filter(item => item.status !== "huy").map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="p-2">
                              <span className="font-bold text-slate-900 block">{item.mon_ten}</span>
                              {item.note && <span className="text-[10px] font-medium text-amber-600 block">Ghi chú: {item.note}</span>}
                            </td>
                            <td className="p-2 text-center font-bold text-slate-900">{item.quantity}</td>
                            <td className="p-2 text-right text-slate-500">{formatMoney(item.price)}</td>
                            <td className="p-2 text-right font-bold text-slate-900">{formatMoney(item.price * item.quantity)}</td>
                            <td className="p-2">
                              <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold ${
                                item.status === "hoan_thanh" ? "bg-emerald-50 text-emerald-700" :
                                item.status === "dang_nau" ? "bg-blue-50 text-blue-700" :
                                item.status === "huy" ? "bg-rose-50 text-rose-700" :
                                "bg-amber-50 text-amber-700"
                              }`}>
                                {item.status === "hoan_thanh" ? "Đã ra món" :
                                 item.status === "dang_nau" ? "Đang làm" :
                                 item.status === "huy" ? "Đã hủy" : "Đang chờ bếp"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              {selectedOrder.status === "cho_thanh_toan" && (
                <div className="rounded-xl border border-orange-100 bg-orange-50/20 p-4 space-y-3 mt-4">
                  <span className="text-xs font-black text-orange-800 uppercase tracking-wider block">
                    Xử lý thanh toán hóa đơn
                  </span>
                  <div className="rounded-xl border border-slate-100 bg-white p-3">
                    <div className="flex items-center gap-2">
                      <User size={16} weight="duotone" className="text-slate-400" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Khách hàng tích điểm
                      </span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="tel"
                        value={checkoutCustomerPhone}
                        onChange={(event) => {
                          setCheckoutCustomerPhone(event.target.value);
                          setCheckoutCustomer(null);
                          setCheckoutCustomerMessage("");
                          setCheckoutCustomerWasCreated(false);
                        }}
                        onBlur={() => {
                          if (checkoutCustomerPhone.trim()) lookupCheckoutCustomer().catch(() => {});
                        }}
                        placeholder="Nhập số điện thoại"
                        className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                      <button
                        type="button"
                        onClick={() => lookupCheckoutCustomer().catch((err) => alert(err.response?.data?.message || "Không tìm được khách hàng."))}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600 hover:bg-slate-100"
                      >
                        Kiểm tra
                      </button>
                    </div>
                    {(checkoutCustomerMessage || checkoutCustomer) && (
                      <p className="mt-2 text-[11px] font-bold text-emerald-700">
                        {checkoutCustomerMessage}
                        {checkoutCustomer?.points != null ? ` Hiện có ${checkoutCustomer.points} điểm.` : ""}
                      </p>
                    )}
                  </div>
                  <div className={`grid gap-2 ${
                    activePaymentMethods.length === 1 ? "grid-cols-1" :
                    activePaymentMethods.length === 2 ? "grid-cols-2" : "grid-cols-3"
                  }`}>
                    {Object.entries(PAYMENT_METHODS)
                      .filter(([key]) => activePaymentMethods.includes(key))
                      .map(([key, label]) => {
                        const Icon = key === "tien_mat" ? Money : key === "chuyen_khoan" ? CreditCard : QrCode;
                        return (
                          <button
                            key={key}
                            onClick={() => setCheckoutMethod(key)}
                            type="button"
                            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all ${
                              checkoutMethod === key
                                ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <Icon size={16} weight="duotone" className={checkoutMethod === key ? "text-emerald-700" : "text-slate-400"} />
                            <span className="text-[10px] font-bold mt-1 leading-none">{label}</span>
                          </button>
                        );
                      })}
                  </div>

                  {checkoutMethod === "qr" && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                      <div className="w-[140px] h-[140px] border border-slate-100 rounded-lg overflow-hidden flex items-center justify-center bg-slate-50">
                        <img
                          src={`https://img.vietqr.io/image/${activeBank.bankId}-${activeBank.accountNo}-compact2.png?amount=${selectedOrder.total_amount}&addInfo=NHWOW%20${selectedOrder.id}&accountName=${encodeURIComponent(activeBank.accountName)}`}
                          alt="VietQR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 space-y-1 text-xs font-semibold text-slate-600">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Thông tin chuyển khoản</p>
                        <p><span className="font-bold text-slate-800">Ngân hàng:</span> {activeBank.bankId}</p>
                        <p><span className="font-bold text-slate-800">Số tài khoản:</span> {activeBank.accountNo}</p>
                        <p><span className="font-bold text-slate-800">Chủ tài khoản:</span> {activeBank.accountName}</p>
                        <p><span className="font-bold text-slate-800">Số tiền:</span> <span className="font-bold text-emerald-700">{formatMoney(selectedOrder.total_amount)}</span></p>
                        <p><span className="font-bold text-slate-800">Nội dung:</span> <span className="font-mono bg-slate-50 px-1.5 py-0.5 border border-slate-200/50 rounded font-bold text-slate-800">NHWOW {selectedOrder.id}</span></p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={async () => {
                        try {
                          const checkoutCustomerResult = await getCheckoutCustomer();
                          const checkoutCustomer = checkoutCustomerResult?.customer || null;
                          await API.post(`/api/payment/${selectedOrder.id}/checkout`, {
                            payment_method: checkoutMethod,
                            customer_id: checkoutCustomer?.id || null,
                          });
                          alert(
                            checkoutCustomer
                                ? "Thanh toán thành công. Điểm tích lũy đã được cộng cho khách hàng!"
                                : "Thanh toán hóa đơn thành công!"
                          );
                          setSelectedOrder(null);
                          setOrderDetail(null);
                          setCheckoutCustomerPhone("");
                          setCheckoutCustomer(null);
                          setCheckoutCustomerMessage("");
                          fetchOrders();
                        } catch (err) {
                          alert("Lỗi thanh toán: " + (err.response?.data?.message || err.message));
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-md shadow-emerald-700/10"
                    >
                      Xác nhận thanh toán
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Receipt size={16} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-500">Tổng thanh toán:</span>
                <span className="text-base font-black text-emerald-700">{formatMoney(selectedOrder.total_amount || 0)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (window.confirm("Bạn có chắc chắn muốn xóa hoàn toàn hóa đơn này không? Thao tác này không thể hoàn tác.")) {
                      try {
                        await API.delete(`/api/orders/${selectedOrder.id}`);
                        alert("Xóa hóa đơn thành công!");
                        setSelectedOrder(null);
                        setOrderDetail(null);
                        fetchOrders();
                      } catch (err) {
                        alert("Lỗi khi xóa hóa đơn: " + (err.response?.data?.message || err.message));
                      }
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/10"
                >
                  Xóa hóa đơn
                </button>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setOrderDetail(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-md shadow-emerald-700/10"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

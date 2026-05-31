import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingCart,
  ForkKnife,
  CheckCircle,
  WarningCircle,
  Plus,
  Minus,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import API from "../../services/api";

const STATUS_CONFIG = {
  trong: { label: "Bàn trống", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  dang_dung: { label: "Có khách", color: "bg-blue-100 text-blue-700 border-blue-200" },
  da_dat: { label: "Đã đặt", color: "bg-orange-100 text-orange-700 border-orange-200" },
};

const CATEGORY_TONES = [
  "bg-blue-100 text-blue-600",
  "bg-purple-100 text-purple-600",
  "bg-yellow-100 text-yellow-700",
  "bg-pink-100 text-pink-600",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
];

const renderStatusBadges = (item) => {
  const badges = [];
  
  // 1. Ô hiển thị số lượng đã gửi bếp kèm trạng thái màu sắc (nhóm theo trạng thái)
  if (item.serverParts && item.serverParts.length > 0) {
    const statusConfigs = {
      cho: { label: "chờ bếp", style: "bg-amber-100 text-amber-800 border-amber-200" },
      dang_nau: { label: "đang làm", style: "bg-blue-100 text-blue-800 border-blue-200" },
      hoan_thanh: { label: "đã ra món", style: "bg-emerald-100 text-emerald-800 border-emerald-200" },
      huy: { label: "đã hủy", style: "bg-rose-100 text-rose-800 border-rose-200" },
    };
    
    // Nhóm serverParts theo trạng thái để cộng dồn số lượng
    const groupedParts = {};
    item.serverParts.forEach(part => {
      groupedParts[part.status] = (groupedParts[part.status] || 0) + Number(part.quantity);
    });
    
    Object.entries(groupedParts).forEach(([status, quantity]) => {
      const config = statusConfigs[status] || { label: "đang chờ", style: "bg-slate-100 text-slate-800 border-slate-200" };
      badges.push(
        <span key={status} className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-black shadow-sm ${config.style}`}>
          {quantity} {config.label}
        </span>
      );
    });
  }
  
  // 2. Ô hiển thị phần số lượng chưa gửi
  const totalSent = item.serverParts ? item.serverParts.reduce((sum, p) => sum + p.quantity, 0) : 0;
  const unsentQty = item.quantity - totalSent;
  if (unsentQty > 0) {
    badges.push(
      <span key="unsent" className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700 shadow-sm">
        {unsentQty} chưa gửi
      </span>
    );
  }
  
  return badges;
};

export default function TableOrder() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const isQRMode = new URLSearchParams(window.location.search).get("mode") === "qr" || new URLSearchParams(window.location.search).get("qr") === "true";

  const [table, setTable] = useState(null);
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [orderId, setOrderId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [cartPanelWidth, setCartPanelWidth] = useState(480);
  const [serverItemsList, setServerItemsList] = useState([]);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    fetchData();
  }, [tableId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchData = async () => {
    try {
      const [tableRes, menuRes, categoriesRes, activeOrdersRes] = await Promise.all([
        API.get(`/api/tables/${tableId}`),
        API.get("/api/menu"),
        API.get("/api/menu/categories"),
        API.get("/api/orders/active"),
      ]);

      const tableData = tableRes.data;
      setTable(tableData);
      setMenu(menuRes.data.filter((m) => m.is_visible));
      setCategories(categoriesRes.data || []);

      // 1. Lấy giỏ hàng nháp từ localStorage nếu có
      const savedCartStr = localStorage.getItem(`cart_table_${tableId}`);
      let localCart = savedCartStr ? JSON.parse(savedCartStr) : [];

      // Dọn dẹp và gộp giỏ hàng local cũ để tránh trùng lặp
      const groupedLocalCart = [];
      localCart.forEach((lItem) => {
        const existing = groupedLocalCart.find(c => Number(c.id) === Number(lItem.id));
        if (existing) {
          existing.quantity += Number(lItem.quantity);
        } else {
          groupedLocalCart.push({
            ...lItem,
            id: Number(lItem.id),
            serverParts: lItem.serverParts || []
          });
        }
      });
      localCart = groupedLocalCart;

      // 2. Tìm order đang hoạt động của bàn này
      const activeOrder = activeOrdersRes.data.find(
        (o) => o.table_id === Number(tableId)
      );

      if (activeOrder) {
        setOrderId(activeOrder.id);
        // Lấy chi tiết món ăn của order từ server
        const orderDetailRes = await API.get(`/api/orders/${activeOrder.id}`);
        const serverItems = orderDetailRes.data.items || [];
        setServerItemsList(serverItems);

        // Group server items by menu_item_id
        const groupedCart = [];
        serverItems.forEach((sItem) => {
          const existing = groupedCart.find(c => Number(c.id) === Number(sItem.menu_item_id));
          if (existing) {
            existing.quantity += Number(sItem.quantity);
            existing.serverParts.push({
              orderItemId: sItem.id,
              quantity: Number(sItem.quantity),
              status: sItem.status
            });
          } else {
            groupedCart.push({
              id: Number(sItem.menu_item_id),
              name: sItem.mon_ten,
              price: Number(sItem.price),
              quantity: Number(sItem.quantity),
              serverParts: [{
                orderItemId: sItem.id,
                quantity: Number(sItem.quantity),
                status: sItem.status
              }],
              note: sItem.note || "",
              sendToKitchen: true
            });
          }
        });

        // Gộp giỏ hàng local và giỏ hàng server sử dụng kiểu so sánh số Number()
        localCart.forEach((localItem) => {
          const existing = groupedCart.find((g) => Number(g.id) === Number(localItem.id));
          if (!existing) {
            const hasSentPart = localItem.serverParts && localItem.serverParts.length > 0;
            if (!hasSentPart) {
              groupedCart.push({
                ...localItem,
                serverParts: []
              });
            }
          } else {
            if (localItem.quantity > existing.quantity) {
              existing.quantity = localItem.quantity;
            }
          }
        });

        setCart(groupedCart);
      } else {
        setServerItemsList([]);
        setOrderId(null);
        setCart(localCart.filter(item => !item.serverParts || item.serverParts.length === 0).map(item => ({
          ...item,
          serverParts: []
        })));
      }
    } catch (err) {
      setError("Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  // Tự động lưu giỏ hàng nháp vào localStorage khi thay đổi
  useEffect(() => {
    if (loading) return;
    if (tableId && cart.length > 0) {
      localStorage.setItem(`cart_table_${tableId}`, JSON.stringify(cart));
    } else if (tableId && cart.length === 0) {
      localStorage.removeItem(`cart_table_${tableId}`);
    }
  }, [cart, tableId, loading]);

  const syncServerDeletions = async (currentOrderId) => {
    // 1. Xóa các món không còn xuất hiện trong giỏ hàng
    for (const serverItem of serverItemsList) {
      const cartItem = cart.find(c => c.id === serverItem.menu_item_id);
      if (!cartItem) {
        await API.delete(`/api/orders/${currentOrderId}/items/${serverItem.id}`);
      }
    }
    
    // 2. Xử lý giảm số lượng đối với các món được giữ lại
    for (const cartItem of cart) {
      const totalSent = cartItem.serverParts ? cartItem.serverParts.reduce((sum, p) => sum + p.quantity, 0) : 0;
      if (cartItem.quantity < totalSent) {
        let remainingToKeep = cartItem.quantity;
        // Phân bổ số lượng còn lại vào các serverParts, xóa bớt những phần không cần thiết
        for (const part of cartItem.serverParts) {
          if (remainingToKeep <= 0) {
            await API.delete(`/api/orders/${currentOrderId}/items/${part.orderItemId}`);
          } else if (remainingToKeep < part.quantity) {
            await API.delete(`/api/orders/${currentOrderId}/items/${part.orderItemId}`);
            await API.post(`/api/orders/${currentOrderId}/items`, {
              menu_item_id: cartItem.id,
              quantity: remainingToKeep,
              note: cartItem.note || "",
              status: part.status || "hoan_thanh"
            });
            remainingToKeep = 0;
          } else {
            remainingToKeep -= part.quantity;
          }
        }
      }
    }
  };

  const allCategories = useMemo(() => [
    { id: null, label: "Tất cả" },
    ...categories.map((c) => ({ id: c.id, label: c.name })),
  ], [categories]);

  const filteredMenu = useMemo(() => {
    let result = activeCategory === null
      ? menu
      : menu.filter((m) => m.category_id === activeCategory);

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(term));
    }
    return result;
  }, [activeCategory, menu, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredMenu.length / ITEMS_PER_PAGE));
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
  const paginatedMenu = filteredMenu.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: Number(c.quantity) + 1 } : c
        );
      }
      return [...prev, { ...item, quantity: 1, note: "", sendToKitchen: true, serverParts: [] }];
    });
  };

  const toggleSendToKitchen = (id) => {
    setCart((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, sendToKitchen: c.sendToKitchen !== false ? false : true } : c
      )
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (Number(existing.quantity) <= 1) return prev.filter((c) => c.id !== id);
      return prev.map((c) => c.id === id ? { ...c, quantity: Math.max(0, Number(c.quantity) - 1) } : c);
    });
  };

  const updateQuantity = (id, val) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          if (val === "") return { ...c, quantity: "" };
          const parsed = parseFloat(val);
          return { ...c, quantity: isNaN(parsed) ? 0 : parsed };
        }
        return c;
      })
    );
  };

  const handleQuantityBlur = (id, quantity) => {
    if (quantity === "" || Number(quantity) <= 0) {
      setCart((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const updatePrice = (id, val) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          if (val === "") return { ...c, price: "" };
          const parsed = parseFloat(val);
          return { ...c, price: isNaN(parsed) ? 0 : parsed };
        }
        return c;
      })
    );
  };

  const handlePriceBlur = (id, price) => {
    if (price === "" || Number(price) < 0) {
      setCart((prev) =>
        prev.map((c) => (c.id === id ? { ...c, price: 0 } : c))
      );
    }
  };

  const getCartQty = (id) => {
    const item = cart.find((c) => c.id === id);
    return item ? Number(item.quantity) : 0;
  };

  const totalAmount = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const getCategoryTone = (id) =>
    CATEGORY_TONES[Math.abs(Number(id) || 0) % CATEGORY_TONES.length];

  const handleConfirmOrder = async () => {
    if (cart.length === 0) return;
    if (table?.status !== "dang_dung") {
      alert("Bàn phải ở trạng thái có khách trước khi order.");
      navigate("/staff/tables");
      return;
    }
    
    // Kiểm tra xem có món nào mới hoặc tăng thêm số lượng cần gửi không
    const itemsToPost = [];
    cart.forEach(item => {
      const totalSent = item.serverParts ? item.serverParts.reduce((sum, p) => sum + p.quantity, 0) : 0;
      if (item.quantity > totalSent) {
        itemsToPost.push({
          ...item,
          newQty: item.quantity - totalSent
        });
      }
    });

    const hasDeletionsOrReductions = serverItemsList.some(serverItem => {
      const cartItem = cart.find(c => c.id === serverItem.menu_item_id);
      if (!cartItem) return true;
      const totalSent = cartItem.serverParts ? cartItem.serverParts.reduce((sum, p) => sum + p.quantity, 0) : 0;
      return cartItem.quantity < totalSent;
    });

    if (itemsToPost.length === 0 && !hasDeletionsOrReductions) {
      alert("Không có thay đổi nào để gửi bếp!");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      let currentOrderId = orderId;
      if (!currentOrderId) {
        const orderRes = await API.post("/api/orders", { table_id: Number(tableId) });
        currentOrderId = orderRes.data.order_id;
        setOrderId(currentOrderId);
      }

      // Thực hiện đồng bộ các món bị xóa hoặc giảm số lượng
      if (hasDeletionsOrReductions) {
        await syncServerDeletions(currentOrderId);
      }

      // Thêm từng món mới/số lượng tăng thêm vào order
      for (const item of itemsToPost) {
        await API.post(`/api/orders/${currentOrderId}/items`, {
          menu_item_id: item.id,
          quantity: item.newQty,
          note: item.note || "",
          status: item.sendToKitchen !== false ? 'cho' : 'hoan_thanh'
        });
      }

      // Chỉ kích hoạt thông báo cho bếp nếu có ít nhất một món mới chọn gửi bếp
      const hasKitchenItems = itemsToPost.some(item => item.sendToKitchen !== false);
      if (hasKitchenItems) {
        await API.post(`/api/orders/${currentOrderId}/send`);
      }

      // Tải lại toàn bộ dữ liệu mới nhất từ server để đồng bộ chuẩn xác
      await fetchData();

      setSuccess("Đã gửi đơn hàng thành công! Bạn có thể tiếp tục chỉnh sửa hoặc thêm món.");
      alert("Đã gửi đơn hàng thành công! Bạn có thể tiếp tục chỉnh sửa hoặc thêm món.");
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi gửi order!");
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const formatMoney = (amount) =>
    new Intl.NumberFormat("vi-VN").format(amount) + "đ";

  if (loading) {
    return (
      <div className="admin-soft-grid flex min-h-screen items-center justify-center bg-[#eff1ea]">
        <p className="text-sm font-semibold text-slate-400">Đang tải...</p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[table?.status] || STATUS_CONFIG.trong;

  return (
    <div className="admin-page flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#fbfbf8]/95 px-5 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {!isQRMode && (
              <button
                onClick={() => navigate("/staff/tables")}
                className="admin-secondary-btn h-9 w-9 p-0"
              >
                <ArrowLeft size={16} weight="bold" />
              </button>
            )}
            <div>
              <p className="admin-kicker">Đặt món</p>
              <h1 className="text-[18px] font-black leading-tight text-slate-950">
                {table?.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Thông báo */}
            {success && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                <CheckCircle size={14} weight="fill" />
                {success}
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                <WarningCircle size={14} weight="duotone" />
                {error}
              </div>
            )}

            {/* Trạng thái bàn */}
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto flex w-full max-w-[1480px] flex-1 gap-2 overflow-hidden p-4">

        {/* Giỏ hàng */}
        <div 
          className="flex shrink-0 flex-col overflow-hidden rounded-[14px] border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.045)]"
          style={{ width: `${cartPanelWidth}px` }}
        >

          {/* Cart Header */}
          <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} weight="duotone" className="text-emerald-700" />
                <p className="text-sm font-black text-slate-900">Giỏ hàng</p>
              </div>
              <span className="rounded-full bg-emerald-700 px-2.5 py-0.5 text-[11px] font-black text-white">
                {totalItems} món
              </span>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto p-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <ForkKnife size={32} className="mb-2 text-slate-300" weight="duotone" />
                <p className="text-xs font-semibold">Bổ sung món ngon vào giỏ</p>
              </div>
            ) : (
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px] bg-slate-50/50">
                    <th className="p-1 text-center w-6"></th>
                    <th className="p-1.5 text-left">Tên món</th>
                    <th className="p-1.5 text-center w-12">ĐVT</th>
                    <th className="p-1.5 text-center w-28">SL</th>
                    <th className="p-1.5 text-right w-20">Đ giá</th>
                    <th className="p-1.5 text-right w-20">T tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors">
                      <td className="p-1 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={item.sendToKitchen !== false}
                          onChange={() => toggleSendToKitchen(item.id)}
                          className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                          title="Gửi xuống bếp khi xác nhận"
                        />
                      </td>
                      <td className="p-1.5 text-left font-medium text-slate-800 align-middle">
                        <div className="space-y-0.5">
                          <p className="font-semibold leading-tight">{item.name}</p>
                          {renderStatusBadges(item)}
                        </div>
                      </td>
                      <td className="p-1.5 text-center text-slate-500 capitalize align-middle">{item.unit || "phần"}</td>
                      <td className="p-1.5 text-center align-middle">
                        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="flex h-5 w-5 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100"
                          >
                            <Minus size={9} weight="bold" />
                          </button>
                          <input
                            type="number"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, e.target.value)}
                            onBlur={(e) => handleQuantityBlur(item.id, e.target.value)}
                            className="w-8 text-center text-xs font-black text-slate-800 bg-transparent focus:outline-none border-b border-dashed border-slate-300 focus:border-slate-500 py-0"
                            title="Chỉnh số lượng (chấp nhận số thập phân)"
                          />
                          <button
                            type="button"
                            onClick={() => addToCart(item)}
                            className="flex h-5 w-5 items-center justify-center rounded text-emerald-700 transition-colors hover:bg-emerald-50"
                          >
                            <Plus size={9} weight="bold" />
                          </button>
                        </div>
                      </td>
                      <td className="p-1.5 text-right align-middle">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <input
                            type="number"
                            step="any"
                            value={item.price}
                            onChange={(e) => updatePrice(item.id, e.target.value)}
                            onBlur={(e) => handlePriceBlur(item.id, e.target.value)}
                            className="w-14 text-[11px] text-green-600 font-black border-b border-dashed border-green-300 focus:border-green-500 focus:outline-none bg-transparent py-0 px-0.5 text-right"
                            title="Chỉnh đơn giá món (chỉ ở bàn này)"
                          />
                          <span className="text-[10px] text-green-600 font-bold">đ</span>
                        </div>
                      </td>
                      <td className="p-1.5 text-right font-black text-slate-800 align-middle">
                        {formatMoney(Number(item.price || 0) * Number(item.quantity || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Cart Footer */}
          <div className="border-t border-slate-100 p-3 space-y-3">
            {/* Tổng */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Tổng tiền</p>
              <p className="text-base font-black text-emerald-700">{formatMoney(totalAmount)}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={cart.length === 0 || submitting}
                className="admin-primary-btn w-full h-10 text-xs font-bold"
                title="Order"
              >
                {submitting ? "Đang gửi..." : "Order"}
              </button>
            </div>
          </div>
        </div>

        {/* Excel-style thin resizable divider */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = cartPanelWidth;
            const handleMouseMove = (moveEvent) => {
              const deltaX = moveEvent.clientX - startX;
              const newWidth = Math.max(380, Math.min(640, startWidth + deltaX));
              setCartPanelWidth(newWidth);
            };
            const handleMouseUp = () => {
              document.removeEventListener("mousemove", handleMouseMove);
              document.removeEventListener("mouseup", handleMouseUp);
            };
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
          }}
          className="w-1 bg-slate-200 hover:bg-emerald-600 active:bg-emerald-700 cursor-col-resize self-stretch transition-all duration-150 mx-1 rounded"
          title="Kéo để chỉnh kích cỡ"
        />

        {/* Menu */}
        <div className="flex-1 overflow-hidden flex flex-col justify-between p-5 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex-1 overflow-auto">
            {/* Category Filter & Search Bar */}
            <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
              <div className="flex gap-2 flex-wrap">
                {allCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                      activeCategory === cat.id
                        ? "bg-emerald-700 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              
              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm món ăn..."
                  className="w-full h-8.5 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {paginatedMenu.map((item) => {
                const qty = getCartQty(item.id);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 p-1.5 hover:shadow-sm transition-all"
                  >
                    {/* Ảnh siêu nhỏ */}
                    <div className="h-10 w-10 shrink-0 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-slate-300">Mon</span>
                      )}
                    </div>

                    {/* Thông tin chữ */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-slate-800 leading-none" title={item.name}>
                        {item.name}
                      </p>
                      <p className="text-[10px] font-bold text-blue-600 mt-1">
                        {formatMoney(item.price)}
                      </p>
                    </div>

                    {/* Nút bấm siêu nhỏ bên phải */}
                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(item)}
                        className="h-6 w-6 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs transition-colors shrink-0"
                      >
                        +
                      </button>
                    ) : (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="h-5 w-5 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center font-bold text-[10px] text-slate-600"
                        >
                          -
                        </button>
                        <span className="w-3.5 text-center text-[10px] font-black text-slate-800">{qty}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="h-5 w-5 bg-emerald-600 hover:bg-emerald-700 rounded flex items-center justify-center font-bold text-[10px] text-white"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t border-gray-100 bg-white rounded-xl p-2 shadow-sm">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={activePage === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold transition-colors"
              >
                ← Trước
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg border text-xs font-bold transition-colors ${
                    activePage === page
                      ? "bg-emerald-700 border-emerald-700 text-white"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={activePage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold transition-colors"
              >
                Sau →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

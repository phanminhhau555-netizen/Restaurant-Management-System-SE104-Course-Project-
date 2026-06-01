import { useCallback, useEffect, useMemo, useState } from "react";
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

const PAGE_SIZE_OPTIONS = [10, 20, 30];

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
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [qrCartOpen, setQrCartOpen] = useState(false);
  const [serverItemsList, setServerItemsList] = useState([]);

  const fetchData = useCallback(async () => {
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
    } catch {
      setError("Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

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

  const getMenuAvailability = (id) => {
    const menuItem = menu.find((entry) => Number(entry.id) === Number(id));
    const value = menuItem?.max_order_quantity;
    return value === null || value === undefined ? null : Math.max(0, Number(value) || 0);
  };

  const getMenuItem = (id) => menu.find((entry) => Number(entry.id) === Number(id));

  const getSentQuantity = (item) =>
    item.serverParts ? item.serverParts.reduce((sum, part) => sum + Number(part.quantity || 0), 0) : 0;

  const getUnsentQuantity = (item) => Math.max(0, Number(item?.quantity || 0) - getSentQuantity(item));

  const getIngredientRequirement = (menuItemId, ingredientId) => {
    const menuItem = getMenuItem(menuItemId);
    const ingredient = menuItem?.ingredient_availability?.find(
      (entry) => Number(entry.ingredient_id) === Number(ingredientId)
    );
    return Number(ingredient?.required_per_item || 0);
  };

  const getLocalUnsentUsage = (ingredientId, excludedItemId, cartItems = cart) =>
    cartItems.reduce((sum, cartItem) => {
      if (Number(cartItem.id) === Number(excludedItemId)) return sum;
      const required = getIngredientRequirement(cartItem.id, ingredientId);
      return sum + required * getUnsentQuantity(cartItem);
    }, 0);

  const getMaxCartQuantity = (item, cartItems = cart) => {
    const menuItem = getMenuItem(item.id);
    const ingredientAvailability = menuItem?.ingredient_availability || [];
    const sentQuantity = getSentQuantity(item);

    if (ingredientAvailability.length === 0) {
      const maxAdditional = getMenuAvailability(item.id);
      return maxAdditional === null ? null : sentQuantity + maxAdditional;
    }

    const ingredientLimits = ingredientAvailability
      .map((ingredient) => {
        const required = Number(ingredient.required_per_item || 0);
        if (required <= 0) return null;
        const remaining = Number(ingredient.remaining_quantity || 0);
        const usedByOtherLocalItems = getLocalUnsentUsage(ingredient.ingredient_id, item.id, cartItems);
        return sentQuantity + Math.max(0, Math.floor((remaining - usedByOtherLocalItems) / required));
      })
      .filter((value) => value !== null);

    if (ingredientLimits.length === 0) return null;
    return Math.min(...ingredientLimits);
  };

  const canAddMore = (id) => {
    const existing = cart.find((entry) => Number(entry.id) === Number(id));
    const item = existing || { id, quantity: 0, serverParts: [] };
    const maxQuantity = getMaxCartQuantity(item);
    if (maxQuantity === null) return true;
    return Number(item.quantity || 0) < maxQuantity;
  };

  useEffect(() => {
    if (loading || menu.length === 0 || cart.length === 0) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart((prev) => {
      let changed = false;
      const nextCart = prev
        .map((item) => {
          const maxQuantity = getMaxCartQuantity(item, prev);
          if (maxQuantity !== null && Number(item.quantity || 0) > maxQuantity) {
            changed = true;
            return { ...item, quantity: maxQuantity };
          }
          return item;
        })
        .filter((item) => Number(item.quantity || 0) > 0);

      if (changed) {
        setError("Một số món đã được tự giảm về số lượng còn đủ nguyên liệu trong kho.");
      }

      return changed ? nextCart : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, menu, cart.length]);

  const totalPages = Math.max(1, Math.ceil(filteredMenu.length / itemsPerPage));
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedMenu = filteredMenu.slice(startIndex, startIndex + itemsPerPage);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      const currentItem = existing || { ...item, quantity: 0, serverParts: [] };
      const maxQuantity = getMaxCartQuantity(currentItem, prev);
      const currentQuantity = Number(currentItem.quantity || 0);

      if (maxQuantity !== null && currentQuantity >= maxQuantity) {
        setError(`Kho chỉ còn đủ để order tối đa ${maxQuantity} ${item.unit || "phần"} ${item.name}.`);
        return prev;
      }

      setError("");
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: Math.min(Number(c.quantity) + 1, maxQuantity ?? Number(c.quantity) + 1) } : c
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
          if (isNaN(parsed)) return { ...c, quantity: 0 };

          const maxQuantity = getMaxCartQuantity(c, prev);
          if (maxQuantity !== null && parsed > maxQuantity) {
            setError(`Kho chỉ còn đủ để order tối đa ${maxQuantity} ${c.unit || "phần"} ${c.name}.`);
            return { ...c, quantity: maxQuantity };
          }

          setError("");
          return { ...c, quantity: parsed };
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
    if (val !== "" && parseFloat(val) < 0) {
    return; 
  }
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

  const handleConfirmOrder = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn gửi những món ăn này xuống bếp chế biến không?")) {
  return;
}
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
      const adjustedMessages = [];
      for (const item of itemsToPost) {
        const itemRes = await API.post(`/api/orders/${currentOrderId}/items`, {
          menu_item_id: item.id,
          quantity: item.newQty,
          note: item.note || "",
          status: item.sendToKitchen !== false ? 'cho' : 'hoan_thanh'
        });
        if (itemRes.data?.inventory_adjusted) {
          adjustedMessages.push(`${item.name}: chỉ thêm được ${itemRes.data.added_quantity}`);
        }
      }

      // Chỉ kích hoạt thông báo cho bếp nếu có ít nhất một món mới chọn gửi bếp
      const hasKitchenItems = itemsToPost.some(item => item.sendToKitchen !== false);
      if (hasKitchenItems) {
        await API.post(`/api/orders/${currentOrderId}/send`);
      }

      // Tải lại toàn bộ dữ liệu mới nhất từ server để đồng bộ chuẩn xác
      await fetchData();

      const successMessage = adjustedMessages.length > 0
        ? `Đã gửi đơn hàng. Một số món được giới hạn theo tồn kho: ${adjustedMessages.join(", ")}.`
        : "Đã gửi đơn hàng thành công! Bạn có thể tiếp tục chỉnh sửa hoặc thêm món.";
      setSuccess(successMessage);
      alert(successMessage);
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
      <div className="admin-soft-grid flex min-h-screen items-center justify-center bg-[#eff1ea] p-4">
        <div className="admin-panel-pad w-full max-w-sm space-y-3 text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-emerald-100" />
          <p className="text-sm font-black text-slate-700">Đang tải bàn và thực đơn</p>
          <p className="text-xs font-semibold text-slate-400">Dữ liệu order sẽ sẵn sàng trong giây lát.</p>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[table?.status] || STATUS_CONFIG.trong;

  if (isQRMode) {
    return (
      <div className="min-h-[100dvh] bg-[#eff1ea] pb-28 text-slate-900">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#fbfbf8]/95 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="admin-kicker">Order món</p>
              <h1 className="truncate text-lg font-black leading-tight text-slate-950">
                {table?.name || "Bàn"}
              </h1>
            </div>
            <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
          {(success || error) && (
            <div className="mt-3">
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
            </div>
          )}
        </header>

        <main className="space-y-3 px-3 py-3">
          <section className="rounded-[14px] border border-slate-200/80 bg-white p-3 shadow-[0_12px_32px_rgba(15,23,42,0.045)]">
            <div className="relative">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm món ăn..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {allCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setCurrentPage(1);
                  }}
                  className={`min-h-10 shrink-0 rounded-xl border px-3 text-xs font-black transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    activeCategory === cat.id
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <span className="text-[11px] font-bold text-slate-400">
                {filteredMenu.length} món phù hợp
              </span>
              <label className="flex items-center gap-2 text-[11px] font-black text-slate-500">
                Hiển thị
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-black text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  aria-label="Số món hiển thị mỗi trang"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {paginatedMenu.length === 0 ? (
            <section className="flex min-h-64 flex-col items-center justify-center rounded-[14px] border border-dashed border-slate-200 bg-white/70 px-4 text-center">
              <MagnifyingGlass size={32} weight="duotone" className="mb-2 text-slate-300" />
              <p className="text-sm font-black text-slate-600">Không tìm thấy món phù hợp</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">Thử đổi danh mục hoặc nhập từ khóa khác.</p>
            </section>
          ) : (
            <section className="space-y-2">
              {paginatedMenu.map((item) => {
                const qty = getCartQty(item.id);
                return (
                  <article
                    key={item.id}
                    className={`flex gap-3 rounded-[14px] border bg-white p-2.5 shadow-[0_8px_22px_rgba(15,23,42,0.035)] ${
                      qty > 0 ? "border-emerald-200 ring-1 ring-emerald-100" : "border-slate-200/80"
                    }`}
                  >
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ForkKnife size={24} weight="duotone" className="text-slate-300" />
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="min-w-0">
                        <h2 className="line-clamp-2 text-sm font-black leading-snug text-slate-900">
                          {item.name}
                        </h2>
                        <p className="mt-1 text-sm font-black text-emerald-700">
                          {formatMoney(item.price)}
                        </p>
                        {item.max_order_quantity !== null && item.max_order_quantity !== undefined ? (
                          <p className={`mt-0.5 text-[11px] font-black ${Number(item.max_order_quantity) > 0 ? "text-slate-400" : "text-red-500"}`}>
                            Còn {Number(item.max_order_quantity) || 0}
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-auto flex items-center justify-end pt-2">
                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => addToCart(item)}
                            disabled={!canAddMore(item.id)}
                            className="min-h-10 rounded-xl bg-emerald-700 px-4 text-xs font-black text-white transition-colors hover:bg-emerald-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                            aria-label={`Thêm ${item.name}`}
                          >
                            Thêm
                          </button>
                        ) : (
                          <div className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-1">
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm active:scale-[0.98]"
                              aria-label={`Giảm ${item.name}`}
                            >
                              <Minus size={14} weight="bold" />
                            </button>
                            <span className="min-w-5 text-center text-sm font-black text-emerald-800">{qty}</span>
                            <button
                              type="button"
                              onClick={() => addToCart(item)}
                              disabled={!canAddMore(item.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                              aria-label={`Tăng ${item.name}`}
                            >
                              <Plus size={14} weight="bold" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-[14px] border border-slate-200/80 bg-white p-2 shadow-[0_8px_22px_rgba(15,23,42,0.035)]">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={activePage === 1}
                className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trước
              </button>
              <span className="text-xs font-black text-slate-500">
                Trang {activePage}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={activePage === totalPages}
                className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          )}
        </main>

        {qrCartOpen && (
          <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 px-2 pb-2 pt-16">
            <section className="mx-auto flex max-h-[82dvh] w-full max-w-md flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.24)]">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="admin-kicker">Giỏ hàng</p>
                  <h2 className="truncate text-base font-black text-slate-950">
                    {totalItems} món, {formatMoney(totalAmount)}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setQrCartOpen(false)}
                  className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600 active:scale-[0.98]"
                >
                  Đóng
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {cart.length === 0 ? (
                  <div className="flex min-h-48 flex-col items-center justify-center rounded-[14px] border border-dashed border-slate-200 bg-slate-50/70 px-4 text-center">
                    <ShoppingCart size={32} weight="duotone" className="mb-2 text-slate-300" />
                    <p className="text-sm font-black text-slate-600">Giỏ hàng đang trống</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">Chọn món ở thực đơn để tạo order.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[14px] border border-slate-200/80 bg-slate-50/70 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-black leading-snug text-slate-900">
                              {item.name}
                            </h3>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {renderStatusBadges(item)}
                            </div>
                            <p className="mt-2 text-xs font-bold text-slate-400">
                              {formatMoney(item.price)} x {item.quantity}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-black text-emerald-700">
                            {formatMoney(Number(item.price || 0) * Number(item.quantity || 0))}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => toggleSendToKitchen(item.id)}
                            className={`min-h-9 rounded-xl border px-3 text-[11px] font-black ${
                              item.sendToKitchen !== false
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-white text-slate-500"
                            }`}
                          >
                            {item.sendToKitchen !== false ? "Gửi bếp" : "Không gửi bếp"}
                          </button>

                          <div className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-1">
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 active:scale-[0.98]"
                              aria-label={`Giảm ${item.name}`}
                            >
                              <Minus size={14} weight="bold" />
                            </button>
                            <span className="min-w-6 text-center text-sm font-black text-slate-900">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => addToCart(item)}
                              disabled={!canAddMore(item.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                              aria-label={`Tăng ${item.name}`}
                            >
                              <Plus size={14} weight="bold" />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 bg-white p-3">
                <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">Tổng tiền</span>
                  <span className="text-base font-black text-emerald-700">{formatMoney(totalAmount)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  disabled={cart.length === 0 || submitting}
                  className="min-h-12 w-full rounded-xl bg-emerald-700 px-5 text-sm font-black text-white shadow-[0_14px_26px_rgba(4,120,87,0.2)] transition-colors hover:bg-emerald-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                >
                  {submitting ? "Đang gửi..." : "Gửi order"}
                </button>
              </div>
            </section>
          </div>
        )}

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-[#fbfbf8]/95 p-3 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                {totalItems} món trong giỏ
              </p>
              <p className="truncate text-base font-black text-emerald-700">
                {formatMoney(totalAmount)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQrCartOpen(true)}
              disabled={cart.length === 0}
              className="flex min-h-12 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ShoppingCart size={16} weight="duotone" />
              Giỏ
            </button>
            <button
              type="button"
              onClick={handleConfirmOrder}
              disabled={cart.length === 0 || submitting}
              className="min-h-12 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white shadow-[0_14px_26px_rgba(4,120,87,0.2)] transition-colors hover:bg-emerald-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              {submitting ? "Đang gửi..." : "Gửi order"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-[0_18px_44px_rgba(15,23,42,0.08)] xl:h-[calc(100vh-2rem)]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#fbfbf8]/95 px-5 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {!isQRMode && (
              <button
                onClick={() => navigate("/staff/tables")}
                className="admin-secondary-btn h-9 w-9 p-0"
                aria-label="Quay lại sơ đồ bàn"
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

          <div className="flex min-w-0 items-center justify-end gap-3">
            {/* Thông báo */}
            {success && (
              <div className="hidden max-w-sm items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 md:flex">
                <CheckCircle size={14} weight="fill" />
                {success}
              </div>
            )}
            {error && (
              <div className="hidden max-w-sm items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 md:flex">
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

      {(success || error) && (
        <div className="px-3 pt-3 md:hidden">
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
        </div>
      )}

      {/* Body */}
      <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-3 overflow-auto p-3 sm:p-4 xl:flex-row xl:gap-2 xl:overflow-hidden">

        {/* Giỏ hàng */}
        <div 
          className="flex max-h-[70vh] w-full flex-col overflow-hidden rounded-[14px] border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.045)] xl:max-h-none xl:w-[var(--cart-width)] xl:shrink-0"
          style={{ "--cart-width": `${cartPanelWidth}px` }}
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
            <p className="mt-1 text-[11px] font-semibold text-slate-400">
              Tick chọn món cần gửi bếp khi xác nhận order.
            </p>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto p-2">
            {cart.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-12 text-center text-slate-400">
                <ForkKnife size={32} className="mb-2 text-slate-300" weight="duotone" />
                <p className="text-sm font-black text-slate-500">Chưa có món trong giỏ</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">Chọn món ở thực đơn bên phải để bắt đầu order.</p>
              </div>
            ) : (
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[9px] font-bold uppercase tracking-wider text-slate-400">
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
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                          aria-label={`Gửi ${item.name} xuống bếp`}
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
                        <div className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            aria-label={`Giảm số lượng ${item.name}`}
                          >
                            <Minus size={11} weight="bold" />
                          </button>
                          <input
                            type="number"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, e.target.value)}
                            onBlur={(e) => handleQuantityBlur(item.id, e.target.value)}
                            className="w-10 border-b border-dashed border-slate-300 bg-transparent py-0 text-center text-xs font-black text-slate-800 focus:border-slate-500 focus:outline-none"
                            title="Chỉnh số lượng (chấp nhận số thập phân)"
                            aria-label={`Số lượng ${item.name}`}
                          />
                          <button
                            type="button"
                            onClick={() => addToCart(item)}
                            disabled={!canAddMore(item.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-700 transition-colors hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                            title={canAddMore(item.id) ? "Tăng số lượng" : "Đã đạt giới hạn tồn kho"}
                            aria-label={`Tăng số lượng ${item.name}`}
                          >
                            <Plus size={11} weight="bold" />
                          </button>
                        </div>
                      </td>
                      <td className="p-1.5 text-right align-middle">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.price}
                            onChange={(e) => updatePrice(item.id, e.target.value)}
                            onBlur={(e) => handlePriceBlur(item.id, e.target.value)}
                            className="w-16 border-b border-dashed border-emerald-300 bg-transparent px-0.5 py-0 text-right text-[11px] font-black text-emerald-700 focus:border-emerald-500 focus:outline-none"
                            title="Chỉnh đơn giá món (chỉ ở bàn này)"
                            aria-label={`Đơn giá ${item.name}`}
                          />
                          <span className="text-[10px] font-bold text-emerald-700">đ</span>
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
          className="mx-1 hidden w-1 cursor-col-resize self-stretch rounded bg-slate-200 transition-all duration-150 hover:bg-emerald-600 active:bg-emerald-700 xl:block"
          title="Kéo để chỉnh kích cỡ"
        />

        {/* Menu */}
        <div className="flex min-h-[520px] flex-1 flex-col justify-between overflow-hidden rounded-[14px] border border-slate-200/80 bg-white p-3 shadow-[0_12px_32px_rgba(15,23,42,0.045)] sm:p-5 xl:min-h-0">
          <div className="flex-1 overflow-auto">
            {/* Category Filter & Search Bar */}
            <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                {allCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setCurrentPage(1);
                    }}
                    className={`min-h-9 rounded-xl border px-3 text-xs font-black transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                      activeCategory === cat.id
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
                </div>
              
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Tìm món ăn..."
                      className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  <label className="flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] font-black text-slate-500">
                    <span className="whitespace-nowrap">Hiển thị</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-xs font-black text-slate-700 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      aria-label="Số món hiển thị mỗi trang"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size} món
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            {/* Menu Grid */}
            {paginatedMenu.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 text-center">
                <MagnifyingGlass size={32} weight="duotone" className="mb-2 text-slate-300" />
                <p className="text-sm font-black text-slate-600">Không tìm thấy món phù hợp</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">Thử đổi danh mục hoặc nhập từ khóa khác.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedMenu.map((item) => {
                const qty = getCartQty(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex min-h-[62px] items-center gap-2 rounded-xl border bg-white p-2 transition-all hover:border-slate-200 hover:bg-slate-50 ${
                      qty > 0 ? "border-emerald-200 ring-1 ring-emerald-100" : "border-slate-100"
                    }`}
                  >
                    {/* Ảnh siêu nhỏ */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ForkKnife size={18} weight="duotone" className="text-slate-300" />
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
                      {item.max_order_quantity !== null && item.max_order_quantity !== undefined ? (
                        <p className={`mt-0.5 text-[9px] font-black ${Number(item.max_order_quantity) > 0 ? "text-emerald-600" : "text-red-500"}`}>
                          Còn {Number(item.max_order_quantity) || 0}
                        </p>
                      ) : null}
                    </div>

                    {/* Nút bấm siêu nhỏ bên phải */}
                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(item)}
                        disabled={!canAddMore(item.id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300"
                        title={canAddMore(item.id) ? "Thêm món" : "Đã hết số lượng có thể order"}
                        aria-label={`Thêm ${item.name}`}
                      >
                        +
                      </button>
                    ) : (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          aria-label={`Giảm ${item.name}`}
                        >
                          -
                        </button>
                        <span className="w-3.5 text-center text-[10px] font-black text-slate-800">{qty}</span>
                        <button
                          onClick={() => addToCart(item)}
                          disabled={!canAddMore(item.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-[10px] font-bold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                          title={canAddMore(item.id) ? "Tăng số lượng" : "Đã đạt giới hạn tồn kho"}
                          aria-label={`Tăng ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            )}
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

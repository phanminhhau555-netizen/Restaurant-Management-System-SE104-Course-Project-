import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  ClockCounterClockwise,
  CaretDown,
  MagnifyingGlass,
  Package,
  Plus,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import Layout from "./Layout";
import API from "../services/api";

const emptyIngredientForm = {
  name: "",
  unit: "",
  min_quantity: "",
};

const emptyMovementForm = {
  ingredient_id: "",
  type: "nhap",
  quantity: "",
  note: "",
};

const formatNumber = (value) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(Number(value) || 0);

const formatDateTime = (value) => {
  if (!value) return "Chưa có thời gian";

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
};

const formatLogQuantity = (log) => {
  const unit = log.unit?.trim();
  return `${formatNumber(log.quantity)}${unit ? ` ${unit}` : ""}`;
};

function StockBadge({ ingredient }) {
  const quantity = Number(ingredient.quantity) || 0;
  const minimum = Number(ingredient.min_quantity) || 0;

  if (quantity <= 0) {
    return <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">Hết hàng</span>;
  }

  if (quantity <= minimum) {
    return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Sắp hết</span>;
  }

  return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Ổn định</span>;
}

function StatCard({ label, value, icon: Icon, tone = "emerald" }) {
  const toneClass = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
  }[tone];

  return (
    <article className="admin-panel-pad admin-lift">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-0.5 text-xl font-black text-slate-950">{value}</p>
        </div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon size={20} weight="duotone" />
        </span>
      </div>
    </article>
  );
}

export default function Warehouse({ permissions }) {
  const [ingredients, setIngredients] = useState([]);
  const [logs, setLogs] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [ingredientForm, setIngredientForm] = useState(emptyIngredientForm);
  const [movementForm, setMovementForm] = useState(emptyMovementForm);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [ingredientDropdownOpen, setIngredientDropdownOpen] = useState(false);
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [submittingIngredient, setSubmittingIngredient] = useState(false);
  const [submittingMovement, setSubmittingMovement] = useState(false);
  const [deletingIngredientId, setDeletingIngredientId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [logOpen, setLogOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const fetchInventory = async (shouldUpdate = () => true) => {
    try {
      const [ingredientsRes, logsRes] = await Promise.all([
        API.get("/api/inventory"),
        API.get("/api/inventory/logs"),
      ]);

      if (shouldUpdate()) {
        const nextIngredients = ingredientsRes.data || [];
        setIngredients(nextIngredients);
        setLogs(logsRes.data || []);
        setMovementForm((current) => ({
          ...current,
          ingredient_id: current.ingredient_id || nextIngredients[0]?.id || "",
        }));
      }
    } catch {
      if (shouldUpdate()) setError("Không tải được dữ liệu kho nguyên liệu.");
    } finally {
      if (shouldUpdate()) setInventoryLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const shouldUpdate = () => isMounted;

    const initialLoad = setTimeout(() => {
      fetchInventory(shouldUpdate);
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(initialLoad);
    };
  }, []);

  const inventoryStats = useMemo(() => {
    const lowStock = ingredients.filter(
      (item) => Number(item.quantity) > 0 && Number(item.quantity) <= Number(item.min_quantity),
    ).length;
    const outStock = ingredients.filter((item) => Number(item.quantity) <= 0).length;

    return {
      total: ingredients.length,
      lowStock,
      outStock,
      healthy: Math.max(ingredients.length - lowStock - outStock, 0),
    };
  }, [ingredients]);

  const selectedIngredient = useMemo(
    () => ingredients.find((ingredient) => String(ingredient.id) === String(movementForm.ingredient_id)),
    [ingredients, movementForm.ingredient_id],
  );

  const searchedIngredients = useMemo(() => {
    const query = ingredientSearch.trim().toLowerCase();
    if (!query) return ingredients;

    return ingredients.filter((ingredient) =>
      `${ingredient.name} ${ingredient.unit}`.toLowerCase().includes(query),
    );
  }, [ingredients, ingredientSearch]);

  const unitOptions = useMemo(() => {
    const units = ingredients
      .map((ingredient) => ingredient.unit?.trim())
      .filter(Boolean);

    return [...new Set(units)].sort((a, b) => a.localeCompare(b, "vi"));
  }, [ingredients]);

  const searchedUnits = useMemo(() => {
    const query = ingredientForm.unit.trim().toLowerCase();
    if (!query) return unitOptions;

    return unitOptions.filter((unit) => unit.toLowerCase().includes(query));
  }, [ingredientForm.unit, unitOptions]);

  const logStats = useMemo(() => ({
    imports: logs.filter((log) => log.type === "nhap").length,
    exports: logs.filter((log) => log.type === "xuat").length,
  }), [logs]);

  const handleSelectIngredient = (ingredient) => {
    setMovementForm((current) => ({
      ...current,
      ingredient_id: ingredient.id,
    }));
    setIngredientSearch(ingredient.name);
    setIngredientDropdownOpen(false);
  };

  const handleCreateIngredient = async (event) => {
    event.preventDefault();
    setSubmittingIngredient(true);
    setNotice("");
    setError("");

    try {
      await API.post("/api/inventory", {
        ...ingredientForm,
        name: ingredientForm.name.trim(),
        unit: ingredientForm.unit.trim(),
        quantity: 0,
        min_quantity: Number(ingredientForm.min_quantity) || 0,
      });
      setIngredientForm(emptyIngredientForm);
      setUnitDropdownOpen(false);
      setNotice("Đã thêm nguyên liệu mới vào kho.");
      await fetchInventory();
    } catch (err) {
      setError(err.response?.data?.message || "Không thêm được nguyên liệu.");
    } finally {
      setSubmittingIngredient(false);
    }
  };

  const handleInventoryMovement = async (event) => {
    event.preventDefault();
    setSubmittingMovement(true);
    setNotice("");
    setError("");

    const endpoint = movementForm.type === "nhap" ? "/api/inventory/import" : "/api/inventory/export";

    try {
      await API.post(endpoint, {
        ingredient_id: Number(movementForm.ingredient_id),
        quantity: Number(movementForm.quantity),
        note: movementForm.note,
      });
      setMovementForm((current) => ({ ...current, quantity: "", note: "" }));
      setIngredientSearch("");
      setIngredientDropdownOpen(false);
      setNotice(movementForm.type === "nhap" ? "Đã nhập kho thành công." : "Đã xuất kho thành công.");
      await fetchInventory();
    } catch (err) {
      setError(err.response?.data?.message || "Không cập nhật được tồn kho.");
    } finally {
      setSubmittingMovement(false);
    }
  };

  const handleDeleteIngredient = async (ingredient) => {
    setDeletingIngredientId(ingredient.id);
    setNotice("");
    setError("");

    try {
      await API.delete(`/api/inventory/${ingredient.id}`);
      setNotice("Đã xóa nguyên liệu khỏi kho.");
      setMovementForm((current) => (
        String(current.ingredient_id) === String(ingredient.id)
          ? { ...current, ingredient_id: "" }
          : current
      ));
      setIngredientSearch((current) => (current === ingredient.name ? "" : current));
      await fetchInventory();
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || "Không xóa được nguyên liệu.");
    } finally {
      setDeletingIngredientId(null);
    }
  };

  return (
    <Layout>
      <div className="admin-page">
        <header className="admin-header items-start gap-4">
          <div>
            <p className="admin-kicker">Nhà bếp</p>
            <h1 className="admin-title">Kho nguyên liệu</h1>
          </div>
          {permissions.canViewLogs ? (
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 text-sm font-black text-emerald-800 transition-colors hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:px-4"
            >
              <ClockCounterClockwise size={19} weight="duotone" />
              <span className="hidden sm:inline">Nhật ký kho</span>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-black text-emerald-700">
                {logs.length}
              </span>
            </button>
          ) : null}
        </header>

        {notice ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <section className="space-y-3" aria-label="Quản lý kho nguyên liệu">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Package} label="Tổng nguyên liệu" value={inventoryStats.total} />
            <StatCard icon={CheckCircle} label="Tồn kho ổn định" value={inventoryStats.healthy} tone="blue" />
            <StatCard icon={WarningCircle} label="Sắp hết" value={inventoryStats.lowStock} tone="amber" />
            <StatCard icon={WarningCircle} label="Hết hàng" value={inventoryStats.outStock} tone="red" />
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="admin-panel flex min-h-[400px] flex-col overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-slate-50/60 px-4 py-2.5">
                <div className="min-w-0">
                  <h3 className="font-black text-gray-950">Tồn kho hiện tại</h3>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-black text-gray-500 shadow-sm">
                  {ingredients.length} nguyên liệu
                </span>
              </div>

              {inventoryLoading ? (
                <div className="space-y-2 p-3" aria-label="Đang tải kho nguyên liệu">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="h-11 animate-pulse rounded-lg bg-gray-100" />
                  ))}
                </div>
              ) : ingredients.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center px-6 py-8 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Package size={22} weight="duotone" />
                  </div>
                  <p className="mt-3 font-semibold text-gray-900">Chưa có nguyên liệu</p>
                  <p className="mt-2 max-w-md text-sm text-gray-500">
                    Thêm nguyên liệu đầu tiên để bếp theo dõi tồn kho trong ca.
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden max-h-[calc(100vh-230px)] overflow-auto md:block">
                    <table className="w-full min-w-[680px] table-fixed">
                      <colgroup>
                        <col className={permissions.canDeleteIngredient ? "w-[34%]" : "w-[38%]"} />
                        <col className={permissions.canDeleteIngredient ? "w-[20%]" : "w-[22%]"} />
                        <col className={permissions.canDeleteIngredient ? "w-[20%]" : "w-[22%]"} />
                        <col className={permissions.canDeleteIngredient ? "w-[16%]" : "w-[18%]"} />
                        {permissions.canDeleteIngredient ? <col className="w-[10%]" /> : null}
                      </colgroup>
                      <thead>
                        <tr className="sticky top-0 z-10 border-b border-gray-100 bg-white text-xs font-semibold uppercase text-gray-500">
                          <th className="px-4 py-2.5 text-left">Nguyên liệu</th>
                          <th className="px-4 py-2.5 text-left">Tồn kho</th>
                          <th className="px-4 py-2.5 text-left">Tồn tối thiểu</th>
                          <th className="px-4 py-2.5 text-left">Trạng thái</th>
                          {permissions.canDeleteIngredient ? (
                            <th className="px-4 py-2.5 text-right">Thao tác</th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ingredients.map((ingredient) => (
                          <tr key={ingredient.id} className="group text-sm transition-colors hover:bg-gray-50">
                            <td className="truncate px-4 py-2.5 font-semibold text-gray-900">{ingredient.name}</td>
                            <td className="px-4 py-2.5 font-black tabular-nums text-gray-900">
                              {formatNumber(ingredient.quantity)} {ingredient.unit}
                            </td>
                            <td className="px-4 py-2.5 font-semibold tabular-nums text-gray-600">
                              {formatNumber(ingredient.min_quantity)} {ingredient.unit}
                            </td>
                            <td className="px-4 py-2.5">
                              <StockBadge ingredient={ingredient} />
                            </td>
                            {permissions.canDeleteIngredient ? (
                              <td className="px-4 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(ingredient)}
                                  disabled={deletingIngredientId === ingredient.id}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 opacity-70 transition-colors hover:bg-red-50 hover:text-red-600 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50 group-hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                                  aria-label={`Xóa ${ingredient.name}`}
                                  title="Xóa nguyên liệu"
                                >
                                  <Trash size={17} />
                                </button>
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-gray-100 md:hidden">
                    {ingredients.map((ingredient) => (
                      <article key={ingredient.id} className="p-3">
                        <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">{ingredient.name}</p>
                            <p className="mt-1 text-sm text-gray-500">
                              Tồn: {formatNumber(ingredient.quantity)} {ingredient.unit}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-gray-400">
                              Tối thiểu: {formatNumber(ingredient.min_quantity)} {ingredient.unit}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StockBadge ingredient={ingredient} />
                            {permissions.canDeleteIngredient ? (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(ingredient)}
                                disabled={deletingIngredientId === ingredient.id}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                                aria-label={`Xóa ${ingredient.name}`}
                              >
                                <Trash size={16} />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3">
              {permissions.canMoveStock ? (
                <form onSubmit={handleInventoryMovement} className="admin-panel-pad">
                  <h3 className="font-semibold text-gray-900">Nhập xuất kho</h3>
                  <div className="mt-3 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "nhap", label: "Nhập", icon: ArrowDown },
                        { key: "xuat", label: "Xuất", icon: ArrowUp },
                      ].map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.key}
                            type="button"
                            aria-pressed={movementForm.type === option.key}
                            onClick={() => setMovementForm({ ...movementForm, type: option.key })}
                            className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                              movementForm.type === option.key
                                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                                : "border-gray-200 text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <Icon size={18} />
                            {option.label}
                          </button>
                        );
                      })}
                    </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700">Nguyên liệu</p>
                    <div className="relative mt-1">
                      <MagnifyingGlass
                        size={18}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="search"
                        value={ingredientSearch}
                        onFocus={() => setIngredientDropdownOpen(true)}
                        onBlur={() => {
                          setTimeout(() => setIngredientDropdownOpen(false), 120);
                        }}
                        onChange={(event) => {
                          setIngredientSearch(event.target.value);
                          setIngredientDropdownOpen(true);
                          if (selectedIngredient && event.target.value !== selectedIngredient.name) {
                            setMovementForm((current) => ({ ...current, ingredient_id: "" }));
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") setIngredientDropdownOpen(false);
                        }}
                        placeholder="Tìm nguyên liệu..."
                        className="min-h-10 w-full rounded-lg border border-gray-200 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                        required
                      />

                      {ingredientDropdownOpen ? (
                        <div
                          className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-100 bg-white p-2 shadow-xl"
                          onMouseDown={(event) => event.preventDefault()}
                        >
                          {searchedIngredients.length === 0 ? (
                            <div className="px-3 py-6 text-center">
                              <p className="text-sm font-semibold text-gray-900">Không tìm thấy nguyên liệu</p>
                              <p className="mt-1 text-xs text-gray-500">Thử từ khóa khác hoặc thêm nguyên liệu mới.</p>
                            </div>
                          ) : (
                            searchedIngredients.map((ingredient) => (
                              <button
                                key={ingredient.id}
                                type="button"
                                onClick={() => handleSelectIngredient(ingredient)}
                                className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                                  String(movementForm.ingredient_id) === String(ingredient.id)
                                    ? "bg-emerald-50"
                                    : "hover:bg-gray-50"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{ingredient.name}</p>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                      Tồn: {formatNumber(ingredient.quantity)} {ingredient.unit}
                                    </p>
                                  </div>
                                  <StockBadge ingredient={ingredient} />
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <label className="block text-sm font-semibold text-gray-700">
                    Số lượng
                    <div className="mt-1 flex min-h-10 overflow-hidden rounded-lg border border-gray-200 focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-100">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={movementForm.quantity}
                        onChange={(event) => setMovementForm({ ...movementForm, quantity: event.target.value })}
                        className="min-w-0 flex-1 px-3 text-sm font-normal outline-none"
                        required
                      />
                      <span className="flex items-center border-l border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-600">
                        {selectedIngredient?.unit || "đơn vị"}
                      </span>
                    </div>
                  </label>

                  <label className="block text-sm font-semibold text-gray-700">
                    Ghi chú
                    <input
                      type="text"
                      value={movementForm.note}
                      onChange={(event) => setMovementForm({ ...movementForm, note: event.target.value })}
                      placeholder="Ví dụ: nhập đầu ca, hủy do hỏng"
                      className="mt-1 min-h-10 w-full rounded-lg border border-gray-200 px-3 text-sm font-normal outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                    <button
                      type="submit"
                      disabled={submittingMovement || ingredients.length === 0 || !movementForm.ingredient_id}
                      className="min-h-10 w-full rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    >
                      {submittingMovement ? "Đang cập nhật..." : "Cập nhật tồn kho"}
                    </button>
                  </div>
                </form>
              ) : null}

              {permissions.canCreateIngredient ? (
                <form onSubmit={handleCreateIngredient} className="admin-panel-pad border-emerald-100 bg-white">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <Plus size={18} weight="bold" />
                    </span>
                    <h3 className="font-black text-gray-950">Thêm nguyên liệu nhanh</h3>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    <label className="block text-sm font-semibold text-gray-700">
                      Tên nguyên liệu
                      <input
                        type="text"
                        value={ingredientForm.name}
                        onChange={(event) => setIngredientForm({ ...ingredientForm, name: event.target.value })}
                        placeholder="Ví dụ: Thịt bò, hành lá"
                        className="mt-1 min-h-10 w-full rounded-lg border border-gray-200 px-3 text-sm font-normal outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                        required
                      />
                    </label>

                    <div>
                      <p className="text-sm font-semibold text-gray-700">Đơn vị</p>
                      <div className="relative mt-1">
                        <input
                          type="search"
                          value={ingredientForm.unit}
                          onFocus={() => setUnitDropdownOpen(true)}
                          onBlur={() => {
                            setTimeout(() => setUnitDropdownOpen(false), 120);
                          }}
                          onChange={(event) => {
                            setIngredientForm({ ...ingredientForm, unit: event.target.value });
                            setUnitDropdownOpen(true);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") setUnitDropdownOpen(false);
                          }}
                          placeholder="Tìm hoặc nhập đơn vị..."
                          className="min-h-10 w-full rounded-lg border border-gray-200 bg-white px-3 pr-10 text-sm font-normal outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                          required
                        />
                        <CaretDown
                          size={16}
                          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform ${
                            unitDropdownOpen ? "rotate-180" : ""
                          }`}
                        />

                        {unitDropdownOpen ? (
                          <div
                            className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-100 bg-white p-2 shadow-xl"
                            onMouseDown={(event) => event.preventDefault()}
                          >
                            {searchedUnits.length > 0 ? (
                              <>
                                {searchedUnits.map((unit) => (
                                  <button
                                    key={unit}
                                    type="button"
                                    onClick={() => {
                                      setIngredientForm({ ...ingredientForm, unit });
                                      setUnitDropdownOpen(false);
                                    }}
                                  className={`flex min-h-9 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                                      ingredientForm.unit === unit
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "text-gray-700 hover:bg-gray-50"
                                    }`}
                                  >
                                    <span>{unit}</span>
                                  </button>
                                ))}
                              </>
                            ) : (
                              <div className="px-3 py-2 text-sm font-semibold text-gray-500">
                                {ingredientForm.unit.trim() || "Không có kết quả"}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <label className="block text-sm font-semibold text-gray-700">
                      Tồn tối thiểu
                      <div className="mt-1 flex min-h-10 overflow-hidden rounded-lg border border-gray-200 focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-100">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={ingredientForm.min_quantity}
                          onChange={(event) => setIngredientForm({ ...ingredientForm, min_quantity: event.target.value })}
                          placeholder="Ví dụ: 5"
                          className="min-w-0 flex-1 px-3 text-sm font-normal outline-none"
                        />
                        <span className="flex items-center border-l border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-600">
                          {ingredientForm.unit.trim() || "đơn vị"}
                        </span>
                      </div>
                    </label>

                    <button
                      type="submit"
                      disabled={
                        submittingIngredient ||
                        !ingredientForm.name.trim() ||
                        !ingredientForm.unit.trim()
                      }
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-black text-white shadow-[0_10px_20px_rgba(5,150,105,0.16)] transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    >
                      <Plus size={18} weight="bold" />
                      {submittingIngredient ? "Đang thêm..." : "Thêm nguyên liệu"}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </div>

          {logOpen ? (
            <div className="fixed inset-0 z-50 flex items-start justify-end bg-slate-950/35 p-4 sm:p-6">
              <section className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-[#fbfcf7] shadow-[0_28px_90px_rgba(15,23,42,0.24)] sm:max-h-[calc(100vh-3rem)]">
                <div className="border-b border-slate-200 bg-white px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                        Lịch sử
                      </p>
                      <h3 className="mt-1 text-lg font-black text-gray-950">Nhật ký kho</h3>
                      <p className="mt-1 text-sm font-medium text-gray-500">
                        {logs.length} giao dịch nhập xuất được ghi lại theo thời gian gần nhất
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLogOpen(false)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                      aria-label="Đóng nhật ký kho"
                    >
                      <X size={18} weight="bold" />
                    </button>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-xs font-bold text-slate-500">Tổng log</p>
                      <p className="mt-1 text-xl font-black text-slate-950">{logs.length}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                      <p className="text-xs font-bold text-emerald-700">Nhập kho</p>
                      <p className="mt-1 text-xl font-black text-emerald-900">{logStats.imports}</p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                      <p className="text-xs font-bold text-amber-700">Xuất kho</p>
                      <p className="mt-1 text-xl font-black text-amber-900">{logStats.exports}</p>
                    </div>
                  </div>
                </div>

                {logs.length === 0 ? (
                  <div className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                      <ClockCounterClockwise size={24} weight="duotone" />
                    </div>
                    <p className="mt-4 font-semibold text-gray-900">Chưa có nhật ký kho</p>
                  </div>
                ) : (
                  <div className="overflow-y-auto p-4">
                    <div className="space-y-2">
                      {logs.map((log) => {
                        const isImport = log.type === "nhap";
                        const MovementIcon = isImport ? ArrowDown : ArrowUp;

                        return (
                          <article
                            key={log.id}
                            className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300"
                          >
                            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                              <div className="flex min-w-0 gap-3">
                                <span
                                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                    isImport
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  <MovementIcon size={18} weight="bold" />
                                </span>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-sm font-black text-gray-950">{log.ingredient_name}</p>
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-xs font-black ${
                                        isImport
                                          ? "bg-emerald-50 text-emerald-700"
                                          : "bg-amber-50 text-amber-700"
                                      }`}
                                    >
                                      {isImport ? "Nhập kho" : "Xuất kho"}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs font-semibold text-gray-500">
                                    {formatDateTime(log.created_at)} · {log.account_name || "Hệ thống"}
                                  </p>
                                  {log.note ? (
                                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                                      {log.note}
                                    </p>
                                  ) : null}
                                </div>
                              </div>

                              <div className="sm:text-right">
                                <p
                                  className={`text-lg font-black ${
                                    isImport ? "text-emerald-700" : "text-amber-700"
                                  }`}
                                >
                                  {isImport ? "+" : "-"}
                                  {formatLogQuantity(log)}
                                </p>
                                <p className="text-xs font-bold text-gray-500">
                                  {isImport ? "Số lượng nhập" : "Số lượng xuất"}
                                </p>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {deleteTarget ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
              <section className="w-full max-w-md rounded-lg border border-red-100 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.22)]">
                <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                    <WarningCircle size={22} weight="duotone" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-950">Xóa nguyên liệu</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {deleteTarget.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    disabled={deletingIngredientId === deleteTarget.id}
                    className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                    aria-label="Đóng xác nhận xóa"
                  >
                    <X size={17} weight="bold" />
                  </button>
                </div>

                <div className="px-5 py-4">
                  <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-bold text-slate-500">Tồn kho hiện tại</p>
                    <p className="mt-1 text-sm font-black text-slate-950">
                      {formatNumber(deleteTarget.quantity)} {deleteTarget.unit}
                    </p>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-5 text-slate-500">
                    Thao tác này sẽ xóa nguyên liệu khỏi danh sách tồn kho. Nếu nguyên liệu đang được dùng trong công thức hoặc lịch sử kho, hệ thống có thể từ chối xóa.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    disabled={deletingIngredientId === deleteTarget.id}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteIngredient(deleteTarget)}
                    disabled={deletingIngredientId === deleteTarget.id}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-black text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                  >
                    <Trash size={16} weight="bold" />
                    {deletingIngredientId === deleteTarget.id ? "Đang xóa..." : "Xóa"}
                  </button>
                </div>
              </section>
            </div>
          ) : null}
        </section>

      </div>

    </Layout>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  ForkKnife,
  PencilSimple,
  Plus,
  Tag,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import Layout from "./Layout";
import API from "../services/api";

const STATUS_COLOR = {
  true: "text-green-500",
  false: "text-gray-400",
};

const CATEGORY_TONES = [
  "bg-blue-100 text-blue-600",
  "bg-purple-100 text-purple-600",
  "bg-yellow-100 text-yellow-700",
  "bg-pink-100 text-pink-600",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
];

const createCategoryDrafts = (items) =>
  items.reduce((drafts, category) => ({
    ...drafts,
    [category.id]: category.name,
  }), {});

export default function Menu({ permissions = {} }) {
  const {
    canCreateMenuItem = false,
    canManageCategories = false,
    canEditRecipes = false,
    canToggleMenuItem = false,
    canDeleteMenuItem = false,
  } = permissions;
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDrafts, setCategoryDrafts] = useState({});
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [recipePreviewItem, setRecipePreviewItem] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(false);
  const [editRecipeRows, setEditRecipeRows] = useState([
    { ingredient_id: "", amount: "" },
  ]);
  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    category_id: 1,
    image_url: "",
  });
  const [recipeRows, setRecipeRows] = useState([
    { ingredient_id: "", amount: "" },
  ]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [menuRes, categoriesRes, ingredientsRes, recipesRes] = await Promise.all([
          API.get("/api/menu"),
          API.get("/api/menu/categories"),
          API.get("/api/inventory"),
          API.get("/api/inventory/recipes"),
        ]);

        if (isMounted) {
          const categoryData = categoriesRes.data || [];
          setMenu(menuRes.data || []);
          setCategories(categoryData);
          setCategoryDrafts(createCategoryDrafts(categoryData));
          setIngredients(ingredientsRes.data || []);
          setRecipes(recipesRes.data || []);
          setForm((current) => ({
            ...current,
            category_id: categoryData.some((category) => category.id === current.category_id)
              ? current.category_id
              : categoryData[0]?.id || "",
          }));
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || "Không tải được dữ liệu thực đơn.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(loadData, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const allCategories = useMemo(
    () => [
      { id: null, label: "Tất cả" },
      ...categories.map((category) => ({ id: category.id, label: category.name })),
    ],
    [categories],
  );

  const filtered = useMemo(() => {
    if (activeCategory === null) {
      return menu;
    }
    return menu.filter((item) => item.category_id === activeCategory);
  }, [activeCategory, menu]);

  const fetchMenu = async () => {
    try {
      const [menuRes, recipesRes] = await Promise.all([
        API.get("/api/menu"),
        API.get("/api/inventory/recipes"),
      ]);
      setMenu(menuRes.data || []);
      setRecipes(recipesRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải lại được thực đơn.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const categoriesRes = await API.get("/api/menu/categories");
    const categoryData = categoriesRes.data || [];

    setCategories(categoryData);
    setCategoryDrafts(createCategoryDrafts(categoryData));
    setActiveCategory((current) =>
      current !== null && !categoryData.some((category) => category.id === current)
        ? null
        : current,
    );
    setForm((current) => ({
      ...current,
      category_id: categoryData.some((category) => category.id === current.category_id)
        ? current.category_id
        : categoryData[0]?.id || "",
    }));

    return categoryData;
  };

  const getIngredient = (id) =>
    ingredients.find((ingredient) => String(ingredient.id) === String(id));

  const getMenuItemRecipes = (menuItemId) =>
    recipes.filter((recipe) => String(recipe.menu_item_id) === String(menuItemId));

  const showRecipePreview = (item) => {
    const itemRecipes = getMenuItemRecipes(item.id);
    setRecipePreviewItem({
      ...item,
      recipes: itemRecipes,
    });
    setEditRecipeRows(
      itemRecipes.length > 0
        ? itemRecipes.map((recipe) => ({
          ingredient_id: String(recipe.ingredient_id),
          amount: String(recipe.amount),
        }))
        : [{ ingredient_id: "", amount: "" }],
    );
    setEditingRecipe(false);
  };

  const handleRecipePreviewKeyDown = (event, item) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      showRecipePreview(item);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      price: "",
      description: "",
      category_id: categories[0]?.id || "",
      image_url: "",
    });
    setRecipeRows([{ ingredient_id: "", amount: "" }]);
  };

  const handleRecipeRowChange = (index, field, value) => {
    setRecipeRows((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  };

  const handleEditRecipeRowChange = (index, field, value) => {
    setEditRecipeRows((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  };

  const addRecipeRow = () => {
    setRecipeRows((rows) => [...rows, { ingredient_id: "", amount: "" }]);
  };

  const addEditRecipeRow = () => {
    setEditRecipeRows((rows) => [...rows, { ingredient_id: "", amount: "" }]);
  };

  const removeRecipeRow = (index) => {
    setRecipeRows((rows) =>
      rows.length === 1
        ? [{ ingredient_id: "", amount: "" }]
        : rows.filter((_, rowIndex) => rowIndex !== index),
    );
  };

  const removeEditRecipeRow = (index) => {
    setEditRecipeRows((rows) =>
      rows.length === 1
        ? [{ ingredient_id: "", amount: "" }]
        : rows.filter((_, rowIndex) => rowIndex !== index),
    );
  };

  const handleUpdateRecipe = async () => {
    if (!recipePreviewItem) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const validRecipeRows = editRecipeRows.filter((row) => row.ingredient_id && Number(row.amount) > 0);

      await API.put(`/api/inventory/recipes/${recipePreviewItem.id}`, {
        recipes: validRecipeRows.map((row) => ({
          ingredient_id: Number(row.ingredient_id),
          amount: Number(row.amount),
        })),
      });

      setSuccess("Đã cập nhật nguyên liệu món ăn.");
      await fetchMenu();
      setEditingRecipe(false);
      setRecipePreviewItem((current) => (
        current
          ? {
            ...current,
            recipes: validRecipeRows.map((row, index) => {
              const ingredient = getIngredient(row.ingredient_id);
              return {
                id: `updated-${index}`,
                menu_item_id: current.id,
                ingredient_id: Number(row.ingredient_id),
                amount: Number(row.amount),
                ingredient_name: ingredient?.name || "Nguyên liệu",
                unit: ingredient?.unit || "",
              };
            }),
          }
          : current
      ));
    } catch (err) {
      setError(err.response?.data?.message || "Không cập nhật được nguyên liệu món ăn.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    const name = categoryName.trim();

    if (!name) {
      setError("Vui lòng nhập tên danh mục.");
      return;
    }

    setCategoryBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await API.post("/api/menu/categories", { name });
      const category = response.data?.category;
      const categoryData = await fetchCategories();

      setCategoryName("");
      setSuccess("Đã thêm danh mục mới.");
      if (category?.id || categoryData[0]?.id) {
        setActiveCategory(category?.id || categoryData[0].id);
        setPage(1);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Không thêm được danh mục.");
    } finally {
      setCategoryBusy(false);
    }
  };

  const handleUpdateCategory = async (categoryId) => {
    const name = String(categoryDrafts[categoryId] || "").trim();

    if (!name) {
      setError("Vui lòng nhập tên danh mục.");
      return;
    }

    setCategoryBusy(true);
    setError("");
    setSuccess("");

    try {
      await API.put(`/api/menu/categories/${categoryId}`, { name });
      await Promise.all([fetchCategories(), fetchMenu()]);
      setSuccess("Đã cập nhật danh mục.");
    } catch (err) {
      setError(err.response?.data?.message || "Không cập nhật được danh mục.");
    } finally {
      setCategoryBusy(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Xóa danh mục "${category.name}"?`)) return;

    setCategoryBusy(true);
    setError("");
    setSuccess("");

    try {
      await API.delete(`/api/menu/categories/${category.id}`);
      await Promise.all([fetchCategories(), fetchMenu()]);
      setSuccess("Đã xóa danh mục.");
    } catch (err) {
      setError(err.response?.data?.message || "Không xóa được danh mục.");
    } finally {
      setCategoryBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category_id) {
      setError("Hãy tạo danh mục trước khi thêm món.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const menuRes = await API.post("/api/menu", {
        ...form,
        category_id: Number(form.category_id),
      });
      const menuItemId = menuRes.data.id;
      const validRecipeRows = recipeRows.filter((row) => row.ingredient_id && Number(row.amount) > 0);

      if (validRecipeRows.length > 0) {
        await Promise.all(
          validRecipeRows.map((row) =>
            API.post("/api/inventory/recipes", {
              menu_item_id: menuItemId,
              ingredient_id: Number(row.ingredient_id),
              amount: Number(row.amount),
            }),
          ),
        );
      }

      setSuccess("Thêm món ăn thành công!");
      resetForm();
      setShowForm(false);
      fetchMenu();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi thêm món ăn!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await API.patch(`/api/menu/${id}/toggle`);
      fetchMenu();
    } catch (err) {
      setError(err.response?.data?.message || "Không cập nhật được trạng thái món.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa món ăn này?")) return;
    try {
      await API.delete(`/api/menu/${id}`);
      fetchMenu();
    } catch (err) {
      setError(err.response?.data?.message || "Không xóa được món ăn.");
    }
  };

  const formatMoney = (amount) =>
    new Intl.NumberFormat("vi-VN").format(amount) + "đ";

  const formatAmount = (amount) =>
    new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(
      Number(amount) || 0,
    );

  const getCategoryLabel = (id) =>
    categories.find((category) => category.id === id)?.name || "N/A";

  const getCategoryTone = (id) =>
    CATEGORY_TONES[Math.abs(Number(id) || 0) % CATEGORY_TONES.length];

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Layout>
      <div className="admin-page">
        <header className="admin-header">
          <div>
            <p className="admin-kicker">Thực đơn</p>
            <h1 className="admin-title">Món ăn & công thức</h1>
          </div>
          {canCreateMenuItem ? (
            <button type="button" onClick={() => setShowForm(true)} className="admin-primary-btn">
              <Plus size={18} weight="bold" />
              Thêm món mới
            </button>
          ) : null}
        </header>

      {/* Thông báo */}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <CheckCircle size={18} weight="fill" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          <WarningCircle size={18} weight="duotone" />
          {error}
        </div>
      )}

      <div className="flex gap-4">
        {/* Main Content */}
        <div className="flex-1">
          {/* Category Filter + Stats */}
          <div className="mb-4 flex gap-4">
            {/* Filter */}
            <div className="admin-panel-pad flex-1">
              <div className="flex items-center justify-between mb-3">
                <p className="admin-section-title">Danh mục nhanh</p>
                {canManageCategories ? (
                  <button
                    type="button"
                    onClick={() => setCategoryManagerOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-50"
                  >
                    <Tag size={14} weight="bold" />
                    Quản lý danh mục
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {allCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setPage(1);
                    }}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeCategory === cat.id
                        ? "bg-emerald-700 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tổng món */}
            <div className="w-48 rounded-2xl bg-emerald-700 p-4 text-white shadow-[0_18px_40px_rgba(4,120,87,0.18)]">
              <p className="text-xs font-black uppercase tracking-wide opacity-75">Đang bán</p>
              <p className="mt-1 text-3xl font-black">{menu.filter(m => m.is_visible).length}</p>
            </div>
          </div>

          {/* Table */}
          <div className="admin-panel overflow-hidden">
            <table className="admin-table">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left px-5 py-4">THÔNG TIN MÓN</th>
                  <th className="text-left px-5 py-4">DANH MỤC</th>
                  <th className="text-left px-5 py-4">GIÁ BÁN</th>
                  <th className="text-left px-5 py-4">TRẠNG THÁI</th>
                  <th className="text-left px-5 py-4">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
                      Đang tải...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
                      <ForkKnife size={34} className="mx-auto mb-2 text-slate-300" weight="duotone" />
                      <p>Chưa có món ăn nào</p>
                    </td>
                  </tr>
                ) : (
                  paginated.map((item) => {
                    return (
                    <tr
                      key={item.id}
                      tabIndex={0}
                      onClick={() => showRecipePreview(item)}
                      onKeyDown={(event) => handleRecipePreviewKeyDown(event, item)}
                      className="group cursor-pointer outline-none transition-colors hover:bg-green-50/40 focus:bg-green-50/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-400 focus-within:bg-green-50/50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <ForkKnife size={20} className="text-slate-400" weight="duotone" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                            <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                              <span>SKU: DF-{String(item.id).padStart(4, "0")}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Danh mục */}
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryTone(item.category_id)}`}>
                          {getCategoryLabel(item.category_id)}
                        </span>
                      </td>

                      {/* Giá */}
                      <td className="px-5 py-4 text-sm text-gray-800 font-medium">
                        {formatMoney(item.price)}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-5 py-4">
                        <span className={`flex items-center gap-1 text-sm ${STATUS_COLOR[item.is_visible]}`}>
                          <span className={`w-2 h-2 rounded-full ${item.is_visible ? "bg-green-500" : "bg-gray-300"}`}></span>
                          {item.is_visible ? "Sẵn sàng" : "Đã ẩn"}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="px-5 py-4">
                        {canToggleMenuItem || canDeleteMenuItem ? (
                          <div className="flex items-center gap-2">
                            {canToggleMenuItem ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggle(item.id);
                                }}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700"
                              >
                                {item.is_visible ? "Ẩn" : "Hiện"}
                              </button>
                            ) : null}
                            {canToggleMenuItem && canDeleteMenuItem ? (
                              <span className="text-gray-200">|</span>
                            ) : null}
                            {canDeleteMenuItem ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(item.id);
                                }}
                                className="text-xs font-bold text-red-400 hover:text-red-600"
                              >
                                Xóa
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-300">Chỉ xem</span>
                        )}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">{filtered.length} món</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-gray-50"
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        page === p
                          ? "bg-green-500 text-white"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-gray-50"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {categoryManagerOpen && canManageCategories && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/20 px-4 py-6 backdrop-blur-[1px]"
          onClick={() => setCategoryManagerOpen(false)}
        >
          <div
            className="w-[min(94vw,560px)] overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] ring-1 ring-gray-900/5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-emerald-50/70 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                  Thực đơn
                </p>
                <h3 className="mt-1 text-xl font-bold text-gray-900">
                  Quản lý danh mục
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCategoryManagerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                aria-label="Đóng quản lý danh mục"
              >
                <X size={17} weight="bold" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              <form onSubmit={handleCreateCategory} className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="Tên danh mục mới"
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-200 px-4 text-sm text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="submit"
                  disabled={categoryBusy}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
                >
                  <Plus size={16} weight="bold" />
                  Thêm
                </button>
              </form>

              <div className="space-y-2">
                {categories.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center text-sm font-semibold text-gray-500">
                    Chưa có danh mục nào
                  </div>
                ) : (
                  categories.map((category) => (
                    <div
                      key={category.id}
                      className="grid gap-2 rounded-xl border border-gray-100 bg-gray-50/70 p-2 sm:grid-cols-[1fr_auto_auto]"
                    >
                      <input
                        type="text"
                        value={categoryDrafts[category.id] ?? category.name}
                        onChange={(event) =>
                          setCategoryDrafts((drafts) => ({
                            ...drafts,
                            [category.id]: event.target.value,
                          }))
                        }
                        className="min-h-10 min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateCategory(category.id)}
                        disabled={categoryBusy || (categoryDrafts[category.id] ?? category.name).trim() === category.name}
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-40"
                      >
                        <PencilSimple size={15} weight="bold" />
                        Lưu
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category)}
                        disabled={categoryBusy}
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 text-xs font-bold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40"
                      >
                        <Trash size={15} weight="bold" />
                        Xóa
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {recipePreviewItem && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/20 px-4 py-6 backdrop-blur-[1px]"
          onClick={() => setRecipePreviewItem(null)}
        >
          <div
            className="w-[min(94vw,620px)] max-h-[min(76vh,620px)] overflow-hidden rounded-2xl border border-green-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] ring-1 ring-gray-900/5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-gray-100 bg-gradient-to-b from-green-50/80 to-white px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-green-600">
                    Công thức món
                  </p>
                  <h3 className="mt-1 truncate text-xl font-bold text-gray-900">
                    {recipePreviewItem.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-gray-500">
                    {getCategoryLabel(recipePreviewItem.category_id)} · {formatMoney(recipePreviewItem.price)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-green-200 bg-white px-3 py-1.5 text-xs font-semibold text-green-600 shadow-sm">
                    {editingRecipe ? editRecipeRows.filter((row) => row.ingredient_id).length : recipePreviewItem.recipes.length} nguyên liệu
                  </span>
                  {!editingRecipe && canEditRecipes ? (
                    <button
                      type="button"
                      onClick={() => setEditingRecipe(true)}
                      className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 transition-colors hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                      Sửa nguyên liệu
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setRecipePreviewItem(null);
                      setEditingRecipe(false);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400"
                    aria-label="Đóng công thức"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-[calc(min(76vh,620px)-96px)] overflow-y-auto p-5">
              {editingRecipe ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-gray-800">Nguyên liệu công thức</h3>
                      <button
                        type="button"
                        onClick={addEditRecipeRow}
                        className="shrink-0 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-600 transition-colors hover:bg-green-100"
                      >
                        + Thêm nguyên liệu
                      </button>
                    </div>

                    <div className="space-y-3">
                      {editRecipeRows.map((row, index) => {
                        const selectedIngredient = getIngredient(row.ingredient_id);

                        return (
                          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_150px_44px]">
                            <label className="block text-xs font-medium text-gray-600">
                              Nguyên liệu
                              <select
                                value={row.ingredient_id}
                                onChange={(event) => handleEditRecipeRowChange(index, "ingredient_id", event.target.value)}
                                className="mt-1 min-h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                              >
                                <option value="">Chọn nguyên liệu</option>
                                {ingredients.map((ingredient) => (
                                  <option key={ingredient.id} value={ingredient.id}>
                                    {ingredient.name}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="block text-xs font-medium text-gray-600">
                              Định lượng
                              <div className="mt-1 flex min-h-10 overflow-hidden rounded-lg border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-green-500">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={row.amount}
                                  onChange={(event) => handleEditRecipeRowChange(index, "amount", event.target.value)}
                                  className="min-w-0 flex-1 px-3 text-sm text-gray-800 outline-none"
                                  placeholder="0"
                                />
                                <span className="flex items-center border-l border-gray-200 bg-gray-50 px-2 text-xs font-semibold text-gray-500">
                                  {selectedIngredient?.unit || "đv"}
                                </span>
                              </div>
                            </label>

                            <button
                              type="button"
                              onClick={() => removeEditRecipeRow(index)}
                              className="mt-5 flex h-10 w-10 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              aria-label="Xóa dòng nguyên liệu"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRecipe(false);
                        setEditRecipeRows(
                          recipePreviewItem.recipes.length > 0
                            ? recipePreviewItem.recipes.map((recipe) => ({
                              ingredient_id: String(recipe.ingredient_id),
                              amount: String(recipe.amount),
                            }))
                            : [{ ingredient_id: "", amount: "" }],
                        );
                      }}
                      className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateRecipe}
                      disabled={submitting}
                      className="flex-1 rounded-lg bg-green-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                    >
                      {submitting ? "Đang lưu..." : "Lưu nguyên liệu"}
                    </button>
                  </div>
                </div>
              ) : recipePreviewItem.recipes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center">
                  <p className="text-sm font-semibold text-gray-700">
                    Chưa có nguyên liệu
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Thêm nguyên liệu trong form món mới để công thức hiện ở đây.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {recipePreviewItem.recipes.map((recipe, index) => (
                    <article
                      key={recipe.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 py-3 shadow-sm"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-green-600 ring-1 ring-gray-100">
                          {index + 1}
                        </span>
                        <p className="truncate text-sm font-semibold text-gray-800">
                          {recipe.ingredient_name}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-green-600 ring-1 ring-green-100">
                        {formatAmount(recipe.amount)} {recipe.unit}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm món */}
      {showForm && canCreateMenuItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Thêm món ăn mới</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tên món */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên món ăn
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên món ăn..."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              {/* Danh mục + Giá */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phân loại
                  </label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    {categories.length === 0 ? (
                      <option value="">Chưa có danh mục</option>
                    ) : null}
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá bán (VNĐ)
                  </label>
                  <input
                    type="number"
                    placeholder="85000"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả món ăn
                </label>
                <textarea
                  placeholder="Nhập mô tả chi tiết về cách chế biến hoặc hương vị..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>

              {/* URL ảnh */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL hình ảnh
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Nguyên liệu công thức</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addRecipeRow}
                    className="shrink-0 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-600 transition-colors hover:bg-green-100"
                  >
                    + Thêm nguyên liệu
                  </button>
                </div>

                <div className="space-y-3">
                  {recipeRows.map((row, index) => {
                    const selectedIngredient = getIngredient(row.ingredient_id);

                    return (
                      <div key={index} className="grid gap-2 sm:grid-cols-[1fr_150px_44px]">
                        <label className="block text-xs font-medium text-gray-600">
                          Nguyên liệu
                          <select
                            value={row.ingredient_id}
                            onChange={(e) => handleRecipeRowChange(index, "ingredient_id", e.target.value)}
                            className="mt-1 min-h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">Chọn nguyên liệu</option>
                            {ingredients.map((ingredient) => (
                              <option key={ingredient.id} value={ingredient.id}>
                                {ingredient.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block text-xs font-medium text-gray-600">
                          Định lượng
                          <div className="mt-1 flex min-h-10 overflow-hidden rounded-lg border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-green-500">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.amount}
                              onChange={(e) => handleRecipeRowChange(index, "amount", e.target.value)}
                              className="min-w-0 flex-1 px-3 text-sm text-gray-800 outline-none"
                              placeholder="0"
                            />
                            <span className="flex items-center border-l border-gray-200 bg-gray-50 px-2 text-xs font-semibold text-gray-500">
                              {selectedIngredient?.unit || "đv"}
                            </span>
                          </div>
                        </label>

                        <button
                          type="button"
                          onClick={() => removeRecipeRow(index)}
                          className="mt-5 flex h-10 w-10 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label="Xóa dòng nguyên liệu"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>

                {ingredients.length === 0 && (
                  <p className="mt-3 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                    Chưa có nguyên liệu trong kho. Hãy thêm nguyên liệu ở trang Nhà bếp trước.
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : "Lưu món ăn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}

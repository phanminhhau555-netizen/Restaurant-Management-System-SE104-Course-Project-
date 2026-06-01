import { useEffect, useMemo, useState } from "react";
import { CheckCircle, ShieldCheck, Trash, UserPlus, UsersThree } from "@phosphor-icons/react";
import Layout from "../../components/Layout";
import API from "../../services/api";

const roles = [
  { id: 2, name: "ban_hang", label: "Staff", desc: "Phục vụ và nhận đơn" },
  { id: 3, name: "bep", label: "Kitchen", desc: "Quản lý chế biến món ăn" },
];

const rolePermissions = {
  2: ["Xem sơ đồ bàn", "Nhận order", "Thanh toán"],
  3: ["Theo dõi bếp", "Cập nhật món", "Quản lý kho nguyên liệu"],
};

const roleTone = {
  2: "bg-blue-50 text-blue-700",
  3: "bg-amber-50 text-amber-700",
};

export default function Staff() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    password: "",
    role_id: 2,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const staffAccounts = useMemo(
    () => accounts.filter((a) => Number(a.role_id) !== 1),
    [accounts]
  );

  const roleCounts = useMemo(
    () =>
      roles.map((role) => ({
        ...role,
        count: accounts.filter((account) => Number(account.role_id) === role.id).length,
      })),
    [accounts],
  );

  const fetchAccounts = async (shouldUpdate = () => true) => {
    try {
      const res = await API.get("/api/auth/accounts");
      if (shouldUpdate()) setAccounts(res.data || []);
    } catch {
      if (shouldUpdate()) setError("Không tải được danh sách nhân sự.");
    } finally {
      if (shouldUpdate()) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => fetchAccounts(() => mounted), 0);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await API.post("/api/auth/register", form);
      setSuccess("Đã tạo tài khoản nhân viên.");
      setForm({ full_name: "", username: "", password: "", role_id: 2 });
      fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.message || "Không tạo được tài khoản.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (account) => {
    if (!window.confirm(`Xóa tài khoản ${account.full_name}?`)) return;
    try {
      await API.delete(`/api/auth/accounts/${account.id}`);
      setSuccess("Đã xóa tài khoản.");
      fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.message || "Không xóa được tài khoản.");
    }
  };

  const getRoleInfo = (roleId) => roles.find((role) => role.id === Number(roleId));

  return (
    <Layout>
      <div className="admin-page">
        <header className="admin-header">
          <div>
            <p className="admin-kicker">Nhân sự</p>
            <h1 className="admin-title">Tài khoản & phân quyền</h1>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Tổng nhân sự</p>
            <p className="mt-0.5 text-xl font-black text-slate-950">{staffAccounts.length}</p>
          </div>
        </header>

        {(error || success) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-bold ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || success}
          </div>
        )}

        <section className="grid gap-3 xl:grid-cols-2">
          {roleCounts.map((role) => (
            <article key={role.id} className="admin-panel-pad admin-lift">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">{role.label}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${roleTone[role.id]}`}>
                  {role.count}
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="admin-panel flex min-h-[430px] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
              <div>
                <h2 className="admin-section-title">Danh sách nhân viên</h2>
              </div>
              <UsersThree size={22} className="text-emerald-700" weight="duotone" />
            </div>

            {loading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-12 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : staffAccounts.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="font-black text-slate-800">Chưa có nhân viên</p>
              </div>
            ) : (
              <div className="max-h-[calc(100vh-285px)] overflow-auto">
                <table className="admin-table">
                  <thead>
                    <tr className="sticky top-0 z-10 bg-white">
                      <th>Nhân viên</th>
                      <th>Vai trò</th>
                      <th>Trạng thái</th>
                      <th className="text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffAccounts.map((account) => (
                      <tr key={account.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-sm font-black text-white">
                              {account.full_name?.charAt(0)?.toUpperCase() || "A"}
                            </div>
                            <div>
                              <p className="font-black text-slate-900">{account.full_name}</p>
                              <p className="text-xs font-semibold text-slate-400">{account.username}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${roleTone[account.role_id] || "bg-slate-100 text-slate-600"}`}>
                            {getRoleInfo(account.role_id)?.label || "N/A"}
                          </span>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700">
                            <CheckCircle size={16} weight="fill" />
                            Đang hoạt động
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(account)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                            aria-label={`Xóa ${account.full_name}`}
                          >
                            <Trash size={17} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="admin-panel-pad">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <UserPlus size={20} weight="duotone" />
              </span>
              <div>
                <h2 className="admin-section-title">Thêm nhân viên</h2>
              </div>
            </div>

            <div className="space-y-3">
              <label className="admin-label">
                Họ và tên
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                  className="admin-field mt-1.5"
                  required
                />
              </label>

              <label className="admin-label">
                Tên đăng nhập
                <input
                  type="text"
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                  className="admin-field mt-1.5"
                  required
                />
              </label>

              <label className="admin-label">
                Mật khẩu
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  className="admin-field mt-1.5"
                  required
                />
              </label>

              <div>
                <p className="admin-label">Vai trò</p>
                <div className="mt-1.5 grid gap-2">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setForm({ ...form, role_id: role.id })}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                        form.role_id === role.id
                          ? "border-emerald-700 bg-emerald-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">{role.label}</p>
                          <p className="mt-0.5 text-xs font-semibold text-slate-400">{role.desc}</p>
                        </div>
                        {form.role_id === role.id && (
                          <CheckCircle size={18} className="shrink-0 text-emerald-700" weight="fill" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-700" weight="duotone" />
                  <p className="text-xs font-black text-slate-700">
                    Quyền của {getRoleInfo(form.role_id)?.label}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rolePermissions[form.role_id]?.map((permission) => (
                    <span key={permission} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500">
                      {permission}
                    </span>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={submitting} className="admin-primary-btn w-full">
                {submitting ? "Đang tạo..." : "Tạo tài khoản"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Layout>
  );
}

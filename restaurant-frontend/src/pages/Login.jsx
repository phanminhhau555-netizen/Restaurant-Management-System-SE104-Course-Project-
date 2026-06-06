import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeSlash, LockKey, User, BowlFood } from "@phosphor-icons/react";
import API from "../services/api";
import loginWallpaper from "../assets/dineflow-login-wallpaper.png";
import { getDefaultPath } from "../utils/permissions";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/api/auth/login", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      const redirectPath = sessionStorage.getItem("redirectAfterLogin");
      if (redirectPath) {
        sessionStorage.removeItem("redirectAfterLogin");
        navigate(redirectPath);
      } else {
        navigate(getDefaultPath(res.data.user));
      }
    } catch {
      setError("Sai tên đăng nhập hoặc mật khẩu!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#18120d] bg-cover bg-center text-white"
      style={{ backgroundImage: `url(${loginWallpaper})` }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,9,6,0.78)_0%,rgba(20,15,10,0.48)_44%,rgba(18,13,8,0.72)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />

      <main className="relative z-10 flex min-h-screen items-center px-5 py-10 sm:px-8 lg:px-16">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1fr_460px]">
          <section className="max-w-3xl pt-4 text-center lg:text-left">
            <div className="mb-7 inline-flex h-20 w-20 items-center justify-center rounded-full border border-white/45 bg-[#f8f1e5] text-[#2f6d3c] shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <BowlFood size={42} weight="duotone" />
            </div>
            <h1 className="text-6xl font-semibold leading-[0.95] tracking-normal text-[#fffaf0] drop-shadow-[0_8px_32px_rgba(0,0,0,0.45)] sm:text-7xl lg:text-8xl">
              NhaHangWow
            </h1>
            <p className="mt-5 text-xl font-medium text-[#fff7e8]/90 drop-shadow-[0_4px_18px_rgba(0,0,0,0.5)] sm:text-2xl">
              Wow WOW wOw WoW WOw
            </p>
          </section>

          <section className="mx-auto w-full max-w-[460px] rounded-lg border border-[#e8d7bd] bg-[#fffaf0]/95 p-7 text-[#2b2a27] shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-md sm:p-9">
            <div className="mb-8">
              <h2 className="text-4xl font-semibold tracking-normal text-[#25221f]">
                Đăng nhập
              </h2>
            </div>

            {error && (
              <div className="mb-5 rounded-md border border-[#f0c9bd] bg-[#fff2ed] px-4 py-3 text-sm font-medium text-[#b93620]">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#38342e]">
                  Tên đăng nhập
                </label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#887e70]"
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="Nhập tên đăng nhập"
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value })
                    }
                    className="h-14 w-full rounded-md border border-[#d8c8ad] bg-white/70 pl-12 pr-4 text-sm text-[#25221f] outline-none transition focus:border-[#2f6d3c] focus:bg-white focus:ring-4 focus:ring-[#2f6d3c]/15"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#38342e]">
                  Mật khẩu
                </label>
                <div className="relative">
                  <LockKey
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#887e70]"
                    size={20}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="h-14 w-full rounded-md border border-[#d8c8ad] bg-white/70 pl-12 pr-12 text-sm text-[#25221f] outline-none transition focus:border-[#2f6d3c] focus:bg-white focus:ring-4 focus:ring-[#2f6d3c]/15"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-[#6f665a] transition hover:bg-[#efe2cf]"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 h-14 w-full rounded-md bg-[#2f6d3c] text-sm font-semibold text-white shadow-[0_12px_28px_rgba(47,109,60,0.3)] transition hover:bg-[#255c32] focus:outline-none focus:ring-4 focus:ring-[#2f6d3c]/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

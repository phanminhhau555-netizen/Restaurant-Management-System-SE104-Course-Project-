import { useEffect, useMemo, useState } from "react";
import {
  Bank,
  CreditCard,
  Money,
  Percent,
  QrCode,
  Receipt,
} from "@phosphor-icons/react";
import Layout from "../../components/Layout";
import API from "../../services/api";

const PAYMENT_METHOD_META = [
  { id: "tien_mat",     name: "Tiền mặt",     icon: Money,      toggleable: false },
  { id: "chuyen_khoan", name: "Thẻ tín dụng", icon: CreditCard, toggleable: false },
  { id: "qr",           name: "QR Pay",        icon: QrCode,     toggleable: true  },
];

export default function SettingsPage() {
  const [vatRate, setVatRate]           = useState("10");
  const [invoiceTitle, setInvoiceTitle] = useState("RESTO DELUXE");
  const [contactInfo, setContactInfo]   = useState("123 Đường Ẩm Thực, Quận 1, TP. HCM - Hotline: 0123 456 789");
  const [footerText, setFooterText]     = useState("Cảm ơn quý khách và hẹn gặp lại!");
  const [bankId, setBankId]             = useState("VCB");
  const [accountNo, setAccountNo]       = useState("1049144528");
  const [accountName, setAccountName]   = useState("PHAM TRUONG PHAT");
  const [saveState, setSaveState]       = useState("idle");
  const [enabledMethods, setEnabledMethods] = useState(["tien_mat", "chuyen_khoan"]);

  useEffect(() => {
    API.get("/api/settings")
      .then((res) => {
        const d = res.data;
        if (d.ten_quan)         setInvoiceTitle(d.ten_quan);
        if (d.tax_rate != null) setVatRate(String(d.tax_rate));
        if (d.payment_methods)  setEnabledMethods(d.payment_methods.split(",").map((s) => s.trim()));
        if (d.invoice_template) {
          try {
            const tpl = JSON.parse(d.invoice_template);
            if (tpl.footer)  setFooterText(tpl.footer);
            if (tpl.contact) setContactInfo(tpl.contact);
            if (tpl.bank_id) setBankId(tpl.bank_id);
            if (tpl.account_no) setAccountNo(tpl.account_no);
            if (tpl.account_name) setAccountName(tpl.account_name);
          } catch {
            // Keep the default invoice settings if saved JSON is malformed.
          }
        }
      })
      .catch(() => {});
  }, []);

  const paymentMethods = useMemo(
    () => PAYMENT_METHOD_META.map((m) => ({ ...m, active: enabledMethods.includes(m.id) })),
    [enabledMethods]
  );

  const toggleMethod = (id) => {
    setEnabledMethods((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const safeVatRate = Math.min(Math.max(Number(vatRate) || 0, 0), 100);
  const subtotal    = 220000;
  const vatAmount   = Math.round((subtotal * safeVatRate) / 100);
  const totalAmount = subtotal + vatAmount;

  const handleSave = async () => {
    setSaveState("saving");
    try {
      await API.put("/api/settings", {
        ten_quan:        invoiceTitle,
        tax_rate:        safeVatRate,
        payment_methods: enabledMethods.join(","),
        footer_text:     footerText,
        contact_info:    contactInfo,
        bank_id:         bankId,
        account_no:      accountNo,
        account_name:    accountName,
      });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1800);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2500);
    }
  };

  const formatMoney = (amount) => new Intl.NumberFormat("vi-VN").format(amount);

  return (
    <Layout>
      <div className="admin-page">
        <header className="admin-header">
          <div>
            <p className="admin-kicker">Cài đặt</p>
            <h1 className="admin-title">Cấu hình hệ thống</h1>
          </div>
        </header>

        {saveState === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            Lưu thất bại. Vui lòng thử lại.
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            {/* Thuế */}
            <section className="admin-panel-pad">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Percent size={23} weight="bold" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Cấu hình Thuế</h2>
                </div>
              </div>
              <label className="block text-xs font-semibold text-gray-500">
                Thuế VAT hiện tại (%)
                <div className="mt-2 flex h-12 overflow-hidden rounded-xl bg-gray-50 ring-1 ring-gray-100 focus-within:ring-2 focus-within:ring-emerald-500">
                  <input
                    type="number" min="0" max="100"
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-4 text-sm font-bold text-gray-800 outline-none"
                  />
                  <span className="flex items-center px-4 text-sm font-bold text-gray-400">%</span>
                </div>
              </label>
            </section>

            {/* Tài khoản QR */}
            <section className="admin-panel-pad">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Bank size={23} weight="bold" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Tài khoản QR</h2>
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-500">
                  Mã Ngân hàng
                  <input
                    type="text"
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    className="mt-1.5 w-full h-10 rounded-xl bg-gray-50 px-3 text-xs font-bold text-gray-800 ring-1 ring-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="Ví dụ: VCB"
                  />
                </label>

                <label className="block text-xs font-semibold text-gray-500">
                  Số tài khoản
                  <input
                    type="text"
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                    className="mt-1.5 w-full h-10 rounded-xl bg-gray-50 px-3 text-xs font-bold text-gray-800 ring-1 ring-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="Nhập số tài khoản"
                  />
                </label>

                <label className="block text-xs font-semibold text-gray-500">
                  Tên chủ tài khoản
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="mt-1.5 w-full h-10 rounded-xl bg-gray-50 px-3 text-xs font-bold text-gray-800 ring-1 ring-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="Nhập tên viết liền không dấu"
                  />
                </label>
              </div>
            </section>
          </div>

          {/* Phương thức thanh toán */}
          <section className="admin-panel-pad">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Bank size={23} weight="duotone" />
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900">Phương thức thanh toán</h2>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <article
                    key={method.id}
                    className={`rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      method.active ? "border-emerald-100 bg-white shadow-sm ring-2 ring-emerald-100" : "border-gray-100 bg-gray-50 opacity-70"
                    }`}
                  >
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${method.active ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                        <Icon size={18} weight="duotone" />
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleMethod(method.id)}
                        className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${method.active ? "justify-end bg-emerald-600" : "justify-start bg-gray-300"}`}
                        aria-pressed={method.active}
                      >
                        <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
                      </button>
                    </div>
                    <h3 className="text-sm font-bold text-gray-800">{method.name}</h3>
                    <p className={`mt-4 text-xs font-bold ${method.active ? "text-emerald-600" : "text-gray-400"}`}>
                      {method.active ? "Đang bật" : "Đã tắt"}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
          {/* Preview hóa đơn */}
          <section className="rounded-[18px] border border-slate-200/80 bg-slate-50 p-4">
            <p className="mb-4 text-center text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">
              Xem trước hóa đơn
            </p>
            <div className="mx-auto max-w-[280px] bg-white px-6 py-6 shadow-[0_22px_50px_rgba(15,23,42,0.14)]">
              <div className="mb-5 flex flex-col items-center text-center">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-sm bg-stone-100 text-stone-600">
                  <Receipt size={22} weight="duotone" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-800">
                  {invoiceTitle || "Tên nhà hàng"}
                </p>
                <p className="mt-2 text-[10px] font-medium text-gray-500">
                  {contactInfo || "Địa chỉ và số điện thoại"}
                </p>
              </div>
              <div className="space-y-3 border-y border-dashed border-gray-200 py-4">
                <div className="flex justify-between text-xs font-semibold text-gray-700">
                  <span>Sườn Nướng BBQ x1</span><span>180,000</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-gray-700">
                  <span>Coca Cola x2</span><span>40,000</span>
                </div>
              </div>
              <div className="space-y-2 border-b border-dashed border-gray-200 py-4">
                <div className="flex justify-between text-xs font-bold text-gray-900">
                  <span>Tạm tính:</span><span>{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-gray-900">
                  <span>VAT ({safeVatRate}%):</span><span>{formatMoney(vatAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-gray-900">
                  <span>Tổng cộng:</span><span>{formatMoney(totalAmount)}</span>
                </div>
              </div>
              <p className="mt-5 text-center text-[10px] font-semibold italic text-slate-400">
                {footerText}
              </p>
            </div>
          </section>

          {/* Form cài đặt hóa đơn */}
          <section className="admin-panel-pad">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500">
                <Receipt size={23} weight="duotone" />
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900">Cài đặt mẫu hóa đơn</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-gray-700">
                  Tiêu đề hóa đơn (Tên nhà hàng)
                  <input
                    type="text" value={invoiceTitle}
                    onChange={(e) => setInvoiceTitle(e.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border border-gray-100 bg-gray-50 px-4 text-sm font-semibold text-gray-700 outline-none transition-colors focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  />
                </label>
                <label className="block text-xs font-bold text-gray-700">
                  Lời chào chân trang
                  <input
                    type="text" value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border border-gray-100 bg-gray-50 px-4 text-sm font-semibold italic text-gray-700 outline-none transition-colors focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  />
                </label>
              </div>

              <label className="block text-xs font-bold text-gray-700">
                Thông tin liên hệ (Địa chỉ/SĐT)
                <textarea
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 outline-none transition-colors focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-gray-400">
                  {saveState === "saved" ? "✓ Đã lưu cấu hình." :
                   saveState === "error" ? "Lưu thất bại." :
                   ""}
                </p>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saveState === "saving"}
                  className="min-h-11 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saveState === "saving" ? "Đang lưu..." : saveState === "saved" ? "Đã lưu ✓" : "Lưu cấu hình"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}

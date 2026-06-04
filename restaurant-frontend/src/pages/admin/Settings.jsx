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
import { formatNumber as formatMoney } from "../../utils/formatters";

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

  const saveLabel = saveState === "saving" ? "Đang lưu..." : saveState === "saved" ? "Đã lưu" : "Lưu cấu hình";
  const qrPreviewUrl = `https://img.vietqr.io/image/${bankId || "VCB"}-${accountNo || "000000"}-compact2.png?amount=${totalAmount}&addInfo=NHWOW%20PREVIEW&accountName=${encodeURIComponent(accountName || "")}`;

  return (
    <Layout>
      <div className="admin-page">
        <header className="admin-header">
          <div>
            <p className="admin-kicker">Cài đặt</p>
            <h1 className="admin-title">Cấu hình hệ thống</h1>
          </div>
          <div className="flex items-center gap-3">
            {saveState === "saved" ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                Đã lưu cấu hình
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={saveState === "saving"}
              className="admin-primary-btn"
            >
              {saveLabel}
            </button>
          </div>
        </header>

        {saveState === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            Lưu thất bại. Vui lòng thử lại.
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] max-w-6xl mx-auto">
          <div className="space-y-4">
            <section className="admin-panel overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Percent size={21} weight="bold" />
                  </span>
                  <h2 className="admin-section-title">Thuế & thanh toán</h2>
                </div>
              </div>

              <div className="grid gap-4 p-5 lg:grid-cols-[220px_1fr]">
                <label className="admin-label">
                  Thuế VAT (%)
                  <div className="mt-1.5 flex min-h-11 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={vatRate}
                      onChange={(e) => setVatRate(e.target.value)}
                      className="min-w-0 flex-1 bg-transparent px-3 text-sm font-bold text-slate-800 outline-none"
                    />
                    <span className="flex items-center border-l border-slate-200 bg-white px-3 text-sm font-black text-slate-400">%</span>
                  </div>
                </label>

                <div>
                  <p className="admin-label mb-1.5">Phương thức thanh toán</p>
                  <div className="grid gap-2 md:grid-cols-3">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => toggleMethod(method.id)}
                          className={`flex min-h-16 items-center justify-between gap-3 rounded-xl border px-3 text-left transition-colors ${
                            method.active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white"
                          }`}
                          aria-pressed={method.active}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Icon size={19} weight="duotone" className="shrink-0" />
                            <span className="truncate text-sm font-black">{method.name}</span>
                          </span>
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${method.active ? "bg-emerald-600" : "bg-slate-300"}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="admin-panel overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Bank size={21} weight="duotone" />
                  </span>
                  <h2 className="admin-section-title">Tài khoản QR</h2>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-3">
                <label className="admin-label">
                  Mã ngân hàng
                  <input
                    type="text"
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    className="admin-field mt-1.5"
                    placeholder="VCB"
                  />
                </label>
                <label className="admin-label">
                  Số tài khoản
                  <input
                    type="text"
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                    className="admin-field mt-1.5"
                  />
                </label>
                <label className="admin-label">
                  Tên chủ tài khoản
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="admin-field mt-1.5"
                  />
                </label>
              </div>
            </section>

            <section className="admin-panel overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Receipt size={21} weight="duotone" />
                  </span>
                  <h2 className="admin-section-title">Mẫu hóa đơn</h2>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="admin-label">
                    Tiêu đề hóa đơn
                    <input
                      type="text"
                      value={invoiceTitle}
                      onChange={(e) => setInvoiceTitle(e.target.value)}
                      className="admin-field mt-1.5"
                    />
                  </label>
                  <label className="admin-label">
                    Lời chào chân trang
                    <input
                      type="text"
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      className="admin-field mt-1.5"
                    />
                  </label>
                </div>

                <label className="admin-label">
                  Thông tin liên hệ
                  <textarea
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    rows={3}
                    className="admin-field mt-1.5 h-auto resize-none py-3"
                  />
                </label>
              </div>
            </section>
          </div>

          <aside className="xl:sticky xl:top-4 h-fit">
            <div className="w-full bg-white px-6 py-6 shadow-[0_22px_50px_rgba(15,23,42,0.12)] rounded-2xl space-y-6 border border-slate-100">
              {/* QR Pay Section (on top) */}
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                    QR Pay
                  </p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black ${enabledMethods.includes("qr") ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                    {enabledMethods.includes("qr") ? "Đang bật" : "Đã tắt"}
                  </span>
                </div>
                <img
                  src={qrPreviewUrl}
                  alt="Xem trước mã QR Pay"
                  className="mx-auto aspect-square w-full rounded-xl bg-slate-50 object-contain p-2"
                />
                <div className="mt-3 space-y-1 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                  <p><span className="text-slate-400">Ngân hàng:</span> {bankId || "VCB"}</p>
                  <p><span className="text-slate-400">Số tài khoản:</span> {accountNo || "000000"}</p>
                  <p><span className="text-slate-400">Số tiền mẫu:</span> {formatMoney(totalAmount)}đ</p>
                </div>
              </div>

              {/* Divider line */}
              <div className="border-t border-dashed border-slate-200"></div>

              {/* Invoice Section (below) */}
              <div>
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
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}

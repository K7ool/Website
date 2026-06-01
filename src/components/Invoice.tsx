"use client";

import { useRef } from "react";

interface InvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  username: string;
  email: string;
  items: { title: string; price: number }[];
  total: number;
  paymentMethod: string;
  createdAt: string;
  paidAt: string;
  licenseKey?: string;
  licenseExpiresAt?: string;
  durationMonths?: number;
}

export default function Invoice({ data }: { data: InvoiceData }) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>Invoice ${data.invoiceNumber}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=Cairo:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Tajawal', 'Cairo', sans-serif;
            background: #0a0a0f;
            color: #e2e8f0;
            direction: rtl;
            padding: 40px;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 16px;
            padding: 48px;
            position: relative;
            overflow: hidden;
          }
          .watermark {
            position: absolute;
            top: 50%;
            right: 50%;
            transform: translate(50%, -50%) rotate(-30deg);
            font-size: 120px;
            font-weight: 900;
            color: rgba(139, 92, 246, 0.04);
            white-space: nowrap;
            pointer-events: none;
            letter-spacing: 20px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 24px;
            border-bottom: 2px solid rgba(139, 92, 246, 0.15);
          }
          .brand h1 {
            font-size: 28px;
            font-weight: 900;
            background: linear-gradient(135deg, #a78bfa, #60a5fa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .brand p {
            font-size: 12px;
            color: #64748b;
            margin-top: 4px;
          }
          .invoice-title {
            text-align: left;
          }
          .invoice-title h2 {
            font-size: 24px;
            font-weight: 700;
            color: #a78bfa;
          }
          .invoice-title p {
            font-size: 12px;
            color: #64748b;
          }
          .badge {
            display: inline-block;
            padding: 4px 16px;
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.3);
            border-radius: 20px;
            color: #22c55e;
            font-size: 12px;
            font-weight: 500;
            margin-top: 8px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 32px;
            padding: 20px;
            background: rgba(139, 92, 246, 0.05);
            border-radius: 12px;
            border: 1px solid rgba(139, 92, 246, 0.1);
          }
          .info-group h4 {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 4px;
          }
          .info-group p {
            font-size: 14px;
            color: #e2e8f0;
            font-weight: 500;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          th {
            text-align: right;
            padding: 12px 16px;
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid rgba(139, 92, 246, 0.15);
          }
          td {
            padding: 12px 16px;
            font-size: 14px;
            color: #e2e8f0;
            border-bottom: 1px solid rgba(139, 92, 246, 0.08);
          }
          .total-row td {
            font-weight: 700;
            color: #a78bfa;
            font-size: 16px;
            border-bottom: none;
          }
          .total-row td:last-child {
            font-size: 20px;
          }
          .stamp {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 2px solid rgba(139, 92, 246, 0.15);
          }
          .stamp-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 3px solid rgba(139, 92, 246, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 700;
            color: rgba(139, 92, 246, 0.5);
            text-align: center;
            line-height: 1.3;
            transform: rotate(-15deg);
          }
          .stamp-text {
            font-size: 12px;
            color: #64748b;
          }
          .footer {
            text-align: center;
            margin-top: 32px;
            font-size: 11px;
            color: #475569;
          }
          @media print {
            body { padding: 0; background: #0a0a0f; }
            .invoice-container { box-shadow: none; border: 1px solid #333; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="watermark">${data.invoiceNumber}</div>
          <div class="header">
            <div class="brand">
              <h1>Flipp Studios</h1>
              <p>Roblox Development &middot; Premium Solutions</p>
            </div>
            <div class="invoice-title">
              <h2>فاتورة / INVOICE</h2>
              <p>${data.invoiceNumber}</p>
              <div class="badge">مدفوع / PAID</div>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-group">
              <h4>العميل / Customer</h4>
              <p>${data.username}</p>
              <p style="font-size:12px;color:#64748b">${data.email}</p>
            </div>
            <div class="info-group">
              <h4>تفاصيل الفاتورة / Invoice Details</h4>
              <p>الطلب: ${data.orderNumber}</p>
              <p style="font-size:12px;color:#64748b">التاريخ: ${new Date(data.createdAt).toLocaleDateString("ar-EG")}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>المنتج / Product</th>
                <th style="text-align:left">السعر / Price</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map((item) => `
                <tr>
                  <td>${item.title}</td>
                  <td style="text-align:left">$${item.price.toFixed(2)}</td>
                </tr>
              `).join("")}
              <tr class="total-row">
                <td>المجموع / Total</td>
                <td style="text-align:left">$${data.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;padding:16px;background:rgba(139,92,246,0.03);border-radius:8px">
            <div>
              <p style="font-size:11px;color:#64748b;margin-bottom:2px">طريقة الدفع / Payment Method</p>
              <p style="font-size:14px;color:#e2e8f0;font-weight:500">${data.paymentMethod === "discord" ? "Discord" : "Vodafone Cash"}</p>
            </div>
            <div>
              <p style="font-size:11px;color:#64748b;margin-bottom:2px">تاريخ الدفع / Paid Date</p>
              <p style="font-size:14px;color:#e2e8f0;font-weight:500">${new Date(data.paidAt).toLocaleDateString("ar-EG")}</p>
            </div>
          </div>
          ${data.licenseKey ? `
          <div style="margin-bottom:24px;padding:16px;background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);border-radius:12px;text-align:center">
            <p style="font-size:11px;color:#64748b;margin-bottom:4px">رخصة المنتج / Product License</p>
            <p style="font-size:20px;font-weight:700;color:#a78bfa;letter-spacing:2px;font-family:monospace">${data.licenseKey}</p>
            ${data.licenseExpiresAt ? `<p style="font-size:12px;color:#64748b;margin-top:4px">تنتهي / Expires: ${new Date(data.licenseExpiresAt).toLocaleDateString("ar-EG")} (${data.durationMonths || 0} شهر/أشهر)</p>` : ""}
          </div>` : ""}
          <div class="stamp">
            <div class="stamp-circle">Flipp Studios<br>معتمد</div>
            <div class="stamp-text">هذه الفاتورة معتمدة ورسمية<br>This invoice is official and verified</div>
          </div>
          <div class="footer">
            Flipp Studios &middot; Roblox Development &middot; ${data.invoiceNumber}
          </div>
        </div>
        <div class="no-print" style="text-align:center;margin-top:20px">
          <button onclick="window.print()" style="padding:12px 32px;background:linear-gradient(135deg,#7c3aed,#3b82f6);color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:'Tajawal',sans-serif;">
            تحميل PDF / Download PDF
          </button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <button
      onClick={handlePrint}
      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all"
    >
      Download Invoice
    </button>
  );
}

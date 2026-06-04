function wrapper(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="480" cellpadding="0" cellspacing="0" style="background:#12121a;border-radius:16px;border:1px solid rgba(147,51,234,0.15);overflow:hidden">
<tr><td style="padding:32px 32px 16px" align="center">
<img src="https://raw.githubusercontent.com/K7ool/Website/main/public/logo.png" alt="Flipp Studios" width="48" height="48" style="border-radius:12px;margin-bottom:12px"/>
<h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 4px">Flipp Studios</h1>
<p style="color:#a0a0b0;font-size:13px;margin:0">${title}</p>
</td></tr>
<tr><td style="padding:16px 32px">
${body}
</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid rgba(147,51,234,0.1)" align="center">
<p style="color:#555;font-size:11px;margin:0 0 8px">Flipp Studios — Premium Roblox Assets</p>
<p style="color:#555;font-size:11px;margin:0">
Need help? <a href="mailto:support@flippstudios.com" style="color:#a78bfa;text-decoration:none">support@flippstudios.com</a>
</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}

export function licenseDeliveredTemplate(data: {
  customerName: string;
  productName: string;
  licenseKey: string;
  orderNumber: string;
}): string {
  return wrapper("License Delivered", `
<p style="color:#c0c0d0;font-size:14px;line-height:1.6;margin:0 0 16px">Hi ${data.customerName},</p>
<p style="color:#c0c0d0;font-size:14px;line-height:1.6;margin:0 0 16px">Your payment for <strong style="color:#fff">${data.productName}</strong> has been approved! Your license key is ready.</p>
<div style="background:#0a0a14;border-radius:12px;padding:16px;margin:0 0 16px;text-align:center;border:1px solid rgba(147,51,234,0.2)">
<p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">License Key</p>
<code style="color:#a78bfa;font-size:18px;font-weight:700;letter-spacing:2px">${data.licenseKey}</code>
</div>
<p style="color:#c0c0d0;font-size:14px;line-height:1.6;margin:0 0 8px">Order: <span style="color:#888">${data.orderNumber}</span></p>
<p style="color:#c0c0d0;font-size:14px;line-height:1.6;margin:0">You can view your license and download files in your <a href="https://flippstudios.com/dashboard/licenses" style="color:#a78bfa;text-decoration:none">dashboard</a>.</p>
`);
}

export function paymentRejectedTemplate(data: {
  customerName: string;
  productName: string;
  orderNumber: string;
}): string {
  return wrapper("Payment Rejected", `
<p style="color:#c0c0d0;font-size:14px;line-height:1.6;margin:0 0 16px">Hi ${data.customerName},</p>
<p style="color:#c0c0d0;font-size:14px;line-height:1.6;margin:0 0 16px">Unfortunately, your payment for <strong style="color:#fff">${data.productName}</strong> (${data.orderNumber}) has been rejected.</p>
<p style="color:#c0c0d0;font-size:14px;line-height:1.6;margin:0 0 16px">This could be due to an invalid receipt or incorrect payment amount. Please contact us for more details.</p>
<p style="color:#c0c0d0;font-size:14px;line-height:1.6;margin:0">You can try again on our <a href="https://flippstudios.com/products" style="color:#a78bfa;text-decoration:none">products page</a>.</p>
`);
}

export function orderCompletedTemplate(data: {
  customerName: string;
  productName: string;
  orderNumber: string;
}): string {
  return wrapper("Order Completed", `
<p style="color:#c0c0d0;font-size:14px;line-height:1.6;margin:0 0 16px">Hi ${data.customerName},</p>
<p style="color:#c0c0d0;font-size:14px;line-height:1.6;margin:0 0 16px">Your order for <strong style="color:#fff">${data.productName}</strong> (${data.orderNumber}) has been completed!</p>
<p style="color:#c0c0d0;font-size:14px;line-height:1.6;margin:0">You can view your order details in your <a href="https://flippstudios.com/dashboard/orders" style="color:#a78bfa;text-decoration:none">dashboard</a>.</p>
`);
}

export function orderRefundedTemplate(data: {
  customerName: string;
  productName: string;
  orderNumber: string;
}): string {
  return wrapper("Order Refunded", `
<p style="color:#c0c0d0;font-size:14px;line-height:1.6;margin:0 0 16px">Hi ${data.customerName},</p>
<p style="color:#c0c0d0;font-size:14px;line-height:1.6;margin:0 0 16px">Your order for <strong style="color:#fff">${data.productName}</strong> (${data.orderNumber}) has been refunded.</p>
<p style="color:#c0c0d0;font-size:14px;line-height:1.6;margin:0">If you have any questions, feel free to <a href="https://flippstudios.com/contact" style="color:#a78bfa;text-decoration:none">contact us</a>.</p>
`);
}

export function orderCancelledTemplate(data: {
  customerName: string;
  productName: string;
  orderNumber: string;
}): string {
  return wrapper("Order Cancelled", `
<p style="color:#c0c0d0;font-size:14px;line-height:1.6;margin:0 0 16px">Hi ${data.customerName},</p>
<p style="color:#c0c0d0;font-size:14px;line-height:1.6;margin:0 0 16px">Your order for <strong style="color:#fff">${data.productName}</strong> (${data.orderNumber}) has been cancelled.</p>
<p style="color:#c0c0d0;font-size:14px;line-height:1.6;margin:0">If you did not request this, please <a href="https://flippstudios.com/contact" style="color:#a78bfa;text-decoration:none">contact support</a>.</p>
`);
}

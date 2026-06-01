import LegalPage from "@/components/LegalPage";
import type { LegalSection } from "@/lib/types";

const DEFAULT_SECTIONS: LegalSection[] = [
  {
    heading: "Acceptance of Terms",
    content: `By accessing or using the Flipp Studios website and purchasing digital products, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use our services.

We reserve the right to update, modify, or replace any part of these terms at our sole discretion. Continued use of the website after changes constitutes acceptance of the new terms.

These terms apply to all visitors, users, customers, and any other person accessing or using our services.`
  },
  {
    heading: "Digital Products",
    content: `All products listed on Flipp Studios are digital goods delivered electronically. No physical items are shipped as part of any purchase.

- Products are licensed, not sold. You receive a license to use the product, not ownership of the underlying intellectual property.
- Upon successful payment confirmation and order approval, you will receive access to download the purchased digital files.
- Product files may include Roblox scripts, models, UI systems, audio files, and other digital assets designed for use within the Roblox platform.
- Product availability, pricing, and specifications are subject to change without prior notice.
- Some products may require additional setup, configuration, or dependencies to function correctly. These requirements are documented on each product page.`
  },
  {
    heading: "License Usage",
    content: `Each purchase grants a single-user, non-exclusive, non-transferable license to use the product in your Roblox games and projects.

- License keys follow the format FLIPP-XXXX-XXXX-XXXX and are unique to each purchase.
- Licenses may include an expiration date. Upon expiration, access to downloads and updates may be limited.
- You may use the product in commercial Roblox experiences that generate revenue.
- You may modify the source code for your own use.
- Redistribution of the original or modified source code is strictly prohibited.
- Reselling, sub-licensing, or sharing license keys with third parties is strictly prohibited.
- Attempting to bypass license verification systems will result in immediate revocation.
- The license is tied to your account and cannot be transferred to another user.`
  },
  {
    heading: "User Accounts",
    content: `To purchase products and access your downloads, you must create an account on Flipp Studios.

- You are responsible for maintaining the confidentiality of your account credentials.
- You are responsible for all activity that occurs under your account.
- You must provide accurate, current, and complete information during registration.
- You must notify us immediately of any unauthorized use of your account.
- We reserve the right to suspend or terminate accounts that violate these terms.
- Account sharing is not permitted. Each account must be used by a single individual.
- You may delete your account at any time by contacting support, though this may affect access to purchased products.`
  },
  {
    heading: "Payments",
    content: `All prices are listed in USD (United States Dollars) unless otherwise stated.

- Payments are processed through our supported payment methods including Discord-based invoicing and Vodafone Cash (for applicable regions).
- Your order will be reviewed and approved by our admin team after payment confirmation.
- We reserve the right to refuse or cancel any order at our discretion.
- Prices may change at any time, but changes will not affect orders that have already been approved.
- It is your responsibility to ensure the correct product and quantity are selected before completing payment.
- Receipts or payment proofs must be submitted through the checkout process for order verification.`
  },
  {
    heading: "Intellectual Property",
    content: `All digital products, content, designs, code, documentation, and materials available on Flipp Studios are the intellectual property of Flipp Studios unless otherwise stated.

- You may not claim ownership of any product, code, or asset purchased from Flipp Studios.
- You may not remove or alter any copyright notices, watermarks, or attribution from product files.
- You may not distribute, sell, lease, rent, or sublicense any product to third parties.
- The Flipp Studios name, logo, and branding are trademarks and may not be used without prior written permission.
- Custom development work commissioned through Flipp Studios will be governed by the specific terms agreed upon in the project contract.`
  },
  {
    heading: "Product Updates",
    content: `Flipp Studios may provide updates, patches, or improvements to products at our discretion.

- Purchased products include lifetime updates for the duration of the active license.
- Updates are delivered digitally through your Flipp Studios dashboard.
- We are not obligated to provide updates for any specific duration unless otherwise stated.
- Major version changes or feature additions may be released as new products at a separate price.
- We reserve the right to discontinue support for any product at any time, with or without notice.
- Legacy versions of products will remain available for download even if support is discontinued.`
  },
  {
    heading: "Prohibited Activities",
    content: `When using our website, products, or services, you agree not to:

- Violate any applicable laws or regulations.
- Infringe upon the intellectual property rights of others.
- Distribute, resell, or share product files, license keys, or account access.
- Attempt to reverse engineer, decompile, or extract source code from products beyond what is provided.
- Use our products in any project that promotes hate speech, violence, illegal activities, or explicit content.
- Interfere with or disrupt the security, integrity, or performance of our website.
- Create multiple accounts for the purpose of evading purchase restrictions or license limits.
- Use automated scripts, bots, or scraping tools to access or interact with our website.`
  },
  {
    heading: "Account Suspension",
    content: `We reserve the right to suspend or terminate your account and revoke all licenses immediately without prior notice if:

- You violate any term of this agreement.
- You engage in fraudulent activity, including chargeback abuse or payment disputes.
- You share, redistribute, or resell purchased products or license keys.
- You attempt to bypass security measures or license verification systems.
- Your account is found to be involved in any prohibited activities.

Upon suspension or termination, all access to purchased products, downloads, and licenses will be revoked. No refunds will be provided for accounts terminated due to policy violations.`
  },
  {
    heading: "Limitation of Liability",
    content: `Flipp Studios and its owners, operators, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from:

- The use or inability to use any purchased product.
- Any loss of data, profits, or business opportunities.
- Any unauthorized access to or alteration of your data.
- Any bugs, errors, or vulnerabilities in products.
- Any third-party services integrated with our products.

Our total liability for any claim arising from these terms or the use of our products shall not exceed the amount paid by you for the specific product giving rise to the claim.

Products are provided "as is" without warranty of any kind, either express or implied, including but not limited to fitness for a particular purpose.`
  },
  {
    heading: "Support Policy",
    content: `We provide support for all purchased products through our ticket system and Discord community.

- Support covers installation assistance, bug fixes, and basic usage guidance.
- Custom modifications, feature additions, or extensive configuration assistance may be quoted separately.
- Support is provided on a best-effort basis and response times may vary.
- We reserve the right to refuse support for modified or improperly implemented products.
- Community support via Discord allows users to help each other and share knowledge.
- Critical bug fixes are prioritized and addressed as quickly as possible.`
  },
  {
    heading: "Custom Work Terms",
    content: `For custom development projects commissioned through Flipp Studios:

- A deposit is required before work begins. The deposit amount will be specified in the project quote.
- Deposit payments are non-refundable once work has commenced.
- The final payment is due upon completion and delivery of the project.
- Project timelines are estimates and may be adjusted based on scope changes or unforeseen challenges.
- You retain full ownership of custom code written specifically for your project.
- We reserve the right to reuse generalized code, systems, and patterns that are not unique to your project.
- Additional revisions beyond the agreed scope may incur extra charges.
- Communication and feedback delays may affect project timelines.
- We reserve the right to decline any custom project request.`
  },
  {
    heading: "Modifications to Terms",
    content: `We reserve the right to update, change, or replace any part of these Terms of Service at any time.

- Changes will be posted on this page with an updated "Last updated" date.
- It is your responsibility to check this page periodically for changes.
- Your continued use of the website following any changes constitutes acceptance of the new terms.
- For significant changes, we may provide additional notice through our website or Discord server.
- If you do not agree with any changes, you must stop using our services and contact support regarding any affected purchases.`
  },
  {
    heading: "Contact Information",
    content: `If you have any questions about these Terms of Service, please contact us:

- Email: support@flippstudios.com
- Discord: Join our Discord server for community support
- Support Tickets: Open a ticket through your dashboard

We aim to respond to all inquiries within 24-48 business hours.`
  }
];

export default function TermsPage() {
  return <LegalPage type="terms" title="Terms of Service" defaultSections={DEFAULT_SECTIONS} />;
}

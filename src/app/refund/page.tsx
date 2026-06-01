import LegalPage from "@/components/LegalPage";
import type { LegalSection } from "@/lib/types";

const DEFAULT_SECTIONS: LegalSection[] = [
  {
    heading: "Digital Product Nature",
    content: `All products sold on Flipp Studios are digital goods delivered electronically. Due to the nature of digital products, we maintain a limited refund policy.

- Digital products can be instantly copied and downloaded, making traditional returns impossible.
- By purchasing a digital product, you acknowledge and accept that the product cannot be "returned" in the physical sense.
- We encourage all customers to carefully review product descriptions, features, compatibility requirements, and screenshots before making a purchase.
- If you are unsure whether a product meets your needs, please contact our support team before purchasing.`
  },
  {
    heading: "Eligible Refund Cases",
    content: `Refunds may be granted in the following circumstances:

- Product not delivered: If the product files are not delivered within 48 hours of payment approval and no communication has been provided regarding the delay.
- Product completely unusable: If the product is fundamentally broken and cannot be used for its intended purpose, provided that our support team has been given a reasonable opportunity to resolve the issue.
- Duplicate payment: If you were charged multiple times for the same product due to a system error.
- Product significantly not as described: If the product materially differs from its description on the product page and the issue cannot be resolved through support.

In all cases, refund requests must be submitted within 14 days of purchase.`
  },
  {
    heading: "Non-Refundable Cases",
    content: `The following situations do not qualify for a refund:

- Change of mind after the product has been downloaded.
- The product does not work with unsupported third-party systems or modifications.
- Compatibility issues that were clearly stated in the product description.
- Inability to install or configure the product due to lack of technical knowledge, when documentation and support are available.
- Requesting a refund to purchase a different product as an alternative.
- Products that have been modified, reverse-engineered, or tampered with.
- License keys that have been activated or used.
- Products purchased during a sale or promotional period are subject to the same refund policy.
- Time elapsed exceeds 14 days from the purchase date.`
  },
  {
    heading: "Duplicate Purchases",
    content: `If you accidentally purchase the same product twice, we will refund the duplicate payment in full.

- Duplicate purchase refunds are processed within 5-7 business days.
- Please contact support with your order details to initiate a duplicate purchase refund.
- Only the duplicate transaction will be refunded, not the original purchase.
- If you purchased the same product for multiple accounts, each purchase is considered a separate transaction and is not eligible for a duplicate refund.`
  },
  {
    heading: "Technical Issues",
    content: `If you experience technical issues with a purchased product, we encourage you to first contact our support team for assistance.

- Most technical issues can be resolved through our support channels, including installation guidance and bug fixes.
- If our support team determines that the product has a fundamental defect that cannot be resolved, a refund may be considered.
- Refunds for technical issues are evaluated on a case-by-case basis.
- To qualify for a refund due to technical issues, you must:
  - Have contacted support and allowed reasonable time for resolution
  - Provide clear documentation of the issue (screenshots, error messages, etc.)
  - Demonstrate that the issue is not caused by your own modifications or incompatible third-party systems`
  },
  {
    heading: "Custom Development Refunds",
    content: `Custom development projects commissioned through Flipp Studios are subject to a separate refund policy:

- Deposits paid for custom development projects are non-refundable once work has begun.
- If the project has not yet started and no work has been performed, the deposit may be refunded minus any administrative fees.
- If we are unable to deliver the agreed-upon project scope, you may be entitled to a partial or full refund of payments made.
- Refunds for custom projects are evaluated on a case-by-case basis and are governed by the specific terms in your project agreement.
- Disputes regarding custom work quality or deliverables will be resolved through discussion and, if necessary, arbitration.

We recommend discussing all project requirements thoroughly before commissioning custom work to ensure mutual understanding of the scope and deliverables.`
  },
  {
    heading: "Chargebacks",
    content: `Filing a chargeback with your payment provider without first contacting us may result in the following:

- Immediate suspension of your account and all associated licenses.
- Permanent revocation of access to all purchased products.
- Reporting to relevant fraud prevention databases.
- Legal action may be pursued for fraudulent chargebacks.

If you have a legitimate issue with a purchase, please contact our support team first. We are committed to resolving disputes fairly and will work with you to find a satisfactory solution.

Initiating a chargeback after receiving and using a product is considered fraud and will be pursued to the fullest extent of the law.`
  },
  {
    heading: "Refund Request Process",
    content: `To request a refund, please follow these steps:

1. Contact our support team through your dashboard or email us at support@flippstudios.com
2. Include your order number and the reason for your refund request
3. Provide any relevant details, screenshots, or documentation
4. Allow 3-5 business days for your request to be reviewed

Our team will evaluate your request and notify you of the decision. If approved:

- Refunds are processed to the original payment method
- Please allow 5-10 business days for the refund to appear in your account
- Upon refund, access to the purchased product and any associated licenses will be revoked
- Invoices will be marked as refunded and adjusted accordingly

We reserve the right to deny refund requests that do not meet the criteria outlined in this policy.`
  }
];

export default function RefundPage() {
  return <LegalPage type="refund" title="Refund Policy" defaultSections={DEFAULT_SECTIONS} />;
}

import LegalPage from "@/components/LegalPage";
import type { LegalSection } from "@/lib/types";

const DEFAULT_SECTIONS: LegalSection[] = [
  {
    heading: "Information We Collect",
    content: `When you use Flipp Studios, we collect certain information to provide and improve our services. This information falls into the following categories:

- Information you provide directly to us
- Information collected automatically when you use our website
- Information from third-party services you choose to connect

We only collect information that is necessary for the operation of our marketplace and to provide you with the best possible experience.`
  },
  {
    heading: "Account Information",
    content: `When you create an account on Flipp Studios, we collect:

- Email address (required for account creation and communication)
- Username (displayed on your public profile)
- Display name (optional, shown on your profile)
- Avatar image (optional, uploaded by you)
- Discord ID (if you choose to connect your Discord account)
- Account creation date and last login timestamp

Your username, display name, avatar, and certain profile details are visible to other users if your privacy settings allow public profile visibility. Your email address is never shared publicly.`
  },
  {
    heading: "Payment Information",
    content: `We do not store full payment card details on our servers. Payment information is handled as follows:

- Payment receipts and transaction records are stored for order verification and accounting purposes.
- Vodafone Cash transaction references or Discord payment confirmations may be stored as proof of payment.
- Invoice records containing your name, email, and purchased items are generated and stored for tax and record-keeping purposes.
- Your payment history is visible to you in your dashboard and to our admin team for order management.
- We do not sell, share, or transmit your payment information to third parties except as required for payment processing.`
  },
  {
    heading: "Product Usage Data",
    content: `We collect data related to your use of purchased products to improve our services and detect abuse:

- Download history: Which products you downloaded and when
- License activations: When and how license keys are used
- Product interactions: Features used within products (if applicable)
- Support tickets: Communication related to product support

This information helps us understand how our products are used, identify bugs, and prevent license sharing or unauthorized distribution.`
  },
  {
    heading: "Cookies",
    content: `Flipp Studios uses cookies and similar tracking technologies to enhance your browsing experience:

- Essential cookies: Required for authentication and basic site functionality
- Session cookies: Maintain your login state during your visit
- Preference cookies: Remember your settings and preferences
- Analytics cookies: Help us understand how visitors interact with our website (if applicable)

You can control cookie preferences through your browser settings. Disabling certain cookies may affect site functionality. We do not use cookies for targeted advertising or tracking across third-party websites.`
  },
  {
    heading: "How We Use Data",
    content: `We use the collected information for the following purposes:

- To create and maintain your account
- To process and fulfill your orders
- To provide product downloads and license management
- To communicate with you about your orders, support tickets, and account
- To improve our products, website, and services
- To detect and prevent fraud, abuse, and policy violations
- To provide customer support and technical assistance
- To send important service updates and security notifications
- To comply with legal obligations and enforce our terms

We do not sell your personal information to third parties. We do not use your data for advertising or marketing purposes without your explicit consent.`
  },
  {
    heading: "Data Protection",
    content: `We take the security of your data seriously and implement appropriate measures:

- All data transmitted between your browser and our servers is encrypted using HTTPS/SSL.
- Passwords are hashed and salted using industry-standard algorithms (Firebase Authentication).
- Access to user data is restricted to authorized personnel only.
- We use Firebase's enterprise-grade security infrastructure for data storage.
- Regular security audits and updates are performed to maintain platform security.
- Despite our best efforts, no method of electronic storage is 100% secure. We cannot guarantee absolute security.

In the event of a data breach that affects your personal information, we will notify you within 72 hours as required by applicable regulations.`
  },
  {
    heading: "Third Party Services",
    content: `Flipp Studios uses the following third-party services to operate:

- Firebase (Google): Authentication, Firestore database, hosting
- Supabase: File storage for avatars, receipts, and product files
- Discord: Community communication and payment verification
- Vodafone Cash: Payment processing (for applicable regions)

These third-party services have their own privacy policies governing the handling of your data. We encourage you to review their policies:

- Firebase Privacy Policy: https://firebase.google.com/support/privacy
- Supabase Privacy Policy: https://supabase.com/privacy
- Discord Privacy Policy: https://discord.com/privacy

We are not responsible for the privacy practices of these third-party services.`
  },
  {
    heading: "User Rights",
    content: `Depending on your jurisdiction, you may have the following rights regarding your personal data:

- Right to access: Request a copy of the personal data we hold about you
- Right to rectification: Request correction of inaccurate or incomplete data
- Right to deletion: Request deletion of your personal data (subject to legal obligations)
- Right to restrict processing: Request limitation of how we use your data
- Right to data portability: Request transfer of your data to another service
- Right to object: Object to certain processing activities

To exercise any of these rights, please contact us through our support channels. We will respond to your request within 30 days as required by applicable regulations.

Note that deletion of your account data may affect your access to purchased products and license information.`
  },
  {
    heading: "Data Retention",
    content: `We retain your personal data for as long as your account is active or as needed to provide our services.

- Account data: Retained until account deletion or 12 months of inactivity
- Order records: Retained for 6 years for tax and accounting purposes (as required by law)
- Support tickets: Retained for 3 years after resolution
- License records: Retained for the duration of the license plus 2 years
- Payment records: Retained for 6 years for financial compliance
- Analytics data: Retained in aggregated form indefinitely

After the retention period expires, your data will be securely deleted or anonymized. You may request earlier deletion of your data by contacting support.`
  },
  {
    heading: "Contact Information",
    content: `If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:

- Email: support@flippstudios.com
- Discord: Join our Discord server
- Support Tickets: Open a ticket through your account dashboard

We are committed to resolving any privacy concerns promptly and transparently.`
  }
];

export default function PrivacyPage() {
  return <LegalPage type="privacy" title="Privacy Policy" defaultSections={DEFAULT_SECTIONS} />;
}

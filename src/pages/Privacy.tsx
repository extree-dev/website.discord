import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../module_pages/Privacy.module.scss';

const Privacy: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <div className={styles.layout}>
            <main className={`${styles.main} ${styles.privacyPage}`}>
                <header className={styles.header}>
                    <h1>Privacy Policy - Sentinel LLC Moderator Panels</h1>
                </header>

                <div className={styles.content}>
                    <div className={styles.intro}>
                        <p>
                            Your privacy is important to Sentinel LLC. This Privacy Policy outlines how we collect, use, store, and protect your personal information when accessing and using the Moderator Panel. By using the Panel, you consent to the practices described herein.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h2>1. Information We Collect</h2>
                        <p>We may collect the following data:</p>
                        <ul>
                            <li>Discord account username and unique ID.</li>
                            <li>Moderator actions, logs, and activity within the Panel.</li>
                            <li>IP addresses, device type, and browser information.</li>
                            <li>Communications with support or system notifications.</li>
                            <li>Data from third-party integrations (e.g., cloud hosting, analytics).</li>
                        </ul>
                    </div>

                    <div className={styles.section}>
                        <h2>2. How We Use Your Information</h2>
                        <p>Your data is processed strictly for:</p>
                        <ul>
                            <li>Maintaining, operating, and improving the Moderator Panel.</li>
                            <li>Server moderation and content management within Discord.</li>
                            <li>Security monitoring and fraud prevention.</li>
                            <li>Compliance with applicable laws and regulations (EU GDPR, Russian Federal Law No. 152-FZ).</li>
                            <li>Providing support and resolving user inquiries.</li>
                        </ul>
                    </div>

                    <div className={styles.section}>
                        <h2>3. Data Storage & Security</h2>
                        <p>
                            We implement industry-standard technical and organizational measures to protect your data against unauthorized access, disclosure, alteration, and destruction. Data is stored securely in compliant servers located in jurisdictions aligned with GDPR and Russian law.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h2>4. Sharing of Information</h2>
                        <p>
                            Personal information is shared only under the following circumstances:
                        </p>
                        <ul>
                            <li>When legally required by governmental or law enforcement authorities.</li>
                            <li>To protect Sentinel LLC's legal rights or property.</li>
                            <li>With explicit user consent.</li>
                            <li>Third-party service providers under strict confidentiality agreements (e.g., hosting, analytics, security services).</li>
                        </ul>
                    </div>

                    <div className={styles.section}>
                        <h2>5. Cookies & Tracking</h2>
                        <p>
                            The Panel may use cookies, local storage, and analytics tools to enhance functionality and monitor system performance. No personally identifiable information is sold or disclosed via tracking. You may manage cookie preferences through your browser settings.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h2>6. Rights of Users</h2>
                        <p>
                            In accordance with GDPR and applicable law, you have the right to:
                        </p>
                        <ul>
                            <li>Access your personal data stored in the Panel.</li>
                            <li>Request correction or deletion of your data.</li>
                            <li>Request portability of your personal data in a structured, commonly used format.</li>
                            <li>Withdraw consent for processing at any time.</li>
                            <li>Lodge a complaint with a supervisory authority if you believe your data is mishandled.</li>
                        </ul>
                    </div>

                    <div className={styles.section}>
                        <h2>7. Data Retention</h2>
                        <p>
                            Personal data is retained only as long as necessary for moderation, legal compliance, or resolving disputes. Obsolete data is securely deleted or anonymized.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h2>8. Children's Privacy</h2>
                        <p>
                            The Panel is not intended for users under 13 years old. We do not knowingly collect personal data from children. If you are under 13, please do not use the Panel.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h2>9. Updates to This Policy</h2>
                        <p>
                            We may update this Privacy Policy periodically. All changes will be posted on this page. Continued use of the Panel constitutes acceptance of the revised Privacy Policy.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h2>10. Contact Information</h2>
                        <div className={styles.contactInfo}>
                            <p>
                                If you have any questions or concerns regarding this Privacy Policy or the handling of your data, please contact us at <a href="mailto:privacy@sentinel.com" className={styles.link}>privacy@sentinel.com</a>.
                            </p>
                        </div>
                    </div>

                    <div className={styles.legalNote}>
                        <p>
                            This Privacy Policy complies with the European Union's General Data Protection Regulation (GDPR) and Russian Federal Law No. 152-FZ "On Personal Data".
                        </p>
                    </div>

                    <footer className={styles.footer}>
                        <p>© {currentYear} Sentinel LLC. All rights reserved.</p>
                    </footer>
                </div>
            </main>
        </div>
    );
};

export default Privacy;
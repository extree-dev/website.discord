import React from 'react';
import '../components/CSS/Terms.css';

const Terms: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <div className="mp-layout">
            <main className="mp-main terms-page">
                <header className="mp-header">
                    <h1>Terms of Service — Sentinel LLC Moderator Panels</h1>
                </header>

                <div className="terms-content">
                    <div className="terms-intro">
                        <p>
                            Welcome to the Sentinel LLC Moderator Panel ("Panel"). By accessing or using our Panel, you agree to comply with these Terms of Service and all applicable laws. If you do not agree with any part of these terms, you must not use the Panel.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>1. Acceptance of Terms</h2>
                        <p>
                            Access to the Panel is granted subject to these Terms. By using the Panel, you acknowledge that you have read, understood, and agree to these Terms, including any future updates.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>2. Eligibility</h2>
                        <p>
                            Only authorized moderators or administrators of Discord servers may use the Panel. You must be at least 18 years old and possess a valid Discord account. Access is granted only with explicit permission from Sentinel LLC or the server owner.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>3. Account Security</h2>
                        <p>
                            You are responsible for maintaining the confidentiality of your login credentials. All activities conducted through your account are your responsibility. Any unauthorized access must be reported immediately to Sentinel LLC.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>4. Moderator Responsibilities</h2>
                        <p>While using the Panel, you agree to:</p>
                        <ul>
                            <li>Follow the rules of the Discord server you moderate.</li>
                            <li>Perform moderation actions only within the scope of your permissions.</li>
                            <li>Not abuse your moderator privileges.</li>
                            <li>Respect the privacy and rights of all users.</li>
                            <li>Report illegal, harmful, or malicious content immediately.</li>
                        </ul>
                    </div>

                    <div className="terms-section">
                        <h2>5. Prohibited Actions</h2>
                        <p>You may not:</p>
                        <ul>
                            <li>Engage in harassment, discrimination, or illegal activities.</li>
                            <li>Share sensitive data of users or moderators.</li>
                            <li>Distribute malware or attempt unauthorized access.</li>
                            <li>Circumvent security controls or logging mechanisms.</li>
                        </ul>
                    </div>

                    <div className="terms-section">
                        <h2>6. Data Privacy & Compliance</h2>
                        <p>
                            Sentinel LLC processes personal data in compliance with GDPR and Russian Federal Law No. 152-FZ. Data collected may include your Discord username, activity logs, and moderation actions.
                        </p>
                        <p>
                            Data is stored securely and is used strictly for moderation purposes. It will not be shared with third parties without consent. You may request access or deletion of your personal data where permitted by law. For more details, see our <a href="/privacy" className="terms-link">Privacy Policy</a>.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>7. Intellectual Property</h2>
                        <p>
                            All Panel software, designs, logos, and content are owned by Sentinel LLC. Unauthorized copying, modification, distribution, or reverse engineering is strictly prohibited.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>8. Limitation of Liability</h2>
                        <p>
                            The Panel is provided "as is". Sentinel LLC is not liable for any direct, indirect, incidental, or consequential damages arising from the use or inability to use the Panel.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>9. Termination</h2>
                        <p>
                            Sentinel LLC may revoke your access at any time for violations of these Terms. Certain obligations, including confidentiality and compliance, survive termination.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>10. Governing Law & Dispute Resolution</h2>
                        <p>
                            These Terms are governed by the laws of the Russian Federation. Any disputes shall first be resolved informally. If unresolved, legal action may be pursued in the applicable jurisdiction.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>11. Updates to Terms</h2>
                        <p>
                            Sentinel LLC may update these Terms at any time. Changes are effective immediately upon posting. Continued use of the Panel constitutes acceptance of updated Terms.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>12. Acknowledgment</h2>
                        <p>
                            By using the Panel, you acknowledge that you have read, understood, and agreed to these Terms of Service.
                        </p>
                    </div>

                    <footer className="terms-footer">
                        <p>© {currentYear} Sentinel LLC. All rights reserved.</p>
                    </footer>
                </div>
            </main>
        </div>
    );
};

export default Terms;

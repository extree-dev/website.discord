// components/BotInvite.tsx
import React from 'react';
import { Bot, ArrowRight, Shield, Users, MessageCircle } from 'lucide-react';
import styles from '../styles/components/BotInvite.module.scss';

interface BotInviteProps {
    serverId?: string;
}

const BotInvite: React.FC<BotInviteProps> = ({ serverId = '1343586237868544052' }) => {
    // ✅ Берём client_id из переменной окружения с префиксом VITE_
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

    // ✅ Формируем ссылку приглашения
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands&guild_id=${serverId}`;

    const features = [
        {
            icon: <Shield size={24} />,
            title: 'Advanced Moderation',
            description: 'Automated moderation with custom rules and filters',
        },
        {
            icon: <Users size={24} />,
            title: 'Member Management',
            description: 'Track member activity and manage permissions',
        },
        {
            icon: <MessageCircle size={24} />,
            title: 'Command System',
            description: 'Powerful commands for server management',
        },
    ];

    return (
        <div className={styles.botInvite}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.icon}>
                        <Bot size={48} />
                    </div>
                    <h1 className={styles.title}>Bot Not Connected</h1>
                    <p className={styles.subtitle}>
                        Add the bot to your Discord server to unlock powerful moderation tools and analytics.
                    </p>
                </div>

                <div className={styles.features}>
                    {features.map((feature, index) => (
                        <div key={index} className={styles.feature}>
                            <div className={styles.featureIcon}>{feature.icon}</div>
                            <div className={styles.featureContent}>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.actions}>
                    <a
                        href={inviteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.inviteButton}
                    >
                        <Bot size={20} />
                        Add Bot to Server
                        <ArrowRight size={16} />
                    </a>
                </div>

                <div className={styles.instructions}>
                    <h4>Installation Steps:</h4>
                    <ol>
                        <li>Click "Add Bot to Server" above</li>
                        <li>Select your server from the dropdown</li>
                        <li>Grant the necessary permissions</li>
                        <li>Authorize the bot</li>
                        <li>Return here and refresh the page</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default BotInvite;

// Кэш для пользователей Discord
export const userCache = new Map();
export const CACHE_TTL = 5 * 60 * 1000; // 5 минут

// Кэш для неудачных попыток входа
export const failedAttempts = new Map();

export async function fetchUserWithCache(userId: string) {
    const cached = userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    try {
        const userResponse = await fetch(`https://discord.com/api/v10/users/${userId}`, {
            headers: {
                'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (userResponse.ok) {
            const userData = await userResponse.json();
            userCache.set(userId, {
                data: userData,
                timestamp: Date.now()
            });
            return userData;
        }
    } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
    }

    return null;
}

// Очистка старых записей кэша
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of userCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            userCache.delete(key);
        }
    }
}, 60 * 60 * 1000); // Каждый час
export interface UserFromToken {
    id: number;
    name: string;
    email: string;
    highestRole: string;
    roleColor: number;
    roleHexColor: string;
    allRoles: string[];
    avatar?: string | null;
}

/**
 * Извлекает данные пользователя из JWT токена (клиентская версия)
 */
export const getUserFromToken = (token: string): UserFromToken | null => {
    try {
        // Убираем 'Bearer ' если есть
        const cleanToken = token.replace('Bearer ', '');

        // Разбиваем JWT на части
        const parts = cleanToken.split('.');
        if (parts.length !== 3) {
            console.error('Invalid JWT token format');
            return null;
        }

        // Декодируем payload (вторая часть)
        const payload = parts[1];

        // Добавляем padding если нужно для base64 decode
        let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }

        const decodedPayload = JSON.parse(atob(base64));

        const userData: UserFromToken = {
            id: decodedPayload.userId,
            name: decodedPayload.name || 'User',
            email: decodedPayload.email,
            highestRole: decodedPayload.role || '@everyone',
            roleColor: decodedPayload.roleColor || 0,
            roleHexColor: decodedPayload.roleHexColor || '#99AAB5',
            allRoles: decodedPayload.allRoles || [decodedPayload.role || '@everyone'],
            avatar: decodedPayload.avatar
        };
        
        return userData;

    } catch (error) {
        console.error('Failed to parse JWT token:', error);
        return null;
    }
};

/**
 * Проверяет валидность токена (базовая проверка на клиенте)
 */
export const isTokenValid = (token: string): boolean => {
    try {
        const user = getUserFromToken(token);
        if (!user) return false;

        // Проверяем expiration если есть
        const cleanToken = token.replace('Bearer ', '');
        const parts = cleanToken.split('.');
        if (parts.length !== 3) return false;

        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }

        const payload = JSON.parse(atob(base64));
        const now = Math.floor(Date.now() / 1000);

        // Если есть exp, проверяем
        if (payload.exp) {
            return payload.exp > now;
        }

        return true; // Если нет exp, считаем валидным
    } catch (error) {
        return false;
    }
};
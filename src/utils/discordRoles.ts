// Константы для сервера
export const SERVER_ID = "1343586237868544052";

// Маппинг названий ролей на их ID
export const ROLE_MAPPING = {
    "Bot Developer": "1375122633930178621",
    "Chief Administrator": "1399388382492360908", 
    "Senior Moderator": "1376907353525457006",
    "Moderator": "1375122819305832612"
} as const;

export const ROLE_IDS = {
    BOT_DEVELOPER: "1375122633930178621",
    CHIEF_ADMIN: "1399388382492360908", 
    SENIOR_MODERATOR: "1376907353525457006",
    MODERATOR: "1375122819305832612"
} as const;

// Иерархия ролей (от высшей к низшей)
export const ROLE_HIERARCHY = [
    "Bot Developer",           // Высшая роль
    "Chief Administrator",     // ↓
    "Senior Moderator",        // ↓  
    "Moderator"                // Низшая роль
] as const;

export interface DiscordRole {
    id: string;
    name: string;
    color: number;
    position: number;
    permissions: string;
}

/**
 * Конвертирует названия ролей в ID
 */
export const convertRoleNamesToIds = (roleNames: string[]): string[] => {
    return roleNames
        .map(name => ROLE_MAPPING[name as keyof typeof ROLE_MAPPING])
        .filter(Boolean) as string[];
};

/**
 * Конвертирует ID ролей в названия
 */
export const convertRoleIdsToNames = (roleIds: string[]): string[] => {
    const reverseMapping: Record<string, string> = {};
    Object.entries(ROLE_MAPPING).forEach(([name, id]) => {
        reverseMapping[id] = name;
    });
    
    return roleIds
        .map(id => reverseMapping[id])
        .filter(Boolean);
};

/**
 * Получает высшую роль пользователя из названий ролей
 */
export const getHighestUserRole = (userRoleNames: string[]): string | null => {
    for (const role of ROLE_HIERARCHY) {
        if (userRoleNames.includes(role)) {
            return role;
        }
    }
    return null;
};

/**
 * Проверяет, имеет ли пользователь доступ к функционалу на основе ролей
 */
export const hasRoleAccess = (
    userRoleNames: string[], // названия ролей пользователя
    requiredRoleIds: string[] // ID требуемых ролей
): boolean => {
    if (requiredRoleIds.length === 0) return true;
    if (userRoleNames.length === 0) return false;

    const userHighestRole = getHighestUserRole(userRoleNames);
    if (!userHighestRole) return false;

    // Конвертируем требуемые ID в названия
    const requiredRoleNames = convertRoleIdsToNames(requiredRoleIds);
    if (requiredRoleNames.length === 0) return false;

    // Находим самую низшую требуемую роль
    let lowestRequiredRole: string | null = null;
    for (const role of ROLE_HIERARCHY) {
        if (requiredRoleNames.includes(role)) {
            lowestRequiredRole = role;
            break; // Берем первую найденную (самую высшую в иерархии)
        }
    }

    if (!lowestRequiredRole) return false;

    // Проверяем иерархию
    const userRoleIndex = ROLE_HIERARCHY.indexOf(userHighestRole as any);
    const requiredRoleIndex = ROLE_HIERARCHY.indexOf(lowestRequiredRole as any);

    const hasAccess = userRoleIndex <= requiredRoleIndex; // Чем меньше индекс, тем выше роль
    
    return hasAccess;
};

// Пустые функции для совместимости
export const fetchServerRoles = async (): Promise<DiscordRole[]> => {
    return [];
};

export const getUserRoleHierarchy = (): DiscordRole[] => {
    return [];
};
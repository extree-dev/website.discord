import crypto from "crypto";

export const generateSecureToken = (length: number = 32): string => {
    return crypto.randomBytes(length).toString('hex');
};

export const constantTimeDelay = (ms: number = 500): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const getDiscordCreationDate = (discordId: string): string => {
    const timestamp = (parseInt(discordId) / 4194304) + 1420070400000;
    return new Date(timestamp).toISOString();
};

export const generateOAuthState = (): string => {
    return crypto.randomBytes(32).toString('hex');
};
// src/hooks/useZeroTrust.ts
import { useState } from 'react';

// 1. Определяем интерфейсы и типы
interface Challenge {
    type: string;
    question?: string;
    options?: string[];
    timeout?: number;
}

interface ClientContext {
    userAgent: string;
    screenResolution: string;
    timezone: string;
    language: string;
    platform: string;
}

// 2. Создаем кастомную ошибку
class ZeroTrustChallengeError extends Error {
    challenges: Challenge[];

    constructor(challenges: Challenge[]) {
        super('Zero Trust authentication required');
        this.name = 'ZeroTrustChallengeError';
        this.challenges = challenges;
    }
}

// 3. Вспомогательные функции для генерации контекста
const generateDeviceFingerprint = async (): Promise<string> => {
    // Простая реализация fingerprint (можно заменить на fingerprintjs2)
    const components = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        navigator.platform
    ].join('|');

    // Хешируем строку (упрощенная версия)
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(components));
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const getClientContext = async (): Promise<ClientContext> => {
    return {
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform
    };
};

// 4. Основной хук
export const useZeroTrust = () => {
    const [trustContext, setTrustContext] = useState<ClientContext | null>(null);
    const [challenges, setChallenges] = useState<Challenge[]>([]);

    const requestWithZeroTrust = async (url: string, options: RequestInit = {}) => {
        // Генерируем Zero Trust заголовки
        const deviceFingerprint = await generateDeviceFingerprint();
        const clientContext = await getClientContext();
        const sessionId = sessionStorage.getItem('zt-session');

        // Создаем объект заголовков с правильными типами
        const zeroTrustHeaders: Record<string, string> = {
            'X-Device-Fingerprint': deviceFingerprint,
            'X-Client-Context': JSON.stringify(clientContext)
        };

        // Добавляем sessionId только если он есть
        if (sessionId) {
            zeroTrustHeaders['X-Session-Id'] = sessionId;
        }

        // Объединяем с существующими заголовками
        const mergedHeaders: Record<string, string> = {
            ...(options.headers as Record<string, string> || {}),
            ...zeroTrustHeaders
        };

        const response = await fetch(url, {
            ...options,
            headers: mergedHeaders
        });

        // Обрабатываем Zero Trust challenges
        if (response.status === 423) { // HTTP 423 Locked
            const { challenges: requiredChallenges } = await response.json();
            setChallenges(requiredChallenges);
            throw new ZeroTrustChallengeError(requiredChallenges);
        }

        // Сохраняем session ID если пришел новый
        const newSessionId = response.headers.get('X-Session-Id');
        if (newSessionId) {
            sessionStorage.setItem('zt-session', newSessionId);
        }

        return response;
    };

    const submitChallenges = async (challengeResponses: { [key: string]: string }): Promise<boolean> => {
        try {
            const response = await fetch('/api/zero-trust/verify-challenges', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    responses: challengeResponses,
                    sessionId: sessionStorage.getItem('zt-session')
                })
            });

            if (response.ok) {
                setChallenges([]);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error submitting challenges:', error);
            return false;
        }
    };

    const clearChallenges = () => {
        setChallenges([]);
    };

    return {
        requestWithZeroTrust,
        challenges,
        submitChallenges,
        clearChallenges,
        trustContext
    };
};

export default useZeroTrust;
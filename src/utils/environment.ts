// src/utils/environment.ts

export interface EnvironmentInfo {
    isProduction: boolean;
    isVercel: boolean;
    isNetlify: boolean;
    isRailway: boolean;
    isLocal: boolean;
}

export const getEnvironment = (): EnvironmentInfo => {
    return {
        isProduction: process.env.NODE_ENV === 'production',
        isVercel: !!process.env.VERCEL,
        isNetlify: !!process.env.NETLIFY,
        isRailway: !!process.env.RAILWAY,
        isLocal: !process.env.VERCEL && !process.env.NETLIFY && !process.env.RAILWAY
    };
};

export const getHostingProvider = (): string => {
    if (process.env.VERCEL) return 'vercel';
    if (process.env.NETLIFY) return 'netlify';
    if (process.env.RAILWAY) return 'railway';
    return 'local';
};
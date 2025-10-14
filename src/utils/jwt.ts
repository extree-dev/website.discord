import jwt from 'jsonwebtoken'
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET!

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables')
}

const getDynamicJWTSecret = (): string => {
  const baseSecret = process.env.JWT_SECRET!;
  const timeSlot = Math.floor(Date.now() / (60 * 60 * 1000)); // Меняется каждый час
  const dynamicSecret = crypto
    .createHmac('sha256', baseSecret)
    .update(timeSlot.toString())
    .digest('hex');
  return dynamicSecret;
};


export interface JWTPayload {
    userId: number; // Изменено на number
    email: string;
    name?: string;
    role?: string;
    allRoles?: string[];
    roleColor?: number;
    roleHexColor?: string;
    avatar?: string | null;
}

export function generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
}
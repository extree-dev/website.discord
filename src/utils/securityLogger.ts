import { prisma } from "../../prisma/prisma.js";

export const securityLogger = {
  async logSuspiciousActivity(type: string, data: any) {
    console.warn("[SUSPICIOUS]", type, data);
    await prisma.securityLog.create({
      data: { type: "suspicious", message: type, metadata: data }
    });
  },

  async logAuthAttempt(identifier: string, success: boolean, metadata: any) {
    console.info("[AUTH ATTEMPT]", identifier, success, metadata);
    await prisma.securityLog.create({
      data: { type: "auth", message: `${identifier} - ${success ? "SUCCESS" : "FAIL"}`, metadata }
    });
  },

  async logError(type: string, data: any) {
    console.error("[ERROR]", type, data);
    await prisma.securityLog.create({
      data: { type: "error", message: type, metadata: data }
    });
  }
};

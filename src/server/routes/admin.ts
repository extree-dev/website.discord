import express from "express";
import { prisma } from "@/../prisma/prisma";

const router = express.Router();

// получить последние логи
router.get("/logs", async (req, res) => {
  try {
    const logs = await prisma.securityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });
    res.json(logs);
  } catch (err) {
    console.error("Failed to fetch logs", err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

export default router;

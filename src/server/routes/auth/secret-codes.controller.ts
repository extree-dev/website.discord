import express from "express";
import { SecretCodeService } from "./services/secret-codes.service";
import { verifyToken } from "@/utils/jwt";

const router = express.Router();

// Все endpoints требуют аутентификации
router.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    verifyToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

// Получение всех кодов
router.get("/", async (req, res) => {
  try {
    const includeUser = req.query.include === 'user';
    const usedFilter = req.query.used as string;

    const codes = await SecretCodeService.getSecretCodes({ includeUser, usedFilter });
    res.json(codes);
  } catch (error) {
    console.error('Error fetching secret codes:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Создание кода
router.post("/", async (req, res) => {
  try {
    const { code, expiresAt, maxUses } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '')!;
    const decoded = verifyToken(token);

    const secretCode = await SecretCodeService.createSecretCode({
      code,
      expiresAt,
      maxUses,
      createdBy: decoded.name || decoded.email || 'System',
      userId: decoded.userId
    });

    res.status(201).json(secretCode);
  } catch (error) {
    console.error('Error creating secret code:', error);
    
    if ((error as any).code === 'P2002') {
      return res.status(409).json({ error: "Code already exists" });
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
});

// Удаление кода
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await SecretCodeService.deleteSecretCode(id);
    res.json({ success: true, message: "Code deleted successfully" });
  } catch (error) {
    console.error('Error deleting secret code:', error);
    
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ error: "Code not found" });
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
});

// Генерация кода
router.post("/generate", async (req, res) => {
  try {
    const code = SecretCodeService.generateCode();
    res.json({ code });
  } catch (error) {
    console.error("Error generating code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Валидация кода
router.post("/validate", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        valid: false,
        error: 'Secret code is required'
      });
    }

    const validation = await SecretCodeService.validateCode(code);
    
    if (!validation.valid) {
      return res.status(400).json(validation);
    }

    res.json(validation);
  } catch (error) {
    console.error('Error validating secret code:', error);
    res.status(500).json({
      valid: false,
      error: 'Internal server error'
    });
  }
});

// Использование кода
router.post("/use", async (req, res) => {
  try {
    const { codeId, usedBy } = req.body;

    if (!codeId) {
      return res.status(400).json({ error: 'Code ID is required' });
    }

    const updatedCode = await SecretCodeService.useCode(codeId, usedBy);
    res.json({ success: true, code: updatedCode });
  } catch (error) {
    console.error('Error using secret code:', error);
    
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ error: "Code not found" });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Статистика кодов
router.get("/stats", async (req, res) => {
  try {
    const stats = await SecretCodeService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching secret codes stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
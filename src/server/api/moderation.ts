import { Express } from 'express'

// Временное хранилище на сервере (в реальном приложении используйте БД)
let serverModerationData = {
  bans: [] as string[],
  kicks: [] as string[],
  warnings: [] as string[]
}

export function setupModerationRoutes(app: Express) {
  // Получить все данные модерации
  app.get('/api/moderation', (req, res) => {
    res.json(serverModerationData)
  })

  // Добавить бан
  app.post('/api/moderation/ban', (req, res) => {
    const { userId } = req.body
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    if (!serverModerationData.bans.includes(userId)) {
      serverModerationData.bans.push(userId)
    }

    res.json({ bans: serverModerationData.bans })
  })

  // Добавить кик
  app.post('/api/moderation/kick', (req, res) => {
    const { userId } = req.body
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    if (!serverModerationData.kicks.includes(userId)) {
      serverModerationData.kicks.push(userId)
    }

    res.json({ kicks: serverModerationData.kicks })
  })

  // Очистить данные (для разработки)
  app.delete('/api/moderation', (req, res) => {
    serverModerationData = { bans: [], kicks: [], warnings: [] }
    res.json({ message: 'Moderation data cleared' })
  })
}
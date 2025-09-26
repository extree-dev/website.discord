import { Express } from 'express'
import jwt from 'jsonwebtoken'

// Временное хранилище (замените на базу данных)
const users: any[] = [] // Здесь будут ваши пользователи

export function setupUserRoutes(app: Express) {
    // Получить базовую информацию пользователя
    app.get('/api/users/:userId/basic', async (req, res) => {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '')
            const userId = req.params.userId

            if (!token) {
                return res.status(401).json({ error: 'No token provided' })
            }

            // Верифицируем токен
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
            
            // Проверяем, что userId в токене совпадает с запрошенным
            if (decoded.userId !== userId) {
                return res.status(403).json({ error: 'Access denied' })
            }

            // Ищем пользователя (замените на запрос к базе данных)
            const user = users.find(u => u.id === userId) || {
                id: userId,
                email: decoded.email || 'unknown@example.com',
                name: decoded.name || 'Unknown User'
            }

            res.json({
                id: user.id,
                email: user.email,
                name: user.name
            })
        } catch (error) {
            console.error('Error in /api/users/:userId/basic:', error)
            res.status(401).json({ error: 'Invalid token' })
        }
    })

    // Endpoint для завершения профиля
    app.post('/api/complete-profile', async (req, res) => {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '')
            const profileData = req.body

            if (!token) {
                return res.status(401).json({ error: 'No token provided' })
            }

            // Верифицируем токен
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any

            // Здесь сохраняем профиль в базу данных
            // Пример:
            const userIndex = users.findIndex(u => u.id === decoded.userId)
            if (userIndex !== -1) {
                users[userIndex] = { ...users[userIndex], ...profileData, profileCompleted: true }
            } else {
                users.push({
                    id: decoded.userId,
                    ...profileData,
                    profileCompleted: true,
                    email: decoded.email,
                    name: decoded.name
                })
            }

            res.json({ 
                success: true, 
                message: 'Profile completed successfully',
                user: users.find(u => u.id === decoded.userId)
            })
        } catch (error) {
            console.error('Error in /api/complete-profile:', error)
            res.status(401).json({ error: 'Invalid token' })
        }
    })
}
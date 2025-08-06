import axios from 'axios'

const API_URL = '/api/discord'

export const DiscordAPI = {
  async getServerInfo(guildId: string) {
    return axios.get(`${API_URL}/servers/${guildId}`)
  },
  
  async banUser(guildId: string, userId: string, reason: string) {
    return axios.post(`${API_URL}/servers/${guildId}/ban`, { userId, reason })
  },
  
  // Другие методы...
}
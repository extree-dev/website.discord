module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
      console.log(`Sentinel запущен как ${client.user.tag}`);
      client.user.setActivity('За порядком', { type: 'WATCHING' });
    }
  };
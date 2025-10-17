const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const { VERIFICATION_LOG_CHANNEL_ID, TEMP_ROLE_ID, ADMIN_ROLE_ID } = process.env;

module.exports = {
    async handleVerificationRequest(interaction) {
        try {
            const user = interaction.user;
            const member = interaction.member;
            const guild = interaction.guild;

            // Проверка роли
            const tempRole = guild.roles.cache.get(TEMP_ROLE_ID);
            if (!tempRole) throw new Error('Роль верификации не найдена!');

            if (!member.roles.cache.has(tempRole.id)) {
                return interaction.reply({
                    content: 'У вас нет роли для верификации!',
                    ephemeral: true
                });
            }

            // Создаем заявку через pool
            const request = await pool.query(
                `INSERT INTO verification_requests 
                (user_id, user_name, user_avatar, message, status) 
                VALUES ($1, $2, $3, $4, $5) 
                RETURNING *`,
                [user.id, user.username, user.avatar, 'Запрос через Discord', 'pending']
            );

            const requestData = request.rows[0];

            // Отправляем запрос в канал администрации
            const logChannel = guild.channels.cache.get(VERIFICATION_LOG_CHANNEL_ID);
            if (!logChannel) throw new Error('Канал верификации не найден!');

            const embed = new EmbedBuilder()
                .setTitle('Запрос на верификацию')
                .setDescription(`Пользователь ${user.tag} (ID: ${user.id}) запрашивает верификацию`)
                .setColor('#FFA500')
                .setThumbnail(user.displayAvatarURL())
                .addFields(
                    { name: 'ID заявки', value: requestData.id.toString(), inline: true },
                    { name: 'Аккаунт создан', value: user.createdAt.toLocaleString(), inline: true },
                    { name: 'Присоединился', value: member.joinedAt.toLocaleString(), inline: true }
                );

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`verify_accept_${requestData.id}`)
                    .setLabel('Верифицировать')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`verify_reject_${requestData.id}`)
                    .setLabel('Отклонить')
                    .setStyle(ButtonStyle.Danger)
            );

            await logChannel.send({
                content: `<@&${ADMIN_ROLE_ID}> Новый запрос на верификацию`,
                embeds: [embed],
                components: [buttons]
            });

            await interaction.reply({
                content: 'Ваш запрос на верификацию отправлен администраторам',
                ephemeral: true
            });

        } catch (error) {
            console.error('Ошибка обработки верификации:', error);
            await interaction.reply({
                content: 'Произошла ошибка при обработке вашего запроса!',
                ephemeral: true
            });
        }
    },

    async handleAdminVerification(interaction) {
        try {
            if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
                return interaction.reply({
                    content: 'У вас нет прав для этого действия!',
                    ephemeral: true
                });
            }

            const [_, action, requestId] = interaction.customId.split('_');
            const guild = interaction.guild;

            // Находим заявку через pool
            const request = await pool.query(
                'SELECT * FROM verification_requests WHERE id = $1', 
                [requestId]
            );

            if (request.rows.length === 0) {
                return interaction.reply({
                    content: 'Заявка не найдена!',
                    ephemeral: true
                });
            }

            const requestData = request.rows[0];
            const member = await guild.members.fetch(requestData.user_id);
            const tempRole = guild.roles.cache.get(TEMP_ROLE_ID);

            // Обновляем статус заявки
            await pool.query(
                `UPDATE verification_requests 
                SET status = $1, moderator_id = $2, moderator_name = $3, reason = $4 
                WHERE id = $5`,
                [
                    action === 'accept' ? 'approved' : 'rejected',
                    interaction.user.id,
                    interaction.user.username,
                    action === 'reject' ? 'Отклонено через Discord' : null,
                    requestId
                ]
            );

            if (action === 'accept') {
                await member.roles.remove(tempRole);
                await interaction.reply({
                    content: `Пользователь ${member.user.tag} успешно верифицирован!`,
                    ephemeral: true
                });
                await member.send('Вы успешно прошли верификацию!').catch(() => {});
            } else {
                await interaction.reply({
                    content: `Верификация пользователя ${member.user.tag} отклонена!`,
                    ephemeral: true
                });
                await member.send('Верификация не удалась, причина: Отклонена Администратором Сервера').catch(() => {});
            }

            await interaction.message.edit({ components: [] });

        } catch (error) {
            console.error('Ошибка обработки админской верификации:', error);
            await interaction.reply({
                content: 'Произошла ошибка при обработке запроса!',
                ephemeral: true
            });
        }
    }
};
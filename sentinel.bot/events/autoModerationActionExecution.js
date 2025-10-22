// events/autoModerationActionExecution.js
const { Events } = require('discord.js');

// Cache for temporarily storing automod events
const automodCache = new Map();

module.exports = {
    name: Events.AutoModerationActionExecution,
    async execute(autoModerationAction) {
        console.log('AUTOMOD EVENT TRIGGERED:', autoModerationAction.action.type);

        try {
            const { guild, action, content, userId, channelId, ruleName, messageId } = autoModerationAction;

            if (!global.alertSystem) {
                console.log('AlertSystem not available');
                return;
            }

            // Create a key for grouping events (message + user)
            const cacheKey = `${guild.id}_${userId}_${Buffer.from(content).toString('base64').substring(0, 20)}`;

            console.log(`Cache key: ${cacheKey}`);

            // If this is the first event for this key
            if (!automodCache.has(cacheKey)) {
                console.log('New automod event group');

                // Get user and channel information
                let userTag = 'Unknown';
                let channelName = 'Unknown';

                try {
                    const user = await guild.members.fetch(userId);
                    userTag = user.user.tag;
                } catch (e) {
                    console.log('Could not fetch user:', e.message);
                }

                try {
                    const channel = await guild.channels.fetch(channelId);
                    channelName = channel.name;
                    console.log(`Channel info: ${channelName} (${channelId})`);
                } catch (e) {
                    console.log('Could not fetch channel:', e.message);
                }

                // Create cache entry
                automodCache.set(cacheKey, {
                    guildId: guild.id,
                    userId: userId,
                    userTag: userTag,
                    content: content,
                    channelName: channelName,
                    channelId: channelId,
                    actions: [],
                    firstTrigger: Date.now(),
                    alertCreated: false 
                });

                // Start timer for creating combined alert
                setTimeout(() => {
                    createCombinedAlert(cacheKey);
                }, 3000); // Wait 3 seconds to collect all actions
            }

            // Add action to cache
            const cache = automodCache.get(cacheKey);

            // Check if this action type already exists
            const existingAction = cache.actions.find(a => a.type === action.type);
            if (!existingAction) {
                cache.actions.push({
                    type: action.type,
                    metadata: action.metadata,
                    timestamp: Date.now()
                });
                console.log(`Added action type ${action.type} to cache. Total: ${cache.actions.length}`);
            } else {
                console.log(`Action type ${action.type} already exists in cache`);
            }

        } catch (error) {
            console.error('Error handling AutoMod action:', error);
        }
    },
};

// Function to create combined alert
async function createCombinedAlert(cacheKey) {
    const cache = automodCache.get(cacheKey);
    if (!cache || cache.alertCreated) {
        console.log('Alert already created or cache empty');
        return;
    }

    // Mark that alert has been created
    cache.alertCreated = true;

    console.log(`Creating combined alert for ${cache.actions.length} actions`);
    console.log(`Channel data: ${cache.channelName} (${cache.channelId})`);

    const { guildId, userId, userTag, content, channelName, channelId, actions } = cache;

    if (actions.length === 0) {
        console.log('No actions to create alert for');
        automodCache.delete(cacheKey);
        return;
    }

    // Create description based on all actions
    const actionDescriptions = actions.map(action => getActionDescription(action.type)).filter(Boolean);
    const uniqueActions = [...new Set(actionDescriptions)];

    const description = uniqueActions.length > 0
        ? `Automod applied: ${uniqueActions.join(', ')}`
        : 'Automatic moderation processed the message';

    // Determine severity based on actions
    const severity = actions.some(a => a.type === 3) ? 'high' : 'medium';

    try {
        // Create ONE combined alert
        const alert = await global.alertSystem.createAlert('automod_triggered', severity, {
            title: '',
            description: description,
            guildId: guildId,
            data: {
                user: userTag,
                userId: userId,
                content: content.substring(0, 200),
                channel: channelName,
                channelId: channelId,
                actions: actions.map(action => ({
                    type: action.type,
                    description: getActionDescription(action.type),
                    duration: action.metadata.durationSeconds ? `${action.metadata.durationSeconds} sec` : null
                })),
                totalActions: actions.length,
                reason: getContentReason(content),
                timestamp: new Date().toISOString()
            }
        });

        console.log(`Combined alert created: ${alert?.id} with ${actions.length} actions`);
        console.log(`Alert channel data: ${channelName} (${channelId})`);

    } catch (error) {
        console.error('Error creating combined alert:', error);
    } finally {
        // Clear cache regardless of result
        automodCache.delete(cacheKey);
    }
}

// Functions for action descriptions
function getActionDescription(actionType) {
    const actionsMap = {
        1: 'message blocked',
        2: 'warning sent',
        3: 'user timeout',
        4: 'content blocked'
    };

    let description = actionsMap[actionType] || `action ${actionType}`;

    // Add details for timeout
    if (actionType === 3) {
        description += ' applied';
    }

    return description;
}

function getContentReason(content) {
    const bannedPatterns = [
        { pattern: /spam|advertising|buy|sell/i, reason: 'Spam content' },
        { pattern: /discord\.gg|http|https/i, reason: 'Suspicious links' },
        { pattern: /@everyone|@here/i, reason: 'Mass mentions' },
        { pattern: /[A-Z]{10,}/, reason: 'Excessive caps' },
        { pattern: /fuck|shit|bitch|asshole/i, reason: 'Profanity' }
    ];

    const matched = bannedPatterns.find(p => p.pattern.test(content));
    return matched ? matched.reason : 'Rule violation detected';
}
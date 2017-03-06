const { SettingProvider } = require('discord.js-commando');
const Guild = require('discord.js').Guild;

/**
 * Uses an PostgreSQL database to store settings with guilds
 * @extends {SettingProvider}
 */
class PostgreSQLProvider extends SettingProvider {
    /**
     * @external PostgreSQLDatabase
     * @see {@link https://www.npmjs.com/package/pg-promise}
     */

    /**
     * @param {PostgreSQLDatabase} db - Database for the provider
     */
    constructor(db) {
        super();

        /**
         * Database that will be used for storing/retrieving settings
         * @type {PostgreSQLDatabase}
         */
        this.db = db;

        /**
         * Client that the provider is for (set once the client is ready, after using {@link CommandoClient#setProvider})
         * @name PostgreSQLProvider#client
         * @type {CommandoClient}
         * @readonly
         */
        Object.defineProperty(this, 'client', { value: null, writable: true });

        /**
         * Settings cached in memory, mapped by guild ID (or 'global')
         * @type {Map}
         * @private
         */
        this.settings = new Map();

        /**
         * Listeners on the Client, mapped by the event name
         * @type {Map}
         * @private
         */
        this.listeners = new Map();
    }

    /**
     * Initialises the provider by connecting to databases and/or caching all data in memory.
     * {@link CommandoClient#setProvider} will automatically call this once the client is ready.
     * @param {CommandoClient} client - Client that will be using the provider
     * @return {Promise<void>}
     * @abstract
     */
    async init(client) {
        this.client = client;
        await this.db.none("CREATE TABLE IF NOT EXISTS settings (guild BIGINT PRIMARY KEY, settings TEXT)")
            .catch(e=>console.log(e));

        await this.db.any('SELECT * FROM settings')
            .then(data => {
                for(const row of data) {
                    let settings;
                    try {
                        settings = JSON.parse(row.settings);
                    } catch(err) {
                        client.emit('warn', `PostgreSQLProvider couldn't parse the settings stored for guild ${row.guild}.`);
                    }

                    const guild = row.guild !== '0' ? row.guild : 'global';
                    this.settings.set(guild, settings);
                    if(guild !== 'global' && !client.guilds.has(row.guild)) continue;
                    this.setupGuild(guild, settings);
                }
            })
            .catch(e=>console.log(e));

        // Listen for changes
        this.listeners
            .set('commandPrefixChange', (guild, prefix) => this.set(guild, 'prefix', prefix))
            .set('commandStatusChange', (guild, command, enabled) => this.set(guild, `cmd-${command.name}`, enabled))
            .set('groupStatusChange', (guild, group, enabled) => this.set(guild, `grp-${group.id}`, enabled))
            .set('guildCreate', guild => {
                const settings = this.settings.get(guild.id);
                if(!settings) return;
                this.setupGuild(guild.id, settings);
            })
            .set('commandRegister', command => {
                for(const [guild, settings] of this.settings) {
                    if(guild !== 'global' && !client.guilds.has(guild)) continue;
                    this.setupGuildCommand(client.guilds.get(guild), command, settings);
                }
            })
            .set('groupRegister', group => {
                for(const [guild, settings] of this.settings) {
                    if(guild !== 'global' && !client.guilds.has(guild)) continue;
                    this.setupGuildGroup(client.guilds.get(guild), group, settings);
                }
            });
        for(const [event, listener] of this.listeners) client.on(event, listener);
    }

    /**
     * Destroys the provider, removing any event listeners.
     * @return {Promise<void>}
     * @abstract
     */
    async destroy() {
        // Remove all listeners from the client
        for(const [event, listener] of this.listeners) this.client.removeListener(event, listener);
        this.listeners.clear();
    }

    /**
     * Obtains a setting for a guild
     * @param {Guild|string} guild - Guild the setting is associated with (or 'global')
     * @param {string} key - Name of the setting
     * @param {*} [defVal] - Value to default to if the setting isn't set on the guild
     * @return {*}
     * @abstract
     */
    get(guild, key, defVal) {
        const settings = this.settings.get(this.constructor.getGuildID(guild));
        return settings ? typeof settings[key] !== 'undefined' ? settings[key] : defVal : defVal;
    }

    /**
     * Sets a setting for a guild
     * @param {Guild|string} guild - Guild to associate the setting with (or 'global')
     * @param {string} key - Name of the setting
     * @param {*} val - Value of the setting
     * @return {Promise<*>} New value of the setting
     * @abstract
     */
    async set(guild, key, val) {
        guild = this.constructor.getGuildID(guild);
        let gId = (guild !== 'global' ? guild : 0);
        let settings = this.settings.get(guild);
        if(!settings) {
            settings = {};
            this.settings.set(guild, settings);
        }

        settings[key] = val;
        await this.db.none(`INSERT INTO settings (guild, settings) VALUES (${gId}, '${JSON.stringify(settings)}') ` +
            `ON CONFLICT (guild) DO UPDATE SET settings = excluded.settings`)
            .catch(e=>console.log(e));

        if(guild === 'global') this.updateOtherShards(key, val);
        return val;
    }

    /**
     * Removes a setting from a guild
     * @param {Guild|string} guild - Guild the setting is associated with (or 'global')
     * @param {string} key - Name of the setting
     * @return {Promise<*>} Old value of the setting
     * @abstract
     */
    async remove(guild, key) {
        guild = this.constructor.getGuildID(guild);
        let gId = (guild !== 'global' ? guild : 0);
        const settings = this.settings.get(guild);
        if(!settings || typeof settings[key] === 'undefined') return undefined;

        const val = settings[key];
        settings[key] = undefined;
        await this.db.any(`INSERT INTO settings (guild, settings) VALUES (${gId}, '${JSON.stringify(settings)}') ` +
            `ON CONFLICT (guild) DO UPDATE SET settings = excluded.settings`)
            .catch(e=>console.log(e));
        if(guild === 'global') this.updateOtherShards(key, undefined);
        return val;
    }

    /**
     * Removes all settings in a guild
     * @param {Guild|string} guild - Guild to clear the settings of
     * @return {Promise<void>}
     * @abstract
     */
    async clear(guild) {
        guild = this.constructor.getGuildID(guild);
        let gId = (guild !== 'global' ? guild : 0);
        if(!this.settings.has(guild)) return;
        this.settings.delete(guild);
        await this.db.any(`DELETE FROM settings WHERE guild = ${gId}`)
            .catch(e=>console.log(e));
    }

    /**
     * Loads all settings for a guild
     * @param {string} guild - Guild ID to load the settings of (or 'global')
     * @param {Object} settings - Settings to load
     * @private
     */
    setupGuild(guild, settings) {
        if(typeof guild !== 'string') throw new TypeError('The guild must be a guild ID or "global".');
        guild = this.client.guilds.get(guild) || null;

        // Load the command prefix
        if(typeof settings.prefix !== 'undefined') {
            if(guild) guild._commandPrefix = settings.prefix;
            else this.client._commandPrefix = settings.prefix;
        }

        // Load all command/group statuses
        for(const command of this.client.registry.commands.values()) this.setupGuildCommand(guild, command, settings);
        for(const group of this.client.registry.groups.values()) this.setupGuildGroup(guild, group, settings);
    }

    /**
     * Sets up a command's status in a guild from the guild's settings
     * @param {?Guild} guild - Guild to set the status in
     * @param {Command} command - Command to set the status of
     * @param {Object} settings - Settings of the guild
     * @private
     */
    setupGuildCommand(guild, command, settings) {
        if(typeof settings[`cmd-${command.name}`] === 'undefined') return;
        if(guild) {
            if(!guild._commandsEnabled) guild._commandsEnabled = {};
            guild._commandsEnabled[command.name] = settings[`cmd-${command.name}`];
        } else {
            command._globalEnabled = settings[`cmd-${command.name}`];
        }
    }

    /**
     * Sets up a group's status in a guild from the guild's settings
     * @param {?Guild} guild - Guild to set the status in
     * @param {CommandGroup} group - Group to set the status of
     * @param {Object} settings - Settings of the guild
     * @private
     */
    setupGuildGroup(guild, group, settings) {
        if(typeof settings[`grp-${group.id}`] === 'undefined') return;
        if(guild) {
            if(!guild._groupsEnabled) guild._groupsEnabled = {};
            guild._groupsEnabled[group.id] = settings[`grp-${group.id}`];
        } else {
            group._globalEnabled = settings[`grp-${group.id}`];
        }
    }

    /**
     * Updates a global setting on all other shards if using the {@link ShardingManager}.
     * @param {string} key - Key of the setting to update
     * @param {*} val - Value of the setting
     * @private
     */
    updateOtherShards(key, val) {
        if(!this.client.shard) return;
        key = JSON.stringify(key);
        val = typeof val !== 'undefined' ? JSON.stringify(val) : 'undefined';
        this.client.shard.broadcastEval(`
			if(this.shard.id !== ${this.client.shard.id} && this.provider && this.provider.settings) {
				this.provider.settings.global[${key}] = ${val};
			}
		`);
    }

    /**
     * Obtains the ID of the provided guild, or throws an error if it isn't valid
     * @param {Guild|string} guild - Guild to get the ID of
     * @return {string} ID of the guild, or 'global'
     */
    static getGuildID(guild) {
        if(guild instanceof Guild) return guild.id;
        if(guild === 'global' || guild === null) return 'global';
        if(typeof guild === 'string' && !isNaN(guild)) return guild;
        throw new TypeError('Invalid guild specified. Must be a Guild instance, guild ID, "global", or null.');
    }
}

module.exports = PostgreSQLProvider;
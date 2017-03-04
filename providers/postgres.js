import {SettingProvider} from "discord.js-commando";
const Guild = require('discord.js').Guild;

/**
 * Uses an PostgreSQL database to store settings with guilds
 * @extends {SettingProvider}
 */
class PostgreSQLProvider extends SettingProvider {
    /**
     * @external PostgreSQLDatabase
     * @see {@link https://www.npmjs.com/package/pg}
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

        /**
         * Prepared statement to insert or replace a settings row
         * @type {PostgreSQLStatement}
         * @private
         */
        this.insertOrReplaceStmt = null;

        /**
         * Prepared statement to delete an entire settings row
         * @type {PostgreSQLStatement}
         * @private
         */
        this.deleteStmt = null;

        /**
         * @external PostgreSQLStatement
         * @see {@link https://www.npmjs.com/package/pg}
         */
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
        await this.db.none("CREATE TABLE IF NOT EXISTS settings (guild INTEGER PRIMARY KEY, settings TEXT)")
            .catch(e=>console.log(e));

        throw new Error(`${this.constructor.name} doesn't have an init method.`);
    }

    /**
     * Destroys the provider, removing any event listeners.
     * @return {Promise<void>}
     * @abstract
     */
    async destroy() { throw new Error(`${this.constructor.name} doesn't have a destroy method.`); }

    /**
     * Obtains a setting for a guild
     * @param {Guild|string} guild - Guild the setting is associated with (or 'global')
     * @param {string} key - Name of the setting
     * @param {*} [defVal] - Value to default to if the setting isn't set on the guild
     * @return {*}
     * @abstract
     */
    get(guild, key, defVal) { throw new Error(`${this.constructor.name} doesn't have a get method.`); }

    /**
     * Sets a setting for a guild
     * @param {Guild|string} guild - Guild to associate the setting with (or 'global')
     * @param {string} key - Name of the setting
     * @param {*} val - Value of the setting
     * @return {Promise<*>} New value of the setting
     * @abstract
     */
    async set(guild, key, val) { throw new Error(`${this.constructor.name} doesn't have a set method.`); }

    /**
     * Removes a setting from a guild
     * @param {Guild|string} guild - Guild the setting is associated with (or 'global')
     * @param {string} key - Name of the setting
     * @return {Promise<*>} Old value of the setting
     * @abstract
     */
    async remove(guild, key) { throw new Error(`${this.constructor.name} doesn't have a remove method.`); }

    /**
     * Removes all settings in a guild
     * @param {Guild|string} guild - Guild to clear the settings of
     * @return {Promise<void>}
     * @abstract
     */
    async clear(guild) { throw new Error(`${this.constructor.name} doesn't have a clear method.`); }

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
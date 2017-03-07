const env = process.env,
    PostgreSQLProvider = require('./providers/postgres'),
    Commando = require('discord.js-commando'),
    oneLine = require('common-tags').oneLine,
    dev = (env.NODE_ENV === 'development'),
    pgp = require("pg-promise")(),
    path = require('path');

if (dev) require('dotenv').config(); // read environment variables from .env if we're in development
const db = !dev ? pgp(env.DATABASE_URL) : pgp({user: env.PG_USER, password: env.PG_PASS, database: env.PG_DB});
const client = new Commando.Client({owner: env.DISCORD_OWNER_ID});

client
    .on('error', console.error)
    .on('warn', console.warn)
    //.on('debug', console.log)
    .on('ready', () => {
        console.log(`Client ready; logged in as ${client.user.username}#${client.user.discriminator} (${client.user.id})`);
    })
    .on('disconnect', () => {
        console.warn('Disconnected!');
    })
    .on('reconnecting', () => {
        console.warn('Reconnecting...');
    })
    .on('commandError', (cmd, err) => {
        if (err instanceof Commando.FriendlyError) return;
        console.error(`Error in command ${cmd.groupID}:${cmd.memberName}`, err);
    })
    .on('commandBlocked', (msg, reason) => {
        console.log(oneLine`
			Command ${msg.command ? `${msg.command.groupID}:${msg.command.memberName}` : ''}
			blocked; ${reason}
		`);
    })
    .on('commandPrefixChange', (guild, prefix) => {
        console.log(oneLine`
			Prefix ${prefix === '' ? 'removed' : `changed to ${prefix || 'the default'}`}
			${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.
		`);
    })
    .on('commandStatusChange', (guild, command, enabled) => {
        console.log(oneLine`
			Command ${command.groupID}:${command.memberName}
			${enabled ? 'enabled' : 'disabled'}
			${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.
		`);
    })
    .on('groupStatusChange', (guild, group, enabled) => {
        console.log(oneLine`
			Group ${group.id}
			${enabled ? 'enabled' : 'disabled'}
			${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.
		`);
    })
    // TODO: Refactor voiceStateUpdate event to properly leave empty channels
    .on('voiceStateUpdate', (oldMember, newMember) => {

    });

client.setProvider(new PostgreSQLProvider(db)).catch(console.error);

client.registry
    .registerGroups([
        ['fun', 'Fun Stuff'],
        ['music', 'Music Streaming']
    ])
    .registerDefaults()
    .registerCommandsIn(path.join(__dirname, 'commands'));

client.login(env.DISCORD_TOKEN);

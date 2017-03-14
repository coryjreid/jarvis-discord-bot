const Commando = require('discord.js-commando');
const oneLine = require('common-tags').oneLine;
const Player = require('../../util/audio/Player');
const players = require('../../util/storage/playlists');

module.exports = class StopCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'stop',
            aliases: ['stfu', 'silence'],
            group: 'music',
            memberName: 'stop',
            description: 'Stops the currently playing stream.',
            details: oneLine`
				This command will stop whatever the bot is currently streaming.
				You must be in the same channel as the bot to control the bot.
			`,
            examples: ['stop']
        });
    }

    async run(msg, args) {
        let player = players.get(msg.guild.id);
        if (player && player.playing) {
            if (Player.canControl(msg.member, msg.client.user.id)) {
                msg.reply(`😢`);
                player.stop();
            } else msg.reply(`we need to be in the same channel for you to command me. 🖕🖕🖕`);
        }
    }
};

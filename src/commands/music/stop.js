const Commando = require('discord.js-commando');
const oneLine = require('common-tags').oneLine;
const Player = require('../../util/audio/Player');

module.exports = class StopCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'stop',
            aliases: ['stfu', 'silence'],
            group: 'music',
            memberName: 'stop',
            description: 'Stops the currently playing stream.',
            details: oneLine`
				This command can play audio streams from various sources. Typically used for music.
				This command is the envy of all other commands.
			`,
            examples: ['stop']
        });
    }

    async run(msg, args) {
        let player = Player.getPlayer(msg);
        if (Player.canControl(msg)) player.stop();
        else msg.reply(`we need to be in the same channel for you to command me. 🖕🖕🖕`);
    }
};

const Commando = require('discord.js-commando');
const oneLine = require('common-tags').oneLine;
const Player = require('../../util/audio/Player');
const players = require('../../util/storage/playlists');

module.exports = class VolumeCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'volume',
            aliases: ['vol', 'v'],
            group: 'music',
            memberName: 'volume',
            description: 'Sets the volume for any currently playing streams.',
            details: oneLine`
				This command sets the volume for the currently playing playlist.
				Please do not abuse this command - you risk __seriously__ damaging people's hearing.
			`,
            examples: ['volume <0-200>'],

            args: [
                {
                    key: 'vol',
                    label: 'vol',
                    prompt: 'how loud (percentage 0-200)?',
                    type: 'integer',
                    min: 0,
                    max: 200,
                    infinite: false
                }
            ]
        });
    }

    async run(msg, args) {
        let player = players.get(msg.guild.id);
        if (player && player.playing) {
            player.setVolume(args.vol);
        }
    }
};

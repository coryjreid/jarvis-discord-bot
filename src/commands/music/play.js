const Commando = require('discord.js-commando');
const oneLine = require('common-tags').oneLine;
const playlists = require('../../util/storage/playlists');
const Player = require('../../util/audio/Player');

module.exports = class PlayCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'play',
            aliases: [],
            group: 'music',
            memberName: 'play',
            description: 'Plays some music from the Internet.',
            details: oneLine`
				This command can play audio streams from various sources. Typically used for music.
				This command is the envy of all other commands.
			`,
            examples: ['play <url>'],

            args: [
                {
                    key: 'url',
                    label: 'url',
                    prompt: 'what is the video ID or URL?',
                    type: 'string',
                    infinite: false
                }
            ]
        });
    }

    async run(msg, args) {
        let player = Player.getPlayer(msg);
        player.canPlay(msg).then(vc => {
            return player.init(vc, msg, args);
        }).catch(err => {msg.reply(err)});
    }
};

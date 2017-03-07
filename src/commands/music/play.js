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
        let client = msg.client;
        let voiceChan = msg.member.voiceChannel;
        let player = null;

        if (!voiceChan) return msg.reply(`Please join a voice channel first.`);

        if (playlists.has(msg.guild.id)) {
            player = playlists.get(msg.guild.id);

            return msg.reply(`I appear to already be playing in **${player.vc.channel.name}**.`);
        } else {
            await voiceChan.join().then(conn => {
                player = new Player(conn);
                player.init(args)
                    .then(() => {
                        msg.reply(`starting with playlist of ${player.playlist.length()} items.`);
                    }).catch(e=>console.log(e));
            });
        }


    }
};

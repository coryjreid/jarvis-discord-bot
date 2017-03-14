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
				Errors will be displayed to the user.
			`,
            examples: ['play <url:string>', 'play <url:string> [repeat:boolean]'],

            args: [
                {
                    key: 'url',
                    label: 'url',
                    prompt: 'what is the URL?',
                    type: 'string',
                    infinite: false
                },
                {
                    key: 'repeat',
                    label: 'repeat',
                    prompt: 'should I repeat the playlist?',
                    type: 'boolean',
                    default: false,
                    infinite: false
                }
            ]
        });
    }

    async run(msg, args) {
        let player = Player.getPlayer(msg.guild.id);
        if (Player.canControl(msg.member, msg.client.user.id)) return msg.reply(`uh - sorry, Charlie. Nice try.`);

        if (player.playing) {
            msg.reply(`adding your items...`);
            player.list.addItems(args);
        } else {
            player.canPlay(msg).then(vc => {
                msg.reply(`I'm on it! If your URL is a playlist with a lot of items this will take some time.`);
                return player.init(vc, msg, args);
            }).then(() => {
                msg.reply(`done! Playing with ${player.list.getLength()} item(s).`);
            }).catch(err => {msg.reply(err)});
        }
    }
};

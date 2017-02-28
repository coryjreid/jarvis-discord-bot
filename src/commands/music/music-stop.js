const Commando = require('discord.js-commando');
const oneLine = require('common-tags').oneLine;

module.exports = class YoutubeStopCommand extends Commando.Command {
	constructor(client) {
		super(client, {
			name: 'music-stop',
			aliases: ['mstop', 'music-end', 'mend', 'me'],
			group: 'music',
			memberName: 'music-stop',
			description: 'Stop the currently playing stream and leave the voice channel.',
			details: '',
			examples: ['music-stop']
		});
	}

	async run(msg) {
        const client = msg.client;
        const voiceChan = msg.member.voiceChannel;
        if (voiceChan && voiceChan.members.has(client.user.id)) {
			client.mediaPlayer.quitNow = true;
            client.mediaPlayer.voiceConn.player.dispatcher.end();
        } else {
            msg.reply(`since we're not in the same channel you don't get to tell me what to do! 🖕`);
        }
	}
};
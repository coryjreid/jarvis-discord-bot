const Commando = require('discord.js-commando'),
	  oneLine = require('common-tags').oneLine,
	  twitchStreams = require('twitch-get-stream')(process.env.TWITCH_CLIENT_ID),
	  ffmpeg = require('fluent-ffmpeg'),
	  Irc = require('node-irc'),
	  ircClient = new Irc('irc.chat.twitch.tv', 6667, process.env.TWITCH_IRC_USERNAME, process.env.TWITCH_IRC_USERNAME, process.env.TWITCH_IRC_TOKEN);

module.exports = class McatPlayCommand extends Commando.Command {
	constructor(client) {
		super(client, {
			name: 'mcatplay',
			aliases: ['mcatjoin'],
			group: 'music',
			memberName: 'mcatplay',
			description: 'Joins the voice channel you\'re currently in and streams Monstercat.',
			details: 'Joins the voice channel you\'re currently in and streams Monstercat music to your ears.',
			examples: ['mcatplay']
		});

		client.music = {
			streaming: false,
			ffmpegStream: null,
			voiceConnection: null,
			streamDispatcher: null
		};
	}

	async run(msg) {
		let client = msg.client;
		let twitch = client.mediaPlayer.twitch;
		let voiceChan = msg.member.voiceChannel;
		const botPerm = voiceChan.permissionsFor(client.user);
        
        // are we already streaming?
		if (client.mediaPlayer.voiceConn) return msg.reply(`I'm currently streaming! Join me in ${client.mediaPlayer.voiceConn.channel.name} and let's jam!`);
		// are you in a voice channel?
        if(!voiceChan) return msg.reply('you\'re not in a voice channel.');
		// can I connect to your voice channel?
        if(!botPerm.hasPermission('CONNECT')) return msg.reply('Insufficient Permissions. I\'m unable to join your voice channel.');
		// can I speak in your channel?
        if(!botPerm.hasPermission('SPEAK')) return msg.reply('Insufficient Permissions. I\'m unable to broadcast music in this channel.');
        
        // get the stream url
		await twitchStreams.get('monstercat').then(function (streams) {
			streams.forEach(function (stream) {
				if (stream.quality === 'Audio Only') twitch.url = stream.url;
			});
		});

		// build our ffmpeg object
		twitch.ffmpeg = await ffmpeg()
			.input(twitch.url).inputFormat('hls').format('mp3')
			.on('error', function (err, stdout, stderr) {
				console.log(err.message);
			});
		
		// join the channel and begin streaming
		await msg.member.voiceChannel.join().then(connection => {
			client.mediaPlayer.voiceConn = connection; // store our voiceConnection in client
			let voiceConn = client.mediaPlayer.voiceConn;
			//getStream(client, args.playlist, msg);
			voiceConn.playStream(twitch.ffmpeg)
				.on('start', () => {
					// console.log(`Now streaming monstercat...`);
					// let gameText = (currentSong ? currentSong : 'Monstercat Radio');
					// client.user.setGame(gameText, 'https://twitch.tv/monstercat');
				})
				.on('end', (reason) => {
					// console.log('Stopping stream...');
					twitch.ffmpeg.kill();
					voiceConn.channel.leave();
					client.mediaPlayer.voiceConn = null;
					client.mediaPlayer.twitch.ffmpeg = null;
					client.mediaPlayer = require('../../util/mediaPlayer.js');
				})
				.on('error', error => {console.log(error)});
		});
	}
};
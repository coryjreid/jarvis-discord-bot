const Commando = require('discord.js-commando');
const oneLine = require('common-tags').oneLine;
const youtube = require('googleapis').youtube({version: 'v3', auth: process.env.YOUTUBE_API_TOKEN});
const ytdl = require('ytdl-core');
const maxApiResults = 5;

module.exports = class YoutubePlayCommand extends Commando.Command {
	constructor(client) {
		super(client, {
			name: 'ytplay',
			aliases: ['yt-play', 'ytstart', 'ytp'],
			group: 'music',
			memberName: 'ytplay',
			description: 'Stream a YouTube video/playlist to the voice channel you\'re in.',
			details: '',
			examples: ['ytplay <video url>', 'ytplay <playlist url>'],

            args: [
				{
					key: 'playlist',
					label: 'playlist',
					prompt: 'is this a playlist?',
					type: 'boolean',
					infinite: false
				},
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
		const botPerm = voiceChan.permissionsFor(client.user);

		// are we already streaming?
		if (client.mediaPlayer.voiceConn) return msg.reply(`I'm currently streaming! Join me in ${client.mediaPlayer.voiceConn.channel.name} and let's jam!`);
		// are you in a voice channel?
        if(!voiceChan) return msg.reply('you\'re not in a voice channel.');
		// can I connect to your voice channel?
        if(!botPerm.hasPermission('CONNECT')) return msg.reply('Insufficient Permissions. I\'m unable to join your voice channel.');
		// can I speak in your channel?
        if(!botPerm.hasPermission('SPEAK')) return msg.reply('Insufficient Permissions. I\'m unable to broadcast music in this channel.');

		let choice = (args.playlist ? 'list' : 'v');
		let regex = new RegExp("^(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?.*?(?:"+choice+")=(.*?)(?:&|$)|^(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?(?:(?!=).)*\/(.*)$");
		let id = regex.exec(args.url)[1];

		// did we parse the URL correctly?
		if (!id) return msg.reply(`That doesn't appear to be a valid YouTube URL.`);

		client.mediaPlayer.msg = msg;

		if (args.playlist) {
			// we're given a playlist, setup
			addVids(client, id, client.mediaPlayer.yt.playlistNextPage, maxApiResults);
			client.mediaPlayer.yt.playlistId = id;
		} else {
			// we don't have a playlist, setup
			client.mediaPlayer.yt.playlistNextPage = null;
			client.mediaPlayer.yt.playlistId = null;
			client.mediaPlayer.yt.vids = [id];
		}

        // join the channel and begin streaming
		await msg.member.voiceChannel.join().then(connection => {
			client.mediaPlayer.voiceConn = connection; // store our voiceConnection in client
			getStream(client, args.playlist, msg);
		});		
	}
};

function getStream(client, playlist) {
	const voiceConn = client.mediaPlayer.voiceConn;
	const yt = client.mediaPlayer.yt;

	let vidId = yt.vids.shift();
	let stream = ytdl(vidId, {filter : 'audioonly'});

	if (playlist) {
		if (yt.vids.length == 0 && yt.playlistNextPage) {
			addVids(client, yt.playlistId, yt.playlistNextPage, maxApiResults);
		}
	}

	voiceConn.playStream(stream)
		.on('start', () => {
			
		})
		.on('end', (reason) => {
			let quit = client.mediaPlayer.quitNow;
			if (!quit && (yt.playlistNextPage || yt.vids.length > 0)) {
				getStream(client, playlist);
			} else {
				if (!quit) client.mediaPlayer.msg.reply(`playback complete.`);
				voiceConn.channel.leave();
				client.mediaPlayer.voiceConn = null;
				client.mediaPlayer = require('../../util/mediaPlayer.js');
			}
		})
		.on('error', error => {console.log(error)});
}

function addVids(client, playlistId, nextPage, maxResults) {
	const yt = client.mediaPlayer.yt;
	const options = {
		playlistId: playlistId,
		pageToken: nextPage,
		part: 'snippet',
		maxResults: maxResults
	};
	
	youtube.playlistItems.list(options, (err, data, res) => {
		if (err) console.log(err);
		yt.playlistNextPage = data.nextPageToken;
		data.items.forEach(item => {
			yt.vids.push(item.snippet.resourceId.videoId);
		});
	});
}

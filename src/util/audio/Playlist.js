const EventEmitter = require('events');
const env = process.env,
    urlParser = require('js-video-url-parser'),
    rp = require('request-promise-native').defaults({
        baseUrl: 'https://www.googleapis.com/youtube/v3',
        json: true,
        qs: {key: env.YOUTUBE_API_KEY}});
const twitchStreams = require('twitch-get-stream')(env.TWITCH_CLIENT_ID);

class Playlist extends EventEmitter {

    /**
     * @constructor
     */
    constructor() {
        super();
        this.list = [];
        this._pos = 0;
    }

    async init(args) {
        this.addItems(args);
    }

    length() {
        return this.list.length;
    }

    hasNext() {
        return this._pos <= this.list.length - 1;
    }

    hasPrev() {
        return this._pos > 0;
    }

    getNext() {
        return this.list[this._pos++];
    }

    async addItems(args) {
        const provider = urlParser.parseProvider(args.url);
        const parsed = urlParser.parse(args.url);
        let song = {provider: null, url: null};
        switch (provider) {
            case "youtube":
                if (parsed.list) {
                    await this.loadYouTubePlaylist(parsed.list);
                } else {
                    song.provider = provider;
                    song.url = parsed.id;
                    this.list.push(song);
                }
                break;
            case "twitch":
                song.provider = provider;
                // get the stream url
                await twitchStreams.get(parsed.channel).then(function (streams) {
                    streams.forEach(function (stream) {
                        if (stream.quality === 'Audio Only') song.url = stream.url;
                    });
                });
                this.list.push(song);
                break;
            default:
                this.emit('unknownProvider');
                this.list.push(args.url);
                break;
        }
    }

    loadYouTubePlaylist(id, pageToken = null) {
        return rp.get({
            uri: 'playlistItems',
            qs: {
                part: 'snippet',
                playlistId: id,
                maxResults: 50,
                pageToken: pageToken
            }
        }).then(res => {
            for(const item of res.items) {
                let song = {provider: null, url: null};
                song.provider = 'youtube';
                song.url = item.snippet.resourceId.videoId;
                this.list.push(song);
            }
            if(res.nextPageToken) return this.loadPlaylist(id, res.nextPageToken);
            return this;
        });
    }
}

module.exports = Playlist;

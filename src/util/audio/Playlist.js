const env = process.env,
    urlParser = require('js-video-url-parser'),
    rp = require('request-promise-native').defaults({
        baseUrl: 'https://www.googleapis.com/youtube/v3',
        json: true,
        qs: {key: env.YOUTUBE_API_KEY}});

class Playlist {

    /**
     * @constructor
     */
    constructor() {
        this.list = [];
        this._pos = 0;
    }

    async init(args) {
        if (urlParser.parseProvider(args.url) !== 'youtube') throw Error('Only YouTube links supported');
        const parsed = urlParser.parse(args.url);
        if (parsed.list) {
            await this.loadPlaylist(parsed.list);
        } else {
            this.list.push(parsed.id);
        }
    }

    length() {
        return this.list.length;
    }

    hasNext() {
        return this._pos <= this.list.length - 1;
    }

    loadPlaylist(id, pageToken = null) {
        return rp.get({
            uri: 'playlistItems',
            qs: {
                part: 'snippet',
                playlistId: id,
                maxResults: 50,
                pageToken: pageToken
            }
        }).then(res => {
            for(const item of res.items) this.list.push(item.snippet.resourceId.videoId);
            if(res.nextPageToken) return this.loadPlaylist(id, res.nextPageToken);
            return this;
        });
    }

    getNext() {
        return this.list[this._pos++];
    }
}

module.exports = Playlist;

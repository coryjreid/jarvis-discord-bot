const {EventEmitter} = require('events');
const ytdl = require('ytdl-core');
const Playlist = require('./Playlist');
const storage = require('../storage/playlists');
const ffmpeg = require('fluent-ffmpeg');

class Player extends EventEmitter {
    /**
     * @constructor
     * @param {VoiceConnection} conn
     * @param {Playlist} [list]
     */
    constructor(conn, list) {
        super();
        if(!conn) throw new Error('No voice connection');
        this.vc = conn;
        this.guild = conn.channel.guild;
        this.dispatcher = null;
        this.playlist = list || new Playlist();
        this.playlist.on('unknownProvider', (args) => {
            console.log('EVENT DETECTED');
            return this.vc.channel.leave();
        });
    }


    async init(args) {
        await this.playlist.init(args); // initialize our playlist
        await storage.set(this.guild.id, this); // store our player
        this.play(); // play the playlist
    }

    /**
     * Begin playing the playlist
     */
    async play() {
        const current = this.playlist.getNext();
        let stream = null;
        switch (current.provider) {
            case 'youtube':
                stream = await ytdl('https://www.youtube.com/watch?v='+current.url, {filter : 'audioonly'});
                break;
            case 'twitch':
                stream = await ffmpeg().input(current.url).inputFormat('hls').format('mp3')
                    .on('error', (err, stdout, stderr) => {console.log(err.message)});
                break;
            default:
                this._end('kill');
                break;
        }
        this.vc.playStream(stream);
        this.vc.player.dispatcher.once('end', this._end.bind(this));
    }

    /**
     *
     */
    skip() {

    }

    /**
     * The dispatcher end event listener.
     * @param reason
     * @private
     */
    _end(reason) {
        //if(reason === 'temp') return;
        //if(reason === 'terminal' || !this.playlist.hasNext()) return this._destroy();
        if (!this.playlist.hasNext() || reason === 'kill') {
            this.vc.player.dispatcher.end(reason);
            this.vc.channel.leave();
            storage.delete(this.guild.id);
        } else this.play();
    }
}

module.exports = Player;

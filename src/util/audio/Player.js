const {EventEmitter} = require('events');
const ytdl = require('youtube-dl');
const Playlist = require('./Playlist');
const storage = require('../storage/playlists');

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
        this.playlist = list || new Playlist();
        this.dispatcher = null;
    }


    async init(args) {
        await this.playlist.init(args); // initialize our playlist
        await storage.set(this.guild.id, this); // store our player
        this.play(); // play the playlist
    }

    /**
     * Begin playing the playlist
     */
    play() {
        this.vc.playStream(ytdl(this.playlist.getNext()));
        this.vc.player.dispatcher.once('end', this._end.bind(this));
    }

    /**
     * The dispatcher end event listener.
     * @param reason
     * @private
     */
    _end(reason) {
        //if(reason === 'temp') return;
        //if(reason === 'terminal' || !this.playlist.hasNext()) return this._destroy();
        if (!this.playlist.hasNext()) {
            this.vc.player.dispatcher.end(reason);
            this.vc.channel.leave();
            storage.delete(this.guild.id);
        } else this.play();
    }
}

module.exports = Player;

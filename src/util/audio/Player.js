const ytdl = require('ytdl-core');
const storage = require('../storage/playlists');
const Playlist = require('./Playlist');
const ffmpeg = require('fluent-ffmpeg');

class Player {
    constructor() {
        this.vc = null;
        this.guild = null;
        this.client = null;
        this._volume = null;
        this.playing = false;
        this.list = new Playlist();
    }

    /**
     *
     * @param voiceChan
     * @param msg
     * @param args
     * @returns {Promise}
     */
    init(voiceChan, msg, args) {
        this._volume = msg.client.settings.get('volume', 0.5);
        this.client = msg.client;
        this.guild = msg.guild;

        return new Promise((res, rej) => {
            if (this.list.getLength() > 0) this.list.addItems(args).then(res).catch(rej);
            else {
                this.list.init(args)
                    .then(() => {return voiceChan.join()})
                    .then(conn => {
                        this.vc = conn;
                        this.play();
                        storage.set(this.guild.id, this);
                        res();
                    }).catch(rej);
            }
        });
    }

    /**
     *
     * @param msg
     * @returns {Promise}
     */
    canPlay(msg) {
        return new Promise((res, rej) => {
            let vc = msg.member.voiceChannel;
            if (vc) {
                if (!vc.joinable) rej(`I can't join **${vc.name}**.`);
                if (!vc.speakable) rej(`I can't talk in **${vc.name}**`);
                res(vc);
            } else rej(`I don't see you in a voice channel.`);
        });
    }

    /**
     *
     * @param vol
     */
    setVolume(vol) {
        this._volume = vol / 100;
        this.client.settings.set('volume', this._volume);
        if (this.vc.player.dispatcher) this.vc.player.dispatcher.setVolumeLogarithmic(this._volume);
    }

    /**
     * Begin playing the playlist
     */
    play() {
        const current = this.list.getNext();
        let stream = ffmpeg().input(current).format('mp3');
        this.playing = true;
        this.vc.playStream(stream, { volume: this._volume });
        this.vc.player.dispatcher.once('end', this._end.bind(this));
    }

    /**
     *
     */
    stop() { this._end('kill'); }

    /**
     * The dispatcher end event listener.
     * @param reason
     * @private
     */
    _end(reason) {
        if (!this.list.hasNext() || reason === 'kill') {
            this.playing = false;
            this.vc.player.dispatcher.end(reason);
            this.vc.channel.leave();
            storage.delete(this.guild.id);
        } else this.play();
    }

    /**
     *
     * @param user
     * @param client
     * @returns {boolean}
     */
    static canControl(user, client) { return user.voiceChannel.members.has(client); }

    /**
     *
     * @param id
     * @returns Player()
     */
    static getPlayer(id) { return (storage.has(id) ? storage.get(id) : new this); }
}

module.exports = Player;

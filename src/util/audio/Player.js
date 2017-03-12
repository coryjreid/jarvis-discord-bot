const ytdl = require('ytdl-core');
const storage = require('../storage/playlists');
const Playlist = require('./Playlist');
const ffmpeg = require('fluent-ffmpeg');

class Player {
    constructor() {
        this.vc = null;
        this.guild = null;
        this.list = new Playlist();
    }

    init(voiceChan, msg, args) {
        this.guild = msg.guild;
        return new Promise((res, rej) => {
            this.list.init(args).then((res) => {return voiceChan.join()}).then(conn => {
                this.vc = conn;
                this.play();
                storage.set(this.guild.id, this);
                res();
            }).catch(rej);
        });
    }

    canPlay(msg) {
        return new Promise((res, rej) => {
            let vc = msg.member.voiceChannel;
            if (vc) {
                if (!vc.joinable) rej(`Can't join ${vc.name}.`);
                if (!vc.speakable) rej(`Can't talk in ${vc.name}`);
                res(vc);
            } else rej(`You're not in a voice channel.`);
        });
    }

    /**
     * Begin playing the playlist
     */
    play() {
        const current = this.list.getNext();
        let stream = null;
        switch (current.provider) {
            case 'youtube':
                stream = ytdl('https://www.youtube.com/watch?v='+current.url, {filter : 'audioonly'});
                break;
            case 'twitch':
                stream = ffmpeg().input(current.url).inputFormat('hls').format('mp3');
                break;
            default:
                // we should never hit this unless our playlist is garbo
                break;
        }
        this.vc.playStream(stream);
        this.vc.player.dispatcher.once('end', this._end.bind(this));
    }

    stop() {
        this._end('kill');
    }

    /**
     * The dispatcher end event listener.
     * @param reason
     * @private
     */
    _end(reason) {
        //if(reason === 'temp') return;
        //if(reason === 'terminal' || !this.playlist.hasNext()) return this._destroy();
        if (!this.list.hasNext() || reason === 'kill') {
            this.vc.player.dispatcher.end(reason);
            this.vc.channel.leave();
            storage.delete(this.guild.id);
        } else this.play();
    }

    static canControl(msg) {
        return msg.member.voiceChannel.members.has(msg.client.user.id);
    }

    static getPlayer(msg) {
        return (storage.has(msg.guild.id) ? storage.get(msg.guild.id) : new this);
    }
}

module.exports = Player;

const spawn = require('child_process').spawn;
const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('utf8');

class Playlist {

    /**
     * @constructor
     */
    constructor() {
        this.list = [];
        this._repeat = null;
        this._position = 0;
    }

    init(args) {
        this._repeat = args.repeat;
        return this.addItems(args);
    }

    hasNext() {
        const next = (this._position <= this.list.length - 1);
        if (this._repeat) {
            if (!next) {
                this._position = 0;
                return true;
            }
        }
        return next;
    }

    hasPrev() { return this._position > 0; }

    getNext() { return this.list[this._position++]; }

    getLength() { return this.list.length; }

    async addItems(args) {
        return new Promise((res, rej) => {
            const ytdl = spawn('youtube-dl', ['-s', '-g', '-i', '-f bestaudio', args.url]);
            let errors = [], count = 0;

            ytdl.stdout.on('data', (data) => {
                ++count;
                this.list.push(decoder.write(data).trim());
            });

            ytdl.stderr.on('data', (data) => {
                const error = decoder.write(data).trim();
                const errorHeader = 'ERROR: ';
                if (error.startsWith(errorHeader)) errors.push(error.slice(errorHeader.length));
            });

            ytdl.on('close', (code) => {
                if (errors.length > 0) {
                    if (this.list.length === 0) rej(errors);
                    res(errors);
                }
                res();
            });
        });
    }
}

module.exports = Playlist;

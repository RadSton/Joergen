'use strict';
const ytdl = require("ytdl-core");
const dcytdl = require("discord-ytdl-core");

class Track {
    
    constructor(url) {
        this.stream = undefined;
        this.data = {
            url,
            durationSeconds: 0,
            title: "",
            artist: "",
            videoId: "",
            familySafe: true,
            description: ""
        }
    }

    async load() {
        if(this.data.artist != "") return;
        var info = await ytdl.getInfo(this.data.url).catch(console.error);

        this.data.durationSeconds = info.videoDetails.lengthSeconds;
        this.data.artist = info.videoDetails.author;
        this.data.description = info.videoDetails.description;
        this.data.title = info.videoDetails.title;
        this.data.videoId = info.videoDetails.video_url;
        this.data.familySafe = info.videoDetails.isFamilySafe;

        return this.data;
    }

    insert(data) {
        console.log
        this.data.durationSeconds = data.duration / 1000;
        this.data.artist = data.channel.name;
        this.data.description = "";
        this.data.title = data.title;
        this.data.videoId = data.id;
        this.data.familySafe = true;
    }


    async getStream(seekTime, filters, force) {
        if(this.stream == undefined || force) {
            if(this.stream != undefined) {
                this.drain();
            }
            if(force) {
                this.drain();
                this.stream = null;
            }
            
            if(this.data.durationSeconds > 2500){
                this.stream = await dcytdl(this.data.url, {
                    highWaterMark: 1048576 * 16,
                    filter: "audioonly",
                    quality: "lowestaudio",
                    opusEncoded: false,
                    fmt: "s16le",
                    encoderArgs: (filters == "" ? [] : ["-af", filters]),
                    seek: (!seekTime ? 0 : seekTime / 1000)
                });
            } else this.stream = await dcytdl(this.data.url, {
                highWaterMark: 1048576 * 8,
                filter: "audioonly",
                quality: "lowestaudio",
                opusEncoded: false,
                fmt: "s16le",
                encoderArgs: (filters == "" ? [] : ["-af", filters]),
                seek: (!seekTime ? 0 : seekTime / 1000)
            });
        }
        // CONSOLE : LOADED STREAM
        return this.stream;
    }

    hasStream() {
        return this.stream != undefined;
    }

    getData() {
        return this.data;
    }

    getUrl() {
    }

    drain() {
        if(this.stream != undefined) {
            this.stream.end();
            this.stream.read();
        }
    }

    destroy() {     
        this.drain();
        this.stream = null;
        this.data = null;
    }
    
}
module.exports = {
    Track
};

'use strict';
const ytdl = require("ytdl-core");
const dcytdl = require("discord-ytdl-core");

class Track {
    
    constructor(url, user) {
        this.url = url;
        this.isYoutubeLink = url.toLowerCase().includes("youtu"); 
        this.loaded = false;
        this.info = undefined;
        this.stream = undefined;
        this.addedBy = user;
        this.data = {
            durationSeconds: 0,
            title: "",
            artist: "",
            videoId: "",
            familySafe: true,
            description: ""
        }
        this.streamData = [];
    }

    async load() {
        if(this.loaded) return;
        this.info = await ytdl.getInfo(this.url).catch(console.error);

        this.loaded = true;

        this.data.durationSeconds = this.info.videoDetails.lengthSeconds;
        this.data.artist = this.info.videoDetails.author;
        this.data.description = this.info.videoDetails.description;
        this.data.title = this.info.videoDetails.title;
        this.data.videoId = this.info.videoDetails.video_url;
        this.data.familySafe = this.info.videoDetails.isFamilySafe;

        return this.data;
    }

    insertData(data) {
        this.data.durationSeconds = data.duration / 1000;
        this.data.artist = data.channel.name;
        this.data.description = "";
        this.data.title = data.title;
        this.data.videoId = data.id;
        this.data.familySafe = true;
        
        this.loaded = true;
    }


    async getStream(seekTime, filters, force, priority) {
       // if(!this.loaded) this.load();
        if(this.stream == undefined || force) {
            if(this.stream != undefined) {
                // CONSOLE: CLOSING STREAM +this.data.title
                this.drain();
            }

            this.streamData = filters;
            if(filters.length != 0 && !filters.includes("-af"))
                filters.unshift("-af");
            if(this.data.durationSeconds > 2500){
                this.stream = await dcytdl(this.url, {
                    highWaterMark: 1048576 * 50,
                    filter: "audioonly",
                    quality: "lowestaudio",
                    opusEncoded: false,
                    fmt: "s16le",
                    encoderArgs: filters,
                    seek: (!seekTime ? 0 : seekTime / 1000)
                });
            } else this.stream = await dcytdl(this.url, {
                highWaterMark: 1048576 * 32,
                filter: "audioonly",
                quality: "lowestaudio",
                opusEncoded: false,
                fmt: "s16le",
                encoderArgs: filters,
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

    getBufferTime() {
        if(this.loaded) return ((this.data.durationSeconds -20) *1000);
        return 20000;
    }

    getUrl() {
       return this.url; 
    }

    drain() {
        if(!this.hasStream()) return;
        this.stream.end();
        this.stream.read();
        this.stream = undefined;
    }

    destroy() {
        this.drain();
        this.url = null;
        this.isYoutubeLink = null; 
        this.loaded = null;
        this.info =  null;
        this.stream =null;
        this.addedBy = null;
        this.data = null
        this.streamData = null;
        
    }
    
}
module.exports = {
    Track
};

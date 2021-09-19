'use strict';

const {
    AudioPlayerStatus,
    createAudioPlayer,
    entersState,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
    createAudioResource,
    StreamType } = require('@discordjs/voice');
const Discord = require("discord.js");

const { TextChannel } = require('discord.js');
const { Queue } = require('./Queue');


class Player {

    /**
     * 
     * @param {Queue} queue 
     * @param {TextChannel} channel 
     */
    constructor(queue, channel, calb) {
        this.playing = false;
        this.queue = queue;
        this.loop = "off";
        this.shuffle = true;
        this.guildId = queue.getGuild();
        this.audioPlayer = createAudioPlayer();
        this.volume = 1;
        this.textChannel = channel;
        this.resource = undefined;
        this.currentSong = undefined;
        this.connnections = [];
        this.isReconnecting = false;
        this.isAudioRecorder = false;
        this.queueLock = false;
        this.isPaused = false;
        this.errors = 0;
        this.closeCallback = calb;
        this.filters = [];
        this.overwriteStream = false;
    }

    /**
     * 
     * @param {VoiceConnetion} connnection 
     * @returns 
     */

    async joinListening(connnection) {
        if(this.connnections.includes(connnection)) return;
        this.connnections.push(connnection);

        /*
            @params ns -> NEW STATE
        */
        connnection.on("stateChange", async (oldState, ns) => {
            if(ns.status == VoiceConnectionStatus.Disconnected ) {
                if(ns.reason == VoiceConnectionDisconnectReason.WebSocketClose && ns.closeCode == 4014) {
                    try {
                        await entersState(connnection, VoiceConnectionStatus.Connecting, 5000)
                    } catch {
                        connnection.destroy(false);
                        this.connnections.splice(this.connnections.indexOf(connnection), 1);
                        if(this.connnections.length == 0) {
                            this.stop();
                        }
                    }
                } else if(connnection.rejoinAttemps < 5) {
                    if(this.isReconnecting) return;
                    var c = setTimeout(() => {
                        clearTimeout(c);
                        if(this.queue == undefined) return;
                        connnection.rejoin();
                        this.isReconnecting = false;
                    }, (connnection.rejoinAttemps + 1) * 5000)
                } else {
                    connnection.destroy(false);
                    this.connnections.splice(this.connnections.indexOf(connnection), 1);
                    if(this.connnections.length == 0) {
                        this.stop();
                    }
                }
            } else if(ns.status == VoiceConnectionStatus.Destroyed) { 
                if(this.connnections.length == 0 && this.queue != null)
                    this.stop();
            } else if(ns.status == VoiceConnectionStatus.Connecting || ns.status == VoiceConnectionStatus.Signalling)  {
                try {
                    await entersState(connnection,VoiceConnectionStatus.Ready,20000);
                } catch {
                    if(connnection.state.status != VoiceConnectionStatus.Destroyed) {
                        connnection.destroy(false);
                        this.connnections.splice(this.connnections.indexOf(connnection), 1);
                        if(this.connnections.length == 0) {
                            this.stop();
                        }
                    }
                }
            }
        });

        await this.initAudioPlayer();
        
        connnection.subscribe(this.audioPlayer);
    }

    async initAudioPlayer() {
        if(this.audioPlayer == undefined) return;

        this.audioPlayer.on("stateChange", async (os, ns) => {
            if(ns.status == AudioPlayerStatus.Idle && 
                os.status != AudioPlayerStatus.Idle) {
                this.playing = false;
                if(!this.overwriteStream) await this.nextSong();
                    else this.overwriteStream = false;
            } else if(ns.status == AudioPlayerStatus.Playing) {
                this.playing = true;
                this.isPaused = false;
            }  else if(ns.status == AudioPlayerStatus.Paused) {
                this.isPaused = true;
                this.isPlaying = false;
            } else if(ns.status == AudioPlayerStatus.AutoPaused) {
                this.isPaused = true;
                this.isPlaying = false;
            } else if(ns.status == AudioPlayerStatus.Buffering) {
                this.isPaused = false;
                this.isPlaying = false;
            }
        });

        this.audioPlayer.on("error", (m) => {
            if(this.currentSong)
                this.currentSong.drain();
        } );
        //this.audioPlayer.on("debug", (m) => console.log("[VOICE - DEBUG]", m) );
        this.isAudioRecorder = true;
        if(!this.queue.isEmpty()) await this.nextSong();
    }

    stop() {
        if(this.queue == null) {
            // HALT DIE FRESSE 
            return;
        }
        this.queueLock = true;
        this.overwriteStream = true;
        //TODO: Code!
        //this.channel.send({ embeds: [new Discord.MessageEmbed().setDescription("Ich geh dann mal!")] })
        if(this.resource != undefined)
            this.resource.playStream.end();
        if(this.resource != undefined)
            this.resource.playStream.read();
        if(this.queue != undefined)
            this.queue._drainAll();
        if(this.queue != undefined)
            this.queue.unloadEveryThing();
        this.queue = undefined;
        if(this.resource != undefined && !this.resource.playStream.Destroyed){
            this.resource.playStream.end();
            this.resource.playStream.read();
        }  
        this.audioPlayer.stop(true);
        try {
            for(var i = 0; i < this.connnections.length; i++) {
                if (this.connnections[i].state.status != VoiceConnectionStatus.Destroyed){
                    this.connnections[i].disconnect();
                    this.connnections[i].destroy(false);

                }
            }
        } catch {}

        this.playing = null;
        this.queue = null;
        this.loop = null;
        this.shuffle = null;
        this.audioPlayer = null;
        this.volume = null;
        this.textChannel = null;
        this.resource = null;
        this.currentSong = null;
        this.connnections = null;
        this.isReconnecting = null;
        this.isAudioRecorder = null;
        this.queueLock = null;
        this.isPaused = null;
        this.errors = null;
        this.filters = null;
        this.overwriteStream = null;
        this.guildId = null;
        if(this.closeCallback != null)
            this.closeCallback("destroy", this.guildId);
        this.closeCallback = null;
    }

    async enableFilter(filter) {

        if(this.filters.length != 0) if(this.filters[0].includes("-af")) this.filters.shift();

        var argument = filter.split("=")[0];

        if(this.filters.length == 0) {
            this.filters.push(filter);
        } else if(filter.includes(argument) && this.filters[0].includes(argument)) {
            if(this.filters[0].includes(",")){
                let active = this.filters[0].split(",");
                this.filters[0] = "";
                for(var i = 0; i< active.length;i++) {
                    var current = active[i];
                    if(current.includes(argument)) {
                        this.filters[0] += filter + ",";
                    } else {
                        this.filters[0] += filter + ",";
                    }
                }
            } else {
                this.filters[0] = filter;
            }
        } else {
            this.filters[0] += "," +  filter;
        }

        this.overwriteStream = true;
        var time = this.resource.playbackDuration;
        try {

            this.audioPlayer.stop();
            //this.resource.playStream.end();
            //this.resource.playStream.read();
            this.queue._drainAll();
            const stream = await this.currentSong.getStream(time,this.filters,true, 100);
            this.resource = createAudioResource(stream, {
                inputType: StreamType.Raw
            });
            // CONSOLE: Starting playing new resource
            this.audioPlayer.play(this.resource);
        } catch (er) {
            console.error(er);
            if(this.resource != undefined && !this.resource.playStream.Destroyed){
                this.resource.playStream.end();
                this.resource.playStream.read();
            }   
            await this.nextSong();
        }
        this.queue.reloadSongsInQueue(this.filters)
        this.overwriteStream = false;
    } 

    async skip() {
        if(!this.playing) return false;
        try {
            this.audioPlayer.stop(true);
            return true;
        } catch (error) {
            console.error(error);
        }
        return false;
    }

    clearMusic() {
        try {
            this.overwriteStream = true;
            if(this.playing) this.audioPlayer.stop();
            if(this.resource != undefined && !this.resource.playStream.Destroyed){
                this.resource.playStream.end();
                this.resource.playStream.read();
            }  
            this.resource = undefined;
            this.currentSong = undefined;
            this.queue.clear();
        } catch (error) {
            console.error(error);
        }
    }


    async nextSong() {
        if(this.queueLock || this.audioPlayer.state.status != AudioPlayerStatus.Idle) return;
        this.queueLock = true;

        if(this.queue.isEmpty() && this.loop.includes("off")) {
            // CONSOLE: Log Queue is empty
            var a = setTimeout(() => {
                clearTimeout(a);
                if(this.queue == undefined) return;
                if(this.queue.isEmpty() && !this.playing && this.queueLock) {
                    this.textChannel.send({ embeds: [new Discord.MessageEmbed().setDescription("Ich mach mich dann mal vom Acker!")] })
                    this.stop();
                }
            }, 60 * 1000)
            return;
        }

        var next = undefined;
        if(this.loop.includes("track")) {
            next = this.queue.loopTrack(this.currentSong);
        } else if(this.loop.includes("queue")) {
            next = this.queue.loopQueue(this.currentSong);
        } else {
            next = this.queue.getNext(this.currentSong);
        }

        this.currentSong = next;
        try {
            if(this.currentSong == undefined) {
                this.queueLock = false;
                return;
            }
            /*console.log("Called async nextSong()");
            console.log("Loading Track: " + this.currentSong.getData().title);
            console.log("Mode: " + this.loop);
            console.log("LoopMode: ", !this.loop.includes("off") ? "on" :  "off")*/
            const stream = !this.loop.includes("off") ? await this.currentSong.getStream(0,this.filters,true, 100) :  await this.currentSong.getStream(0,this.filters,false, 100)  ;
            
            if(this.resource != undefined && !this.resource.playStream.Destroyed){
                this.resource.playStream.end();
                this.resource.playStream.read();
            }  
            this.resource = createAudioResource(stream, {
                inputType: StreamType.Raw
            });
            // CONSOLE: Starting playing new resourceif(next.getUrl() != this.currentSong.getUrl()) return;
            this.audioPlayer.play(this.resource);

            //console.log(this.currentSong.getBufferTime()); // FOR DEVELOPMENT
            var b = setTimeout(() => {
                clearTimeout(b);
                if(this.queue == undefined) return;
                if(this.currentSong == undefined) return;
                if(next.getUrl() != this.currentSong.getUrl()) return;
                if(this.queue.isEmpty()) {
                    // CONSOLE: Buffer is empty
                    return;
                }
                // CONSOLE: Buffering started!
                this.queue.prepairNextSong(this.filters);
            }, 2000);
            this.queueLock = false;
        } catch(err) {
            this.queueLock = false;
            this.errors++;
            if(this.resource != undefined && !this.resource.playStream.Destroyed){
                this.resource.playStream.end();
                this.resource.playStream.read();
            }  
            console.log("Playing Error")
        }
    }

    async addSongToQueue(track) {
        await this.queue.addToQueue(track);
        if(this.queue.isLastSong() && !this.playing && this.queueLock) {
            this.queueLock = false;
            await this.nextSong();
        }
        if(this.queue.getSize() == 2) {
            await track.getStream(0,this.filters, false, 1);
        }
        if(!this.playing && !this.pause && !this.queueLock) {
            await this.nextSong();
        }
    }

    getQueue(){
        return this.queue;
    }

    loopMode(mode) {
        this.loop = mode;
    }

    async back() {
        if(await this.queue.back(this.filters)) {
            this.skip();
        } else return false;
    }

    pause() {
        if(this.isPaused) return false;
        this.isPaused = true;
        this.audioPlayer.pause();
        return this.isPaused;
    }

    resume() {
        if(!this.isPaused) return false;
        this.isPaused = false;
        this.audioPlayer.unpause();
        return !this.isPaused;
    }

    getCurrent() {
        return this.currentSong;
    }

    getLast() {
        return this.queue.getLast();
    }


}

module.exports = {
    Player
};
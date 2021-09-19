'use strict';
const {
    AudioPlayerStatus,
    createAudioPlayer,
    entersState,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
    createAudioResource,
    StreamType, 
    VoiceConnection} = require('@discordjs/voice');
const { throws } = require('assert');

const { TextChannel, MessageEmbed } = require('discord.js');



class Player { 
    /**
     * 
     * @param {VoiceConnection} connection 
     * @param {TextChannel} channel 
     * @param {Function} calb 
     */
    constructor(connection,channel, calb) {
        this.audioPlayer = createAudioPlayer();
        this.resource = undefined;
        this.queue = {next: [], last: [], currentSong: undefined};
        this.audioSettings = {loop: "off", filter: "", broadcast: channel}
        this.status = {queueLock: false, paused: false, playing: false, ignore: 0};
        this.channel = channel;
        this.callback = calb;

        this.audioPlayer.on("stateChange", async (os, ns) => {
            if(ns.status == AudioPlayerStatus.Idle && 
                os.status != AudioPlayerStatus.Idle) {
                this.status.playing = false;
                if(this.status.ignore < 1) await this.nextSong(1); else this.status.ignore--;
            } else if(ns.status == AudioPlayerStatus.Playing) {
                this.status.playing = true;
                this.status.paused = false;
            }  else if(ns.status == AudioPlayerStatus.Paused) {
                this.status.paused = true;
                this.status.playing = false;
            } else if(ns.status == AudioPlayerStatus.AutoPaused) {
                this.status.paused = true;
                this.status.playing = false;
            } else if(ns.status == AudioPlayerStatus.Buffering) {
                this.status.paused = false;
                this.status.playing = false;
            }
        });

        connection.on("stateChange", async (o, ns) => {
            if(ns.status == VoiceConnectionStatus.Disconnected ) {
                if(ns.reason == VoiceConnectionDisconnectReason.WebSocketClose && ns.closeCode == 4014) {
                    try {await entersState(connection, VoiceConnectionStatus.Connecting, 5000)} catch {
                        this.stop();
                    }
                } else if(connection.rejoinAttemps < 5) {
                    var c = setTimeout(() => {clearTimeout(c);if(this.queue == undefined) return; connection.rejoin()}, (connection.rejoinAttemps + 1) * 5000)
                } else {
                    this.stop();
                }
            } else if(ns.status == VoiceConnectionStatus.Destroyed) { 
                this.stop();
            } else if(ns.status == VoiceConnectionStatus.Connecting || ns.status == VoiceConnectionStatus.Signalling)  {
                try {await entersState(connection,VoiceConnectionStatus.Ready,20000);} catch {
                    this.stop();
                }
            }
        });

        this.audioPlayer.on("error", (m) => {
            if(this.currentSong)
                this.currentSong.drain();
        } );
        //this.audioPlayer.on("debug", (m) => console.log("[VOICE - DEBUG]", m) );
        this.connection = connection;
        this.connection.subscribe(this.audioPlayer);
        if(this.queue.next.length != 0) this.nextSong(1);
    }

    async enableFilter(filter) {
        this.audioSettings.filter = filter;
        this.status.ignore++;
        this.audioPlayer.stop(true);
        if(this.audioSettings.loop == "off") {
            this.audioSettings.loop = "on";
            await this.nextSong(this.resource.playbackDuration)
            this.audioSettings.loop = "off";
        } else await this.nextSong(this.resource.playbackDuration)
    }

    async nextSong(seekTime = 0, force = false){
        if(this.status.queueLock || this.audioPlayer.state.status != AudioPlayerStatus.Idle) return;
        this.status.queueLock = true;
        
        if(this.queue.next.length == 0 && this.audioSettings.loop.includes("off")) {
            var a = setTimeout(() => {
                clearTimeout(a);
                if(this.queue.next == null) return;
                if(this.queue.next.length == 0 && !this.status.playing && this.queueLock) {
                    this.channel.send({ embeds: [new MessageEmbed().setDescription("Ich mach mich dann mal vom Acker!")] })
                    this.stop();
                }
            }, 60 * 1000)
            return;
        }

        if(this.resource != undefined && !this.resource.playStream.Destroyed){
            this.resource.playStream.end();
            this.resource.playStream.read();
        }  

        if(this.queue.currentSong) {
            this.queue.currentSong.drain();
        }

        // this.queue.currentSong.createStream(0,this.audioSettings.filter, (this.audioSettings.loop == "on"));
        switch(this.audioSettings.loop) {
            case 'on': 
                if(!this.queue.currentSong) {
                    this.queue.currentSong = this.queue.next.shift();
                }
                break;
            case 'off': 
                if(this.queue.currentSong != undefined && !this.queue.last.includes(this.queue.currentSong)) this.queue.last.push(this.queue.currentSong);
                this.queue.currentSong = this.queue.next.shift();
                break;
            default:
                if(this.queue.currentSong != undefined && !this.queue.last.includes(this.queue.currentSong)) this.queue.last.push(this.queue.currentSong);
                this.queue.currentSong = this.queue.next.shift();
                break;
        }

        try {
            if(force == false) force = (this.audioSettings.loop == "on");

            this.resource = createAudioResource(await this.queue.currentSong.getStream(seekTime,this.audioSettings.filter, force, 0), {
                inputType: StreamType.Raw
            }); 

            global.botUser.setPresence({ activities: [{ name: '' + this.queue.currentSong.getData().artist, type:"LISTENING"}], status: 'online' });

            this.audioPlayer.play(this.resource);
            this.status.queueLock = false;
        } catch (error) {
            this.status.queueLock = false;
            if(this.audioSettings.loop == "on") this.skip(); else this.audioPlayer.stop(true);
            console.log(error);
            console.log("Skipping to the next song because of an error!");
        }

    }    

    async addSongToPlay(track) {
        this.queue.next.push(track);
        if(!this.status.playing && !this.status.paused) {
            this.status.queueLock = false; 
            await this.nextSong(1);
            return true;
        } 
        return false;
    }

    stop() {
        this.connection.removeAllListeners();
        this.connection.disconnect()
        this.connection.destroy(true);
        this.audioPlayer.removeAllListeners();
        this.audioPlayer.stop(true);

        this.audioPlayer = null;
        this.resource = null;
        
        this.audioSettings = {loop: null, filter: null, broadcast: null}
        this.status = {queueLock: null, paused: null, playing: null};
        if(this.queue.currentSong) {
            this.queue.currentSong.destroy();
        }
        for(var i = 0; i < this.queue.next.length; i++) {
            this.queue.next[i].destroy();
        }
        for(var i = 0; i < this.queue.last.length; i++) {
            this.queue.last[i].destroy();
        }
        this.queue = {next: null, last: null, currentSong: null};
        this.callback("destroy", undefined);
        this.callback = null;
        this.channel = null;
    }

    pause() {
        if(this.status.paused) return false;
        this.status.paused = true;
        this.audioPlayer.pause();
        return true;
    }

    resume() {
        if(!this.status.paused) return false;
        this.status.paused = false;
        this.audioPlayer.unpause();
        return true;
    }

    async skip() {
        if(this.status.paused) this.resume();
        if(this.status.playing && this.audioSettings.loop.includes("off")) {
            this.audioPlayer.stop(true);
            return "Der Song wurde übersprungen!";
        } else if(this.status.playing && !this.audioSettings.loop.includes("off")) {
            this.status.ignore++;
            this.audioPlayer.stop(true);
            this.audioSettings.loop = "off";
            await this.nextSong(1);
            this.audioSettings.loop = "on";
            return "Der Song wurde übersprungen!";
        }
        if(this.queue.next.length == 0) {
            this.audioPlayer.stop(true);
            return "Der Player wurde pausiert da kein Song mehr in der Liste ist";
        } else
            this.audioPlayer.stop(true);
        return "Der Song wurde warscheinlich Überspringen";
    }

    async back() {
        if(this.queue.last.length == 0) {
            this.audioPlayer.stop();
            return "Der Player wurde gestoppt da er keinen Song finden konnte!";
        }
        this.queue.next.unshift(this.queue.last.pop());
        if(this.audioSettings.loop.includes("on")) {
            this.status.ignore++;
            this.audioPlayer.stop(true);
            this.audioSettings.loop ="off";
            await this.nextSong(1, true);
            this.audioSettings.loop = "on";
            return "Der zuletztabgespielte Song wird nun abgespielt";
        } else {
            this.status.ignore++;
            this.audioPlayer.stop(true);
            await this.nextSong(1, true);
            return "Der zuletztabgespielte Song wird nun abgespielt!";
        }
    }
    
    getCurrentSongInfo() {
        if(this.queue.currentSong != undefined) {
            return this.queue.currentSong.getData();
        }
        if(this.queue.next.length != 0) {
            return this.queue.next[0].getData();
        } 
        return {
            title: "ein Lied",
            videoId: "gAjR4_CbPpQ"
        }
    }

    getLastSongInfo() {
        console.log(this.queue);
        if(this.queue.next.length != 0) {
            return this.queue.next[this.queue.next.length-1].getData();
        } 
        return {
            title: "ein Lied",
            videoId: "gAjR4_CbPpQ"
        }
    }
}

module.exports = {
    Player
};

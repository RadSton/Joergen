'use strict';
class Queue {

    constructor(guildId, client) {
        this.guildId = guildId;
        this.client = client;
        this.tracks = [];
        this.previousTracks = [];
        this.isLooped = false;
        this.loopIndex = 0;
        this.toLoop = [];
        this.ignoreNext = false;
    }

    getGuild() {
        return this.guildId;
    }

    getClient() {
        return this.client;
    }

    loopTrack(track) {
        if(this.isLooped) resetLoop();
        if(track == undefined) return this.getNext(track);
        return track;
    }

    loopQueue(track) {
        if(this.toLoop.length != this.tracks.length) {
            this.toLoop.slice(0,this.toLoop.length);
            this.toLoop = Array.from(this.tracks);
        }

        if(!this.isLooped) this.isLooped = true;

        this.loopIndex++;

        if(this.loopIndex > this.toLoop.length) this.loopIndex = 1;
        
        return this.toLoop[this.loopIndex -1];
    }

    getNext(track) {
        if(this.isLooped) resetLoop();
        if(track != undefined && !this.ignoreNext) {
            track.drain();
            this.previousTracks.push(track);
        } else if(this.ignoreNext) this.ignoreNext = false;
        var a = this.tracks.shift()
        this.client.setPresence({ activities: [{ name: '' + a.getData().artist, type:"LISTENING"}], status: 'online' });
        return a;
    }

    _drainAll() {
        for(var i = 0;i > this.tracks.length;i++) {
            if(this.tracks[i] != undefined)
            this.tracks[i].drain();
        }
        for(var i = 0;i > this.previousTracks.length;i++) {
            if(this.previousTracks[i] != undefined)
            this.previousTracks[i].drain();
        }
    }

    async prepairNextSong(filters) {
        if(this.isEmpty()) return;
        await this.tracks[0].getStream(0,filters,false, -1);
        if(!this.isLastSong())
        await this.tracks[1].load();
    }
    
    resetLoop() {
        this.toLoop.slice(0,this.toLoop.length);
        this.loopIndex = 0;
        this.isLooped = false;
    }

    isEmpty() {
        return this.tracks.length == 0;
    }

    isLastSong() {
        return this.tracks.length == 1;
    }
    
    searchInQueue(st) {
        var toRet = [];
        for(var i = 0; i < this.tracks.length; i++) {
            if(this.tracks[i].getData().title.toLowerCase().includes(st.toLowerCase())) {
                toRet.push(this.tracks[i]);
            }
        }
        return toRet;
    }

    async addToQueue(track) {
        this.tracks.push(track);
    }

    remove(a) {
        if(this.tracks.includes(a)) {
            this.tracks.filter(track => track.getUrl() != a.getUrl());
        }
    }

    clear() {
        this.tracks = [];
    }

    getSize() {
        return this.tracks.length;
    }

    getLast() {
        return this.tracks[this.tracks.length -1];
    }

    reloadSongsInQueue(filter) {
        for(var i = 0; i < this.tracks.length; i++) {
            if(this.tracks[i].hasStream()) {
                this.tracks[i].getStream(0,filter,true, 1);
            }
        }
    }

    unloadEveryThing() {
        for(var i = 0;i> this.tracks.length;i++) {
            if(this.tracks[i] != undefined){
                this.tracks[i].drain();
                this.tracks[i].destroy();
            }
        }
        for(var i = 0;i> this.previousTracks.length;i++) {
            if(this.previousTracks[i] != undefined){
                this.previousTracks[i].drain();
                this.previousTracks[i].destroy();
            }
        }
        this.guildId = null;
        if(!global.devMode) 
            this.client.setPresence({ activities: [{ name: 'Minecraft Music', type:"LISTENING"}], status: 'idle' });
        else this.client.setPresence({ activities: [{ name: 'DEVMODE', type:"PLAYING"}], status: 'dnd' });
        this.client = null;
        this.tracks = null;
        this.previousTracks = null;
        this.isLooped = null;
        this.loopIndex = null;
        this.toLoop = null;
        this.ignoreNext = null;
    }

    async back(filters) {
        this.ignoreNext = true;
        if(this.previousTracks.length != 0) {
            const a = this.previousTracks.shift()
            await a.getStream(0,filters,true,100);
            this.tracks.push(a);
            return true;
        }
        return false;
    }

}
module.exports = {
    Queue
}
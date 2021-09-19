'use strict';

const Player = require("./Player.js");
const Track = require("./Track.js");

const YouTube = require("youtube-sr").default;
const { Client, TextChannel, User } = require("discord.js");


/**
 * @param {Player.Player} players
 */
let players = new Map();   

/**
 * @param {Client} client 
 * @param {TextChannel} channel 
 * @returns
 */
exports.createPlayer = function createPlayer(client, channel, voiceConnection) {
    if(players.has(channel.guildId)) return false;
    client.user.setPresence({ activities: [{ name: 'Music', type:"LISTENING"}], status: 'online' });
    var player = new Player.Player(voiceConnection, channel,(type, data) => {
        //AFTER CLOSE // GETS CALLED AFTER this.stop(); !! OR ON CRASH !! OR ON EMPTY QUEUE
        if(type == "destroy"){ 
            players.set(channel.guildId,null);
            players.delete(channel.guildId);
            client = null;
            channel = null;
            player = null;

              try {
                if (global.gc) {global.gc();}
              } catch (e) {
                console.log("`Enable --expose-gc by adding it to the command arguments! It saves memory!`");
                process.exit();
              }
            }

    });
    players.set(channel.guildId,player);
    return true;
}

/**
 * 
 * @param {Object} guildId 
 * @param {Track} track 
 * @returns 
 */

exports.addSong = function addSong(guildId, track) {
    if(!players.has(guildId)) return false;
    players.get(guildId).addSongToQueue(track);
    return true;
}

/**
 * 
 * @param {Object} guildId 
 * @param {Object} url 
 * @param {User} member
 * @returns 
 */
exports.addSongByURL = function addSongByURL(guildId, url, member) {
    if(!players.has(guildId)) return false;
    const track = new Track.Track(url, member);
    players.get(guildId).addSongToPlay(track);
    return true;
}

/**
 * 
 * @param {Object} guildId 
 * @param {Object} name 
 * @param {User} member
 * @returns 
 */
 exports.addSongByName = async function addSongByName(guildId, name, member) {
    if(!players.has(guildId)) return false;
    const video = await YouTube.search(name, { limit: 1 })
    if(video[0] == undefined) {
        return false;
    }
    const track = new Track.Track("https://www.youtube.com/watch?v=" + video[0].id, member);
    track.insert(video[0]);
    players.get(guildId).addSongToPlay(track);
    return true;
}

/**
 * 
 * @param {Object} guildId 
 * @returns 
 */

exports.destroy = function destroy(guildId) {
    if(!players.has(guildId)) return false;
    players.get(guildId).stop();
    return true;
}


exports.addFilter = async function addFilter(guildId, filter) {
    if(!players.has(guildId)) return false;
    await players.get(guildId).enableFilter(filter);
    return true;
}

exports.skip = async function skip(guildId) {
    if(!players.has(guildId)) return false;
    return await players.get(guildId).skip();
}


exports.pause = function pause(guildId) {
    if(!players.has(guildId)) return false;
    return players.get(guildId).pause();
}

exports.resume = function resume(guildId) {
    if(!players.has(guildId)) return false;
    return players.get(guildId).resume();
}


exports.currentTitle = function currentTitle(guildId) {
    if(!players.has(guildId)) return "Could not find player"; 
    return "[" + players.get(guildId).getCurrentSongInfo().title + "](https://www.youtube.com/watch?v=" + players.get(guildId).getCurrentSongInfo().videoId + ")";
}

exports.getLastTitle = function getLastTitle(guildId) {
    if(!players.has(guildId)) return "Could not find player!";
    return "[" + players.get(guildId).getLastSongInfo().title + "](https://www.youtube.com/watch?v=" + players.get(guildId).getLastSongInfo().videoId + ")";
}

exports.clearMusic = function clearMusic(guildId) {
    if(!players.has(guildId)) return false;
    players.get(guildId).stop();
    return true;
}

exports.back = async function back(guildId) {
    if(!players.has(guildId)) return false;
    return await players.get(guildId).back();
}

exports.has = function has(guildId) {
    return players.has(guildId);
}

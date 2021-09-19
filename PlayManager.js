'use strict';

const Queue = require("./Queue.js");
const Player = require("./Player.js");
const Track = require("./Track.js");

const YouTube = require("youtube-sr").default;
const { Client, TextChannel, User } = require("discord.js");

let players = new Map();

/**
 * @param {Client} client 
 * @param {TextChannel} channel 
 * @returns
 */
exports.createPlayer = function createPlayer(client, channel) {
    if(players.has(channel.guildId)) return false;
    client.user.setPresence({ activities: [{ name: 'Music', type:"LISTENING"}], status: 'online' });
    var queue = new Queue.Queue(channel.guildId, client.user);
    var player = new Player.Player(queue,channel, (type, data) => {
        //AFTER CLOSE // GETS CALLED AFTER this.stop(); !! OR ON CRASH !! OR ON EMPTY QUEUE
        if(type == "destroy"){ 
            players.set(channel.guildId,null);
            players.delete(channel.guildId);
            client = null;
            channel = null;
            player = null;
              queue = null;

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
 * @param {VoiceConnection} connection 
 * @returns 
 */

exports.joinPlayer = async function joinPlayer(guildId, connection) {
    if(!players.has(guildId)) return false;
    if(connection == undefined) return false;
    await players.get(guildId).joinListening(connection);
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
    players.get(guildId).addSongToQueue(track);
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
    const track = new Track.Track("https://www.youtube.com/watch?v=" + video[0].id, member);
    track.insertData(video[0]);
    players.get(guildId).addSongToQueue(track);
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

exports.setLoopMode = function setLoopMode(guildId, mode) {
    if(!players.has(guildId)) return false;
    players.get(guildId).loopMode(mode);
    return true;
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
    return "[" + players.get(guildId).getCurrent().getData().title + "](https://www.youtube.com/watch?v=" + players.get(guildId).getCurrent().getData().videoId + ")";
}

exports.getLastTitle = function getLastTitle(guildId) {
    if(!players.has(guildId)) return "**ERROR NO MUSIC PLAYER FOUND** ";
    if(!players.get(guildId).getLast()) return "**ERROR TRIED TO ACCESS NOT LOADED SONG** ";
    return "[" + players.get(guildId).getLast().getData().title + "](https://www.youtube.com/watch?v=" + players.get(guildId).getLast().getData().videoId + ")";
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
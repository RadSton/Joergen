'use strict';
const Discord = require("discord.js");
const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILD_VOICE_STATES] });
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
require('dotenv').config();

const playManager = require("./lib/PlayManager.js");

const voiceDiscord = require("@discordjs/voice");

Object.assign(global, {devMode: false});

client.on("ready", async () => {
  console.log("[DEBUG - JÖRGEN] Der Bot ist gestartet!");
	if(!global.devMode)
  		client.user.setPresence({ activities: [{ name: 'a good song', type:"LISTENING"}], status: 'idle' });
	else client.user.setPresence({ activities: [{ name: 'DEVMODE', type:"PLAYING"}], status: 'idle' });
	
});

client.on('messageCreate', async (message) => {
	if (!message.guild) return;
	if(message.content.toLowerCase().startsWith("_dev ")){
		if(!message.author.tag.includes("2996")) {
			message.channel.send("Your not the real slim shady!");
			return;
		}
		const args = message.content.toLowerCase().split(" ");
		if(args[1].includes("dmode")) {
			Object.assign(global, { devMode: !global.devMode})
			if(!global.devMode)client.user.setPresence({ activities: [{ name: 'a good song', type:"LISTENING"}], status: 'idle' });
			else client.user.setPresence({ activities: [{ name: 'DEVMODE', type:"PLAYING"}], status: 'idle' });
	
			message.channel.send("DEVELOPMENT TOOL: devMode was toggled to ``" + global.devMode +"``");
		} else if(args[1].toLowerCase().includes("disableserver")) {
			if(args.length == 3) {
				const gs = client.guilds.cache.map(guild => [guild.id, guild.name.toLowerCase()]);
				var guildToEffect = "";
				var toSearch = args[2].toLowerCase();
				var finds = [];
				for(var i = 0; i < gs.length; i++) {
					var current = gs[i];
					if(current[0].includes(toSearch)) {
						finds.push(current);
					} else if(current[1].includes(toSearch)) {
						finds.push(current);
					}
				}
				if(finds.length == 0) {
					message.channel.send("Could not find guild!");
					return;
				}
				guildToEffect = finds[0];
				const commands = [new SlashCommandBuilder().setName("deaktiv").setDescription("Der Bot ist nicht auf diesem Server verfügbar!"),].map(command => command.toJSON());
				const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

				(async () => {
					try {
						await rest.put(
							Routes.applicationGuildCommands(process.env.CLIENT_ID, guildToEffect[0]),
							{ body: commands },
						);

						message.channel.send("The Server(" + guildToEffect[1] + " : " + guildToEffect[0] + ") was disabled!");
					} catch (error) {
						console.error(error);
						message.channel.send("Error!");
					}
				})();
			} else {
				message.channel.send("Please enter a GuildId or Server name");
				return;
			}
		} else if(args[1].toLowerCase().includes("enableserver")) {
			if(args.length == 3) {
				const gs = client.guilds.cache.map(guild => [guild.id, guild.name.toLowerCase()]);
				var guildToEffect = "";
				var toSearch = args[2].toLowerCase();
				var finds = [];
				for(var i = 0; i < gs.length; i++) {
					var current = gs[i];
					if(current[0].includes(toSearch)) {
						finds.push(current);
					} else if(current[1].includes(toSearch)) {
						finds.push(current);
					}
				}
				if(finds.length == 0) {
					message.channel.send("Could not find guild!");
					return;
				}
				guildToEffect = finds[0];

				const commands = [
					new SlashCommandBuilder().setName('bassbost').setDescription('Fügt extra Bass hinzu!').addIntegerOption(option => option.setName('value').setDescription('Wie viel Bass hinzugefügt werden soll').setRequired(true)),
					new SlashCommandBuilder().setName('play').setDescription('Sucht nach einem Lied auf YT und spielt dieses!').addStringOption(option => option.setName('search').setDescription('Der Title des Songs!').setRequired(true)),
					new SlashCommandBuilder().setName('stop').setDescription('Stoppt alle Lieder die Spielen und leert die Queue!'),
					new SlashCommandBuilder().setName("resume").setDescription("Spielt die Wiedergabe weiter!"),
					new SlashCommandBuilder().setName("pause").setDescription("Pausiert die Wiedergabe!"),
					new SlashCommandBuilder().setName("skip").setDescription("Überspringt das Lied das gerade spielt!"),
					new SlashCommandBuilder().setName("back").setDescription("Geht zurück zum letztem Song"),
					new SlashCommandBuilder().setName("r").setDescription("Du fragst mich was der Command macht?"),].map(command => command.toJSON());
					const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

					(async () => {
						try {
							await rest.put(
								Routes.applicationGuildCommands(process.env.CLIENT_ID, guildToEffect[0]),
								{ body: commands },
							);
	
							message.channel.send("The Server(" + guildToEffect[1] + " : " + guildToEffect[0] + ") was enabled!");
						} catch (error) {
							console.error(error);
							message.channel.send("Error!");
						}
					})();

			} else {
				message.channel.send("Please enter a GuildId or Server name");
				return;
			}
		} 
	} else if(message.content.toLowerCase().includes("_loop")) {
      
		if(message.content.toLowerCase().includes("off")){
		  playManager.setLoopMode(message.guild.id, "off");
			  message.channel.send("Disabled testfeature \"loop\"!");
		} else {
		  playManager.setLoopMode(message.guild.id, "track");
		  message.channel.send("Enabled testfeature \"loop\"!");
		}
	}
	//playManager.(message.guildId, "channelsplit,sidechaingate=level_in=64"); // EARRAPE
});	

client.on('error', (m) => console.log("[ERROR - DISCORDJS]", m));
//client.on("debug", (m) => console.log("[DEBUG - DISCORDJS]", m));
client.on("warn", (m) => console.log("[WARN - DISCORDJS]", m));

client.login(process.env.TOKEN);


// client.on("message", async (msg) => {
// 	if(msg.content.includes("back"))
// 		await playManager.back(msg.guildId); 
// })

client.on('interactionCreate', async interaction => {
	const channel = interaction.channel;
	const guild = channel.guildId;
    const member = interaction.member;
    const command = interaction.commandName;
    const options = interaction.options;
	

	
	await interaction.deferReply();

	if(command == "play") {
		var search = options.getString("search");
		if(!member.voice.channel) {
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Join erst mal nem Channel bevor du mir arbeit anschafst!")] })
			return;
		}
		var hasToJoin = await playManager.createPlayer(client, channel);
		if(hasToJoin) {
			var connection = await connectToChannel(member.voice.channel);
			if(connection == undefined) {
				interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Es gab einen Fehler beim Joinen deines Channels!")] })
				return;
			}
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Suche nach: \"" + search + "\"")] })
			await playManager.addSongByName(guild,search,member);
			await playManager.joinPlayer(guild,connection);
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Spiele: " + playManager.currentTitle(guild))] })// 
			return;
		} else {
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Suche nach: \"" + search + "\"")] })
			await playManager.addSongByName(guild,search,member);
			setTimeout(() => {interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("" + playManager.getLastTitle(guild) + " wurde der Liste hinzugefügt!")] })},1000);
			return;
		}
	} else if(command == "bassbost") {
		if(!playManager.has(guild)) {
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Keinen Bot für Verarbeitung des Commands gefunden!")] })
			return;
		}
		var value = options.getInteger("value");
		
		interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Bassbost-Spur wird erstellt .... Bitte warten!\nDieser Vorgang dauert je nach länge des Songs länger oder kürzer!")] })
		if(value <31){
			await playManager.addFilter(guild,"bass=g=" + value);
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Filter wird angewendet .... Bitte warten\nDieser Vorgang dauert normalerweiße am längstem!\n Sollte der Bot in den nächsten 30 Sekunden nichts mehr wiedergeben\n Mache einen Rechtsklick auf ihn und Disconnet warte 10 Sekunden\n nun sollte die Botinstance wieder einsatzbereit sein!")] })
		}else {
			if(value == 420){
				await playManager.addFilter(guild,"vibrato=f=12");
				interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Ah ein Gen-Z Mensch? Da hab ich was für dich")], ephemeral: true })
				var a = setTimeout(() => {
					clearTimeout(a);
					interaction.deleteReply();
				},2000)
			} else if(value == 51){
				await playManager.addFilter(guild,"aresample=48000,asetrate=48000*1.55");
				interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("what did you say?")], ephemeral: true })
				var a = setTimeout(() => {
					clearTimeout(a);
					interaction.deleteReply();
				},2000)
			} else if(value == 69){
				await playManager.addFilter(guild,"aresample=48000,asetrate=48000*0.8");
				interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("lul")], ephemeral: true })
				var a = setTimeout(() => {
					clearTimeout(a);
					interaction.deleteReply();
				},2000)
			} else {
				await playManager.addFilter(guild,"bass=g=30");
				interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Filter wird angewendet .... Bitte warten\n\n**Der Bass wurde wegen Serverleistung auf 30 begrenzt!**\n\nDieser Vorgang dauert normalerweiße am längstem!\n Sollte der Bot in den nächsten 30 Sekunden nichts mehr wiedergeben\n Mache einen Rechtsklick auf ihn und Disconnet warte 10 Sekunden\n nun sollte die Botinstance wieder einsatzbereit sein!")] })
			}
		}
		return;
	} else if(command == "pause") {
		if(!playManager.has(guild)) {
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Keinen Bot für Verarbeitung des Commands gefunden!")] })
			return;
		}
		if(playManager.pause(guild))
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Der Song wurde pausiert!")] })
		else 
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Der Song ist schon pausiert!")] })
		return;
	} else if(command == "resume") {
		if(!playManager.has(guild)) {
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Keinen Bot für Verarbeitung des Commands gefunden!")] })
			return;
		}
		if(playManager.resume(guild))
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Der Song wird weitergespielt!")] })
		else 
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Der Song spielt bereits!")] })
		return;
	} else if(command == "skip") {
		if(!playManager.has(guild)) {
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Keinen Bot für Verarbeitung des Commands gefunden!")] })
			return;
		}
		if(await playManager.skip(guild)) 
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Der Song wurde übersprungen!")] })
		else 
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Beim Überspringen gab es einen Fehler!")] })
		return;
	} else if(command == "stop") {
		if(!playManager.has(guild)) {
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Keinen Bot für Verarbeitung des Commands gefunden!")] })
			return;
		}
		playManager.clearMusic(guild);
		interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Die Playerinstance wurde überschrieben!")] })
		return;
	} else if(command == "back") {
		if(!playManager.has(guild)) {
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Keinen Bot für Verarbeitung des Commands gefunden!")] })
			return;
		}
		interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Suche nach zuletzt gespieltem Track ...")] })
		if(await playManager.back(guild)) {
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Spiele: " + playManager.currentTitle(guild))] })	
		} else {
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Konnte keinen Song finden!")] })
		}
		return;
	} else if(command == "r") {
		var search = "never gonna give you up";
		if(!member.voice.channel) {
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Irgendwas ging leider nicht!")] })
			return;
		}
		var hasToJoin = await playManager.createPlayer(guild, channel);
		if(hasToJoin) {
			var connection = await connectToChannel(member.voice.channel);
			if(connection == undefined) {
				interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Es gab einen Fehler!")] })
				return;
			}
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Denke nach was der command macht")] })
			await playManager.addSongByName(guild,search,member);
			await playManager.joinPlayer(guild,connection);
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Ich weiß es ned mehr sorry")] })// 
			return;
		} else {
			interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Denke nach was der command macht")] })
			await playManager.addSongByName(guild,search,member);
			setTimeout(() => {interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("Ich weiß es ned mehr sorry")] })},1000);
			return;
		}
		
	} else if(command == "deaktiv") {
		const embed = new Discord.MessageEmbed()
		.setTitle("The bot is not active")
		.setAuthor("radston12", "https://cdn.discordapp.com/avatars/482899866201358356/8271c84cd68eb070bd617940d9d72b76.png","https://cdn.discordapp.com/avatars/482899866201358356/8271c84cd68eb070bd617940d9d72b76.png")
		.setColor(0x00AE86)
		.setDescription("Der Bot ist auf diesem Server nicht aktiv!\n\nServer mit feigestalltenem Bot: \"Leidln\", \"radston12Development2\"\n\nWenn der Bot auf diesem Server freigestallten werden soll bitte melde dich an \"长🝗丫⻏ㄖ闩尺ᗪ Ꮆㄩ丫 )rK#2996\"(Chrisi)\n\n")
		.setFooter("JörgenEngine vBETA0.1 -- Made by MEINS", "")
		.setThumbnail("https://cdn.discordapp.com/avatars/883728914084679691/d5835f672f19e9f7626a34838e51d380.png?size=256")
		interaction.editReply({ embeds: [embed] })
		return;
	}

	interaction.editReply({ embeds: [new Discord.MessageEmbed().setDescription("**ERROR: ** This command is not implemented!")] });
	
});

async function connectToChannel(channel) {
	const connection = voiceDiscord.joinVoiceChannel({
		channelId: channel.id,
		guildId: channel.guild.id,
		adapterCreator: channel.guild.voiceAdapterCreator,
		deaf: false
	});
	try {
		await voiceDiscord.entersState(connection, voiceDiscord.VoiceConnectionStatus.Ready, 20000);
		return connection;
	} catch (error) {
		connection.destroy();
		//throw error;
		console.log(error);
	}
	return undefined;
}

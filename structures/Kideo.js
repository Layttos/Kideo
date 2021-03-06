const { Intents, Client, MessageEmbed, Message, GuildMember, Permissions} = require("discord.js");

const config = require("../config.json");

const KideoAPI = require("./KideoAPI");

const api = new KideoAPI();

const fs = require("fs");

const Command = require("./Command");

const Color = require("./Color");

/**
 * @param client {Kideo}
 * @param activity {string}
 */
function setActivities(client, activity){
    client.user.setActivity({
        type: "PLAYING",
        name: activity
    })
}

/**
 * @description This class allows you managing Kideo Bot
 * @return { Kideo }
 */
class Kideo extends Client {
    constructor() {
        const ints = new Intents().add(["GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS", "GUILD_MESSAGE_REACTIONS", "DIRECT_MESSAGES"]);
        super({
            intents: ints,
            partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'GUILD_MEMBER', 'USER']
        });

        this.config = config;

        this.prefix = undefined;

        this.KideoApi = api;

        this.color = Color;

        /**
         * @type {Map<string, Command>}
         */
        this.command = new Map();
    }

    start(){

        const activties = [
            "make pasta",
            "manage your server",
            "do his homework",
            "Tetris Premium",
            "with +nofriend"
        ]

        let embed = undefined;

        fs.readdirSync("./commands").filter(file => file.endsWith(".js")).forEach(file => {
            /**
             * @type {Command}
             */
            const command = require(`../commands/${file}`);

            const name = file.split(".")[0];

            command.name = name;

            this.command.set(name, command);

        });

        this.on("messageCreate", async message => {

            if(message.channel.type === "DM") return;

            if(message.author.bot) return;

            if(await (await api.getDataWithID(message.guild.id)).message[0] === undefined){
                if(await api.createGuildSQL({ServerID: message.guild.id, XP: 1})){

                    const guild = await api.getDataWithID(message.guild.id);

                    this.prefix = guild.message[0].PREFIX;

                }else {
                    console.log("Error in the creation of the guild");
                    return;
                }
            }

            const guild = await api.getDataWithID(message.guild.id);

            this.prefix = guild.message[0].PREFIX;

            if(message.content === `<@!${this.user.id}>` || message.content === `<@${this.user.id}>`){
                return await message.reply({embeds: [new MessageEmbed().setTitle("**Prefix**").setDescription(`Hi!\n\nMy prefix is **${this.prefix}**`).setThumbnail("https://images.assetsdelivery.com/compings_v2/djvstock/djvstock1409/djvstock140901230.jpg").setFooter({text: "Kideo - 2022"})]});
            }

            if(!await api.addPointXpGuild(message.guild.id)){
                console.log("Error on Xp Point");
                return;
            }

            const level = await api.getLevel(message.guildId);
            const exp = await api.getExperience(message.guildId);

            if (level !== undefined || exp !== undefined) {
                if(exp === 120 * level) {
                    await message.reply({embeds: [new MessageEmbed().setTitle("**The server level increased :smirk:**").setDescription(`The server is now **level ${level + 1}** :sunglasses:\nYou should thank <@${message.author.id}> :partying_face:`).setFooter({text: "Kideo - 2022"})]})
                }
            }

            if(!message.content.startsWith(this.prefix)) return;

            const args = message.content.substring(this.prefix.length).split(/ +/);

            const command = this.command.get(args[0]);

            if(!command){
                embed = new MessageEmbed().setTitle("**Wrong command**").setDescription(`The command **${this.prefix}${args[0]}** doesn't exist !`).setColor(Color.RED).setFooter({text: "Kideo - 2022"});
                await message.reply({embeds: [embed]});
                return;
            }

            let canStart = false;

            command.permissions.forEach(perm => {
                if(perm === "all"){
                    canStart = true;
                }

                if(message.guild.roles.cache.has(perm)){
                    if(message.member.roles.cache.has(perm)){
                        canStart = true;
                    }
                }

            })

            if(!canStart){
                await message.reply({embeds: [new MessageEmbed().setTitle("**Missing permissions**").setDescription("You don't have the permissions !").setColor(this.color.RED).setFooter({text: "Kideo - 2022"})]});
                return;
            }

            command.run(message, args, this);

        });

        this.on("guildCreate", async guild => {
            if(!await api.createGuildSQL({ServerID: guild.id, XP: 1})){
                console.log(`An error has current`)
            }
        })

        this.on("guildDelete", async guild => {
            if(!await api.clearGuildWithID({ServerID: guild.id})){
                console.log(`An error has current`)
            }
        })

        this.on("channelCreate", async channel => {
            let muteRole = channel.guild.roles.cache.find(role => role.name === "Muted");

            if(muteRole === undefined){

                muteRole = await channel.guild.roles.create({
                    name: "Muted"
                })

                const guild = await this.guilds.fetch(channel.guild.id);

                guild.channels.cache.forEach( chan => {
                    chan.permissionOverwrites.set([
                        {
                            id: muteRole.id,
                            deny: ['SEND_MESSAGES']
                        }
                    ]);
                })
            }

            await channel.permissionOverwrites.set([
                {
                    id: muteRole.id,
                    deny: ['SEND_MESSAGES']
                }
            ])
        })

        this.on("messageCreate", async message => {

            if(message.author.bot) return;

            if(message.channel.type !== "DM") return;

            if (message.content === "Hey"){
                return await message.reply("Bonjour jeune entrepreneur")
            }

            const response = await this.KideoApi.talkWithOpenAI(message.content);

            if(response.length > 2000){
                message.reply("The bot is speaking too much...");
                return;
            }

            if(response === undefined || response === ""){
                return;
            }

            message.channel.send(response);

        })

        this.login(config.token);
    }

}

module.exports = Kideo;
const Commando = require('discord.js-commando');
const oneLine = require('common-tags').oneLine;

const taco = "🌮";
const maxTacos = 100;
const insults = [
    "Ass fiddler",
    "Assclown",
    "Asshat",
    "Ballsack",
    "Birdbrain",
    "Boogerface",
    "Bozo",
    "Butknuckler",
    "Butt monkey",
    "Buttjuice",
    "Buttmunch",
    "Carpet-cleaner",
    "Cheesedick",
    "Clitsplitter",
    "Cockgobbler",
    "Cock-juggling thundercunt",
    "Cockmuppet",
    "Cockshiner",
    "Cum dumpster",
    "Cumwad",
    "Cunt rag",
    "Cuntkicker",
    "Cuntmuscle",
    "Dickbreath",
    "Dicknose",
    "Doorknob",
    "Douche canoe",
    "Douchemonger",
    "Douchenozzle",
    "Fat lard",
    "Fatso",
    "Fuckface",
    "Fucklets",
    "Fuckstick",
    "Fuckrag",
    "Fucktard",
    "Geezer",
    "Herb",
    "Inbreeder",
    "Jizztissue",
    "Knuckle-dragger",
    "Meat Wallet",
    "Mouth-breather",
    "Numbnuts",
    "Pigfucker",
    "Poo-poo head",
    "Porker",
    "Rumpleforeskin",
    "Rumpranger",
    "Shitbag",
    "Shitshaker",
    "Shitstain",
    "Shitstick",
    "Sleezebag",
    "Slutbag",
    "Spastic",
    "Tard",
    "Tool",
    "Turkey",
    "Twat",
    "Twatwaffle",
    "Vaginal leakage",
    "Village idiot",
    "Wanker",
    "Weaksauce",
    "Weirdo",
    "Wooden dildo",
    "Wuss"
];

module.exports = class TacosCommand extends Commando.Command {
	constructor(client) {
		super(client, {
			name: 'tacos',
			aliases: ['taco'],
			group: 'fun',
			memberName: 'tacos',
			description: 'Gives you some tacos.',
			details: oneLine`
				This is a useless command which gives you some tacos.
				This command is Dauntless' favorite command.
			`,
			examples: ['tacos'],
            throttling: {
                usages: 1,
                duration: 10
            }
		});
	}

	async run(msg) {
        const randomTacos = Math.floor(Math.random()*(maxTacos+1));
        let insult = insults[Math.floor(Math.random()*insults.length)];
        let tacoString = (randomTacos === 1 ? "taco" : "tacos");
        let response = `${msg.author.toString()} rolled ${randomTacos} ${tacoString}. **__${insult}__**.\n`;

        for (let i = 0; i < randomTacos; i++) {
            response += `${taco} `;
            if (i % 10 === 9) response += "\n";
        }

        msg.channel.sendMessage(response);
	}
};
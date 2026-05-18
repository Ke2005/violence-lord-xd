// ============================================================
// VIOLENCE LORD XD - Telegram WhatsApp Pairing Bot
// ============================================================

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const TOKEN = process.env.BOT_TOKEN;
const BOT_SERVER_URL = 'https://violence-lord-xd-production.up.railway.app';
const LOGO_URL = 'https://i.ibb.co/XxcnMFhh/file-000000007c0471f4bb03c1c6cfe5889b.png';

const LINKS = {
  telegramChannel: 'https://t.me/violenceLordXDbots',
  telegramGroup: 'https://t.me/ViolenceLordXDbot',
  whatsappChannel: 'https://whatsapp.com/channel/0029Vb8ATdxLCoWuum7Smn2K',
  whatsappGroup: 'https://chat.whatsapp.com/INjbyG5Hl3b2xEDvFQCb2k',
};

const bot = new TelegramBot(TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 }
  }
});

process.once('SIGINT', () => bot.stopPolling());
process.once('SIGTERM', () => bot.stopPolling());

const waitingForNumber = new Set();
const confirmedJoined = new Set();
const pendingNumber = new Map();
let totalPairings = 0;

const welcomeText = (name) => `
👋 Welcome *${name}*!

╭◆ 𝐕𝐢𝐨𝐥𝐞𝐧𝐜𝐞 𝐋𝐨𝐫𝐝 𝐗𝐃 🤖
│ ✧ WhatsApp Bot Pairing Service
│ ✧ Version: 1.0.0
│ ✧ Owner: Kerrick
│ ✧ Total Paired: ${totalPairings}+ users
╰◆

Link the *Violence Lord XD* bot to YOUR WhatsApp!

Once paired, enjoy *50+ commands:*
✅ AI-powered replies
✅ Group admin tools
✅ View once saver
✅ Fun & game commands 🔥

Tap a button below 👇
`.trim();

const mainKeyboard = {
  inline_keyboard: [
    [{ text: '🔗 Pair My WhatsApp', callback_data: 'pair' }],
    [{ text: '📋 How It Works', callback_data: 'howto' }, { text: '🤖 Commands', callback_data: 'commands' }],
    [{ text: '🌍 Our Communities', callback_data: 'community' }],
    [{ text: '📊 Bot Status', callback_data: 'status' }, { text: '❓ Help', callback_data: 'help' }],
  ],
};

const joinKeyboard = {
  inline_keyboard: [
    [{ text: '📣 Join Telegram Channel', url: LINKS.telegramChannel }],
    [{ text: '👥 Join Telegram Group', url: LINKS.telegramGroup }],
    [{ text: '📢 Join WhatsApp Channel', url: LINKS.whatsappChannel }],
    [{ text: '💬 Join WhatsApp Group', url: LINKS.whatsappGroup }],
    [{ text: '✅ I Have Joined All!', callback_data: 'confirm_joined' }],
  ],
};

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || 'Friend';
  await bot.sendPhoto(chatId, LOGO_URL, {
    caption: welcomeText(firstName),
    parse_mode: 'Markdown',
    reply_markup: mainKeyboard,
  });
});

bot.onText(/\/pair/, async (msg) => startPairFlow(msg.chat.id));
bot.onText(/\/community/, async (msg) => sendCommunityLinks(msg.chat.id));
bot.onText(/\/status/, async (msg) => checkStatus(msg.chat.id));
bot.onText(/\/commands/, async (msg) => showCommands(msg.chat.id));
bot.onText(/\/help/, async (msg) => showHelp(msg.chat.id));

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  await bot.answerCallbackQuery(query.id);
  const { data } = query;

  if (data === 'pair') return startPairFlow(chatId);
  if (data === 'howto') return showHowTo(chatId);
  if (data === 'commands') return showCommands(chatId);
  if (data === 'community') return sendCommunityLinks(chatId);
  if (data === 'status') return checkStatus(chatId);
  if (data === 'help') return showHelp(chatId);

  if (data === 'confirm_joined') {
    confirmedJoined.add(chatId);
    if (pendingNumber.has(chatId)) {
      const number = pendingNumber.get(chatId);
      pendingNumber.delete(chatId);
      await bot.sendMessage(chatId, `✅ *Thank you for joining!*\n\nGenerating your pairing code now...`, { parse_mode: 'Markdown' });
      return generateCode(chatId, number);
    } else {
      waitingForNumber.add(chatId);
      return bot.sendMessage(chatId, `
✅ *Thank you for joining our communities!*

Now send me your WhatsApp number with country code, no + sign.

🇳🇬 Nigeria: \`2348012345678\`
🇬🇭 Ghana: \`233241234567\`
🇺🇸 USA: \`12025551234\`
🇬🇧 UK: \`447911123456\`
🇿🇦 South Africa: \`27821234567\`

Type your number now 👇
      `.trim(), {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'back' }]] },
      });
    }
  }

  if (data === 'back') {
    const name = query.from?.first_name || 'Friend';
    waitingForNumber.delete(chatId);
    pendingNumber.delete(chatId);
    return bot.sendPhoto(chatId, LOGO_URL, {
      caption: welcomeText(name),
      parse_mode: 'Markdown',
      reply_markup: mainKeyboard,
    });
  }
});

async function startPairFlow(chatId) {
  if (confirmedJoined.has(chatId)) return askForNumber(chatId);
  await bot.sendPhoto(chatId, LOGO_URL, {
    caption: `
🚨 *Join Required!*

Before getting your pairing code, you must join all our communities below! 👇

1️⃣ Join our Telegram Channel
2️⃣ Join our Telegram Group
3️⃣ Join our WhatsApp Channel
4️⃣ Join our WhatsApp Group

After joining all 4, tap *"✅ I Have Joined All!"*
    `.trim(),
    parse_mode: 'Markdown',
    reply_markup: joinKeyboard,
  });
}

async function askForNumber(chatId) {
  waitingForNumber.add(chatId);
  await bot.sendMessage(chatId, `
📱 *Enter Your WhatsApp Number*

Include country code, no + sign.

🇳🇬 Nigeria: \`2348012345678\`
🇬🇭 Ghana: \`233241234567\`
🇺🇸 USA: \`12025551234\`
🇬🇧 UK: \`447911123456\`
🇿🇦 South Africa: \`27821234567\`

Type your number now 👇
  `.trim(), {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'back' }]] },
  });
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  if (!text || text.startsWith('/')) return;

  if (waitingForNumber.has(chatId)) {
    waitingForNumber.delete(chatId);
    const number = text.replace(/[^0-9]/g, '');

    if (number.length < 7 || number.length > 15) {
      return bot.sendMessage(chatId, `❌ *Invalid number!*\n\nUse country code. Example: \`2348012345678\``, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🔄 Try Again', callback_data: 'pair' }]] },
      });
    }

    if (!confirmedJoined.has(chatId)) {
      pendingNumber.set(chatId, number);
      return bot.sendPhoto(chatId, LOGO_URL, {
        caption: `
🚨 *Join Required First!*

You must join all our communities before getting a pairing code!

Join all 4 below then tap *"✅ I Have Joined All!"*
        `.trim(),
        parse_mode: 'Markdown',
        reply_markup: joinKeyboard,
      });
    }

    return generateCode(chatId, number);
  }

  await bot.sendMessage(chatId, `Use /start to see the menu! 😊`);
});

async function generateCode(chatId, number) {
  const loadingMsg = await bot.sendMessage(chatId, `⏳ *Generating code for +${number}...*\nPlease wait up to 30 seconds...`, { parse_mode: 'Markdown' });

  try {
    const response = await axios.post(`${BOT_SERVER_URL}/api/pair`, { number }, { timeout: 35000 });
    const code = response.data?.code;

    if (code) {
      totalPairings++;
      await bot.deleteMessage(chatId, loadingMsg.message_id);
      await bot.sendPhoto(chatId, LOGO_URL, {
        caption: `
✅ *Pairing Code Generated!*

📱 Number: *+${number}*

🔑 *YOUR CODE:*
\`${code}\`
👆 *Tap the code above to copy it!*

*Steps to link:*
1️⃣ Copy the code above 👆
2️⃣ Open WhatsApp on your phone
3️⃣ Tap ⋮ Menu → *Linked Devices*
4️⃣ Tap *Link a Device*
5️⃣ Tap *"Link with phone number instead"*
6️⃣ Paste/type the code
7️⃣ Done! 🎉

⚠️ Code expires in *60 seconds!*
        `.trim(),
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Get New Code', callback_data: 'pair' }],
            [{ text: '🌍 Our Communities', callback_data: 'community' }],
          ],
        },
      });
    } else {
      throw new Error('No code returned');
    }
  } catch (error) {
    try { await bot.deleteMessage(chatId, loadingMsg.message_id); } catch {}
    await bot.sendMessage(chatId, `
❌ *Failed to generate code!*

Please try again shortly.
    `.trim(), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🔄 Try Again', callback_data: 'pair' }]] },
    });
  }
}

async function sendCommunityLinks(chatId) {
  await bot.sendPhoto(chatId, LOGO_URL, {
    caption: `🌍 *Join the Violence Lord XD Community!*\n\nStay updated and chat with other users 👇`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📣 Telegram Channel', url: LINKS.telegramChannel }],
        [{ text: '👥 Telegram Group', url: LINKS.telegramGroup }],
        [{ text: '📢 WhatsApp Channel', url: LINKS.whatsappChannel }],
        [{ text: '💬 WhatsApp Group', url: LINKS.whatsappGroup }],
        [{ text: '🔙 Back to Menu', callback_data: 'back' }],
      ],
    },
  });
}

async function showHowTo(chatId) {
  await bot.sendMessage(chatId, `
📋 *How To Pair Violence Lord XD*

1️⃣ Tap *Pair My WhatsApp*
2️⃣ Join all 4 communities
3️⃣ Tap *"I Have Joined All"*
4️⃣ Enter number with country code
5️⃣ *Copy* the 8-digit pairing code
6️⃣ Open WhatsApp → ⋮ Menu
7️⃣ Tap *Linked Devices*
8️⃣ Tap *Link a Device*
9️⃣ Tap *"Link with phone number instead"*
🔟 *Paste* the pairing code
1️⃣1️⃣ *Done!* 🎉
  `.trim(), {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔗 Pair Now', callback_data: 'pair' }],
        [{ text: '🔙 Back', callback_data: 'back' }],
      ],
    },
  });
}

async function showCommands(chatId) {
  await bot.sendMessage(chatId, `
╭◆ 𝐕𝐢𝐨𝐥𝐞𝐧𝐜𝐞 𝐋𝐨𝐫𝐝 𝐗𝐃 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐬

👤 *User* — .ping .alive .owner .stats .info .time
🤖 *AI* — .ai .gpt .codeai .roast .weather
😂 *Fun* — .joke .dadjoke .fact .advice .8ball .truth .dare
📊 *Checks* — .hotcheck .smartcheck .brainlevel .coolcheck .lovecheck
🎮 *Games* — .coin .dice .rps .math .guess
🔧 *Utility* — .calculate .genpass .encode .decode
👮 *Group* — .kick .promote .demote .mute .unmute .tagall .grouplink
👁️ *Special* — .vv (view once saver)

╰────────────────◆
_Prefix: dot (.) before every command_
  `.trim(), {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Back', callback_data: 'back' }]] },
  });
}

async function showHelp(chatId) {
  await bot.sendMessage(chatId, `
❓ *Help & Support*

/start — Main menu
/pair — Pair your WhatsApp
/community — Join our communities
/commands — See all commands
/status — Check bot status

👤 Owner: Kerrick
🤖 Bot: @ViolenceLordXD_bot
  `.trim(), {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '🔙 Back', callback_data: 'back' }]] },
  });
}

async function checkStatus(chatId) {
  const loadingMsg = await bot.sendMessage(chatId, '⏳ Checking status...');
  try {
    await axios.get(`${BOT_SERVER_URL}/api/bot/status`, { timeout: 5000 });
    await bot.deleteMessage(chatId, loadingMsg.message_id);
    await bot.sendMessage(chatId, `✅ *Bot Status: ONLINE* 🟢\n\nViolence Lord XD is running!\nTotal paired: *${totalPairings}+ users*`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔗 Pair Now', callback_data: 'pair' }],
          [{ text: '🔙 Back', callback_data: 'back' }],
        ],
      },
    });
  } catch {
    await bot.deleteMessage(chatId, loadingMsg.message_id);
    await bot.sendMessage(chatId, `⚠️ *Bot Status: RESTARTING* 🟡\n\nTry again in 1-2 minutes!`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🔄 Check Again', callback_data: 'status' }]] },
    });
  }
}

console.log('🤖 Violence Lord XD Telegram Bot started!');
console.log('🔗 https://t.me/ViolenceLordXD_bot');

module.exports = { bot };

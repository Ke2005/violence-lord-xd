const { bot } = require('./telegramBot.js');

const express = require('express');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
app.use(express.json());

let sock;
let isConnected = false;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  
  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      isConnected = false;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      isConnected = true;
      console.log('✅ WhatsApp Connected!');
    }
  });
}

app.get('/api/bot/status', (req, res) => {
  res.json({ status: isConnected ? 'online' : 'offline' });
});

app.post('/api/pair', async (req, res) => {
  try {
    const { number } = req.body;
    const clean = number.replace(/[^0-9]/g, '');
    const code = await sock.requestPairingCode(clean);
    console.log(`📱 Pairing code for ${clean}: ${code}`);
    res.json({ code });
  } catch (err) {
    console.error('Pair error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('🚀 Pairing server running!'));
startBot();

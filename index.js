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

app.get('/', (req, res) => {
  res.send(`
    <html>
      <body style="background:#111;color:#fff;font-family:sans-serif;padding:20px;">
        <h1>🤖 Violence Lord XD</h1>
        <h3>Owner Pairing Panel</h3>
        <p>Status: ${isConnected ? '🟢 WhatsApp Connected' : '🔴 WhatsApp Not Connected'}</p>
        <input id="num" placeholder="2347079256905" style="padding:10px;width:300px;font-size:16px;" />
        <br><br>
        <button onclick="pair()" style="padding:10px 20px;background:green;color:white;border:none;font-size:16px;cursor:pointer;">Get Pairing Code</button>
        <h2 id="result"></h2>
        <script>
          async function pair() {
            const number = document.getElementById('num').value;
            document.getElementById('result').innerText = '⏳ Generating...';
            const res = await fetch('/api/pair', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({number})});
            const data = await res.json();
            document.getElementById('result').innerText = data.code ? '✅ Code: ' + data.code : '❌ Error: ' + data.error;
          }
        </script>
      </body>
    </html>
  `);
});

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

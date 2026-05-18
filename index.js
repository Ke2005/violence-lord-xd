const express = require('express');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
app.use(express.json());

let sock;
let isConnected = false;
let isStarting = false;
let pairingCodeRequested = false;

async function startBot() {
  if (isStarting) return;
  isStarting = true;

  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  
  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Violence Lord XD', 'Chrome', '1.0.0'],
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      isConnected = false;
      isStarting = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log('🔄 Reconnecting in 5 seconds...');
        setTimeout(() => startBot(), 5000);
      }
    } else if (connection === 'open') {
      isConnected = true;
      isStarting = false;
      pairingCodeRequested = false;
      console.log('✅ WhatsApp Connected!');
    } else if (connection === 'connecting') {
      console.log('🔄 Connecting to WhatsApp...');
      
      if (!sock.authState.creds.registered && !pairingCodeRequested) {
        pairingCodeRequested = true;
        const ownerNumber = process.env.OWNER_NUMBER;
        if (ownerNumber) {
          setTimeout(async () => {
            try {
              const code = await sock.requestPairingCode(ownerNumber);
              console.log(`🔑 PAIRING CODE: ${code}`);
            } catch (err) {
              console.log('Pairing code error:', err.message);
              pairingCodeRequested = false;
            }
          }, 3000);
        }
      }
    }
  });
}

app.get('/', (req, res) => {
  res.send(`
    <html>
      <body style="background:#111;color:#fff;font-family:sans-serif;padding:20px;">
        <h1>🤖 Violence Lord XD</h1>
        <p>Status: ${isConnected ? '🟢 Connected' : '🔴 Not Connected'}</p>
        <input id="num" placeholder="2347079256905" style="padding:10px;width:300px;font-size:16px;" />
        <br><br>
        <button onclick="pair()" style="padding:10px 20px;background:green;color:white;border:none;font-size:16px;cursor:pointer;">Get Code</button>
        <h2 id="result"></h2>
        <script>
          async function pair() {
            const number = document.getElementById('num').value;
            document.getElementById('result').innerText = '⏳ Please wait...';
            const res = await fetch('/api/pair', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({number})});
            const data = await res.json();
            document.getElementById('result').innerText = data.code ? '✅ Code: ' + data.code : '❌ ' + data.error;
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
    await new Promise(resolve => setTimeout(resolve, 3000));
    const code = await sock.requestPairingCode(clean);
    console.log(`📱 Code for ${clean}: ${code}`);
    res.json({ code });
  } catch (err) {
    console.error('Pair error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('🚀 Server running!'));
startBot();

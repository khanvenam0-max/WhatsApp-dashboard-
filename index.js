const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const qrcode = require('qrcode-terminal');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// 1. WhatsApp Client Setup
const client = new Client({
    authStrategy: new LocalAuth(), // Session save karne ke liye
    puppeteer: { 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    }
});

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('User connected to Dashboard');

    // QR Code generate karke dashboard pe bhejna
    client.on('qr', (qr) => {
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit('qr', url);
        });
    });

    // Jab scan ho jaye aur ready ho
    client.on('ready', () => {
        socket.emit('ready', 'Connected!');
    });

    // Jab koi naya message aaye
    client.on('message', async (msg) => {
        const contact = await msg.getContact();
        socket.emit('message_received', {
            from: contact.pushname || msg.from,
            body: msg.body,
            timestamp: new Date().toLocaleTimeString()
        });
    });

    // Dashboard se message bhejne ka logic
    socket.on('send_message', async (data) => {
        const number = data.number.includes('@c.us') ? data.number : `${data.number}@c.us`;
        await client.sendMessage(number, data.message);
    });
});

client.initialize();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running: http://localhost:${PORT}`);
});

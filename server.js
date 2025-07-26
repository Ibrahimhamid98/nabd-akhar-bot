// server.js

// This file should run on a server (e.g., using Node.js)
// It connects to Firebase and listens for new registrations,
// then sends notifications to your Telegram bot.

// =================================================================
// 1. Installation:
// In your terminal, run:
// npm install node-telegram-bot-api firebase-admin express body-parser cors
// =================================================================

const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// =================================================================
// 2. Configuration (IMPORTANT: Use Environment Variables in production)
// =================================================================

// Your Telegram Bot Token (from BotFather)
// !! SECURITY WARNING !!
// In a real project, NEVER hardcode this. Use process.env.TELEGRAM_TOKEN
const token = '8306898791:AAFRzDH3Yn7J_4TIB3jLq0MbTPnMZ9fBxkI';

// Your personal Telegram Chat ID (the bot will send messages to you)
// This is now set to your specific ID.
const adminChatId = '1027599858'; 

// Firebase Admin SDK Configuration
// 1. Go to your Firebase project settings > Service accounts.
// 2. Click "Generate new private key" and download the JSON file.
// 3. Place the file in your project folder and rename it to "serviceAccountKey.json".
// !! SECURITY WARNING !!
// Make sure the serviceAccountKey.json file is NOT publicly accessible.
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();
const bot = new TelegramBot(token, { polling: true });
const app = express();

app.use(cors());
app.use(bodyParser.json());

console.log('✅ Telegram Bot server started and listening for Firebase changes...');

// --- Function to listen for new registrations ---
function setupListener(collectionName, type) {
    db.collection(collectionName).where('status', '==', 'pending').onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                const doc = change.doc;
                const data = doc.data();
                console.log(`New pending ${type}:`, data.name);
                
                let message = `*🔔 طلب تسجيل ${type} جديد*\n\n`;
                message += `*الاسم:* ${data.name || 'غير متوفر'}\n`;
                if(data.specialization) message += `*الاختصاص:* ${data.specialization}\n`;
                if(data.bloodType) message += `*فصيلة الدم:* ${data.bloodType}\n`;
                message += `*الهاتف:* \`${data.phone || 'غير متوفر'}\`\n`;
                message += `*المحافظة:* ${data.governorate || 'غير متوفر'}\n`;
                if(data.district) message += `*القضاء:* ${data.district}\n`;
                if(data.priceAfter) message += `*السعر المخفض:* ${data.priceAfter} د.ع\n`;
                if(data.proofFiles && data.proofFiles.length > 0) {
                    message += `\n*الإثباتات:*\n`;
                    data.proofFiles.forEach((file, index) => {
                        message += `[ملف ${index + 1}](${file})\n`;
                    });
                }

                const options = {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '✅ موافقة', callback_data: `approve_${type}_${doc.id}` },
                                { text: '❌ رفض', callback_data: `reject_${type}_${doc.id}` }
                            ]
                        ]
                    }
                };

                bot.sendMessage(adminChatId, message, options);
            }
        });
    });
}

// Start listening to all pending collections
setupListener('pending_doctors', 'طبيب');
setupListener('pending_pharmacies', 'صيدلية');
setupListener('pending_donors', 'متبرع');

// --- Handle button clicks (callbacks) from Telegram ---
bot.on('callback_query', async (query) => {
    const [action, type, docId] = query.data.split('_');
    const fromId = query.from.id;

    // Security check: only the admin can approve/reject
    if (fromId.toString() !== adminChatId) {
        bot.answerCallbackQuery(query.id, { text: 'Permission Denied!' });
        return;
    }

    const pendingCollection = `pending_${type}s`;
    const approvedCollection = `${type}s`;
    const docRef = db.collection(pendingCollection).doc(docId);

    try {
        const doc = await docRef.get();
        if (!doc.exists) {
            bot.answerCallbackQuery(query.id, { text: 'الطلب لم يعد موجوداً' });
            bot.editMessageText(`*تم التعامل مع هذا الطلب مسبقاً.*`, {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                parse_mode: 'Markdown'
            });
            return;
        }
        const data = doc.data();

        if (action === 'approve') {
            // 1. Add to the public (approved) collection
            await db.collection(approvedCollection).doc(docId).set({ ...data, status: 'approved', approvedAt: new Date() });
            
            // 2. Delete from the pending collection
            await docRef.delete();

            bot.editMessageText(`✅ *تمت الموافقة على ${data.name || 'الطلب'}*`, {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                parse_mode: 'Markdown'
            });
            bot.answerCallbackQuery(query.id, { text: 'تمت الموافقة' });

        } else if (action === 'reject') {
            // Just delete the pending request
            await docRef.delete();
            bot.editMessageText(`❌ *تم رفض ${data.name || 'الطلب'}*`, {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                parse_mode: 'Markdown'
            });
            bot.answerCallbackQuery(query.id, { text: 'تم الرفض' });
        }
    } catch (error) {
        console.error("Error processing callback:", error);
        bot.answerCallbackQuery(query.id, { text: 'حدث خطأ ما' });
    }
});

// A simple endpoint to confirm the server is running
app.get('/', (req, res) => {
    res.send('Nabd Akhar Bot Server is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});


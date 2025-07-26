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

  <div><label for="wizard-name" class="font-semibold" data-key="form_name">الاسم الكامل</label><input type="text" id="wizard-name" class="mt-1 w-full p-3 bg-gray-100 dark:bg-slate-700 rounded-md border border-gray-300 dark:border-slate-600" required></div>
                        <div><label for="wizard-phone" class="font-semibold" data-key="form_phone">رقم الهاتف</label><input type="tel" id="wizard-phone" class="mt-1 w-full p-3 bg-gray-100 dark:bg-slate-700 rounded-md border border-gray-300 dark:border-slate-600" required></div>
                    </div>
                </div>
                <div id="step-3" class="wizard-step">
                    <div class="space-y-4">
                        <div><label for="wizard-blood-type" class="font-semibold" data-key="form_blood">فصيلة الدم</label><select id="wizard-blood-type" class="mt-1 w-full p-3 bg-gray-100 dark:bg-slate-700 rounded-md border border-gray-300 dark:border-slate-600" required><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select></div>
                        <div><label for="wizard-governorate" class="font-semibold" data-key="form_gov">المحافظة</label><select id="wizard-governorate" class="mt-1 w-full p-3 bg-gray-100 dark:bg-slate-700 rounded-md border border-gray-300 dark:border-slate-600" required><option value="" data-key="form_select_gov">اختر محافظة...</option></select></div>
                        <div><label for="wizard-district" class="font-semibold" data-key="form_dist">القضاء</label><select id="wizard-district" class="mt-1 w-full p-3 bg-gray-100 dark:bg-slate-700 rounded-md border border-gray-300 dark:border-slate-600" required disabled><option value="" data-key="form_select_dist">اختر قضاء...</option></select></div>
                        <div id="notes-field"><label for="wizard-notes" class="font-semibold" data-key="form_notes">ملاحظات (عاجل، حادث، إلخ)</label><textarea id="wizard-notes" rows="2" class="mt-1 w-full p-3 bg-gray-100 dark:bg-slate-700 rounded-md border border-gray-300 dark:border-slate-600"></textarea></div>
                    </div>
                </div>
            </form>
            <div id="wizard-navigation" class="p-4 border-t dark:border-slate-700 flex justify-between">
                <button type="button" id="wizard-prev-btn" class="bg-gray-300 dark:bg-slate-600 font-bold py-3 px-8 rounded-full hover:bg-gray-400" data-key="wizard_prev">السابق</button>
                <button type="button" id="wizard-next-btn" class="bg-red-500 text-white font-bold py-3 px-8 rounded-full hover:bg-red-600" data-key="wizard_next">التالي</button>
                <button type="submit" id="wizard-submit-btn" form="wizard-form" class="bg-green-600 text-white font-bold py-3 px-8 rounded-full hover:bg-green-700 hidden" data-key="wizard_submit">إرسال البيانات</button>
            </div>
        </div>
    </div>
    
    <div id="ai-modal" class="modal-base fixed inset-0 bg-black bg-opacity-70 items-center justify-center z-50 p-4"><div class="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-lg shadow-xl max-w-2xl w-full relative max-h-[90vh] flex flex-col"><button id="close-ai-btn" class="absolute top-4 left-4 rtl:left-auto rtl:right-4 text-gray-500 hover:text-red-500"><i class="fas fa-times text-2xl"></i></button><div id="ai-modal-content" class="overflow-y-auto"></div></div></div>
    <div id="notification-modal" class="modal-base fixed inset-0 bg-black bg-opacity-70 items-center justify-center z-50 p-4"><div class="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-xl max-w-sm w-full text-center"><p id="notification-message" class="text-lg"></p><button id="notification-close-btn" class="mt-6 bg-red-500 text-white font-bold py-2 px-6 rounded-full hover:bg-red-600" data-key="notification_ok">حسناً</button></div></div>

    <!-- Firebase SDK -->
    <script src="https://www.gstatic.com/firebasejs/9.6.7/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore-compat.js"></script>
    
    <!-- Leaflet JS for Map -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>

    <script>
    // --- Firebase Configuration ---
    const firebaseConfig = {
        apiKey: "AIzaSyAtbBMCECJA_c6RrL3684qVZZg7PlOWRCo",
        authDomain: "another-pulse.firebaseapp.com",
        projectId: "another-pulse",
        storageBucket: "another-pulse.appspot.com",
        messagingSenderId: "758165143906",
        appId: "1:758165143906:web:3c907dd3059618c2306c3b",
        measurementId: "G-KY459XYKCY"
    };

    // --- Initialize Firebase ---
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
    } catch (e) {
        console.error("Firebase initialization error", e);
    }
    const db = firebase.firestore();
    const donorsCollection = db.collection('donors');
    const requestsCollection = db.collection('requests');

    // --- Data ---
    const iraqGovernorates = { "بغداد": ["الرصافة", "الكرخ", "الصدر", "الأعظمية", "المنصور", "الكرادة", "الشعلة", "المحمودية", "أبو غريب", "المدائن"], "نينوى": ["الموصل", "تلعفر", "الحمدانية", "سنجار", "الشيخان", "الحضر"], "البصرة": ["البصرة", "القرنة", "الزبير", "الفاو", "أبو الخصيب", "شط العرب"], "ذي قار": ["الناصرية", "الشطرة", "الرفاعي", "سوق الشيوخ", "الجبايش"], "بابل": ["الحلة", "المحاويل", "المسيب", "الهاشمية", "الكفل"], "الأنبار": ["الرمادي", "الفلوجة", "هيت", "حديثة", "عنه", "القائم", "الرطبة"], "ديالى": ["بعقوبة", "المقدادية", "الخالص", "خانقين", "بلدروز"], "كربلاء": ["كربلاء", "عين التمر", "الهندية"], "النجف": ["النجف", "الكوفة", "المناذرة"], "القادسية": ["الديوانية", "عفك", "الشامية", "الحمزة"], "ميسان": ["العمارة", "علي الغربي", "الميمونة", "قلعة صالح", "الكحلاء"], "واسط": ["الكوت", "الحي", "النعمانية", "بدرة", "العزيزية"], "صلاح الدين": ["تكريت", "سامراء", "بلد", "الشرقاط", "بيجي", "الدور"], "كركوك": ["كركوك", "الحويجة", "داقوق", "الدبس"], "أربيل": ["أربيل", "سوران", "شقلاوة", "كويسنجق", "رواندز"], "السليمانية": ["السليمانية", "جمجمال", "دربندخان", "دوكان", "كلار", "حلبجة"], "دهوك": ["دهوك", "العمادية", "زاخو", "سميل", "عقرة"], "المثنى": ["السماوة", "الرميثة", "الخضر", "السلمان"] };
    const translations = {
        ar: { site_name: "نبض آخر", hero_title: "كُن البطل الذي ينقذ حياة", hero_subtitle: "منصتنا الذكية تربطك بفرص التبرع بالدم الأقرب إليك، لأن كل قطرة تمنح أملاً جديداً.", hero_button: "سجل الآن وأنقذ حياة", stat_donors: "متبرع مسجل", stat_requests: "طلب فعال", stat_rescued: "حالة تم إنقاذها", stat_cities: "مدينة مغطاة", stats_title: "إنجازاتنا بالأرقام", filter_title: "ابحث عن فصيلة الدم", filter_all: "الكل", tab_requests: "المحتاجون", tab_donors: "المتبرعون", map_title: "الخريطة التفاعلية", footer_rights: "جميع الحقوق محفوظة (ابراهيم حامد)", wizard_title_1: "أهلاً بك في مجتمع الأبطال", wizard_subtitle_1: "اختر نوع التسجيل للبدء:", wizard_donor_option: "أريد التبرع", wizard_request_option: "أحتاج تبرع", wizard_title_2: "المعلومات الأساسية", wizard_title_3: "التفاصيل الطبية والموقع", wizard_next: "التالي", wizard_prev: "السابق", wizard_submit: "إرسال البيانات", form_name: "الاسم الكامل", form_phone: "رقم الهاتف", form_blood: "فصيلة الدم", form_gov: "المحافظة", form_dist: "القضاء", form_notes: "ملاحظات (عاجل، حادث، إلخ)", form_select_gov: "اختر محافظة...", form_select_dist: "اختر قضاء...", card_needed: "يحتاج تبرع", card_ready: "متبرع جاهز", card_gov: "المحافظة", card_dist: "القضاء", card_contact: "للتواصل", card_notes: "ملاحظات", card_date: "تاريخ التسجيل", no_results: "لا توجد نتائج تطابق بحثك.", ai_button: "البحث الذكي عن متبرعين", ai_modal_title: "أفضل المتبرعين المرشحين", ai_modal_request_for: "للحالة:", ai_match_score: "نقاط السمعة", ai_notify_button: "إرسال إشعار", ai_alert_urgent: "تنبيه ذكي: تم تسجيل حالة طارئة جديدة!", ai_notification_sent: "تم إرسال إشعار محاكاة للمتبرع", notification_ok: "حسناً", notification_error: "حدث خطأ. الرجاء المحاولة مرة أخرى.", notification_success: "تم حفظ بياناتك بنجاح!", notification_select_location: "الرجاء اختيار المحافظة والقضاء.", dev_contact_title: "تواصل معنا", quote1: "قطرة دم منك، نبض حياة لغيرك.", quote2: "تبرعك بالدم، أسمى أنواع العطاء.", quote3: "لا تتردد، ففي وريدك حياة تنتظر.", hall_of_fame_title: "قائمة الفخر للأبطال", stat_total_users: "إجمالي المسجلين" },
        en: { site_name: "Another Pulse", hero_title: "Be the Hero Who Saves a Life", hero_subtitle: "Our smart platform connects you with the nearest blood donation opportunities, because every drop gives new hope.", hero_button: "Register Now & Save a Life", stat_donors: "Registered Donors", stat_requests: "Active Requests", stat_rescued: "Lives Saved", stat_cities: "Cities Covered", stats_title: "Our Achievements in Numbers", filter_title: "Search for Blood Type", filter_all: "All", tab_requests: "Requests", tab_donors: "Donors", map_title: "Interactive Map", footer_rights: "All rights reserved (Ibrahim Hamed)", wizard_title_1: "Welcome to the Community of Heroes", wizard_subtitle_1: "Choose registration type to start:", wizard_donor_option: "I want to donate", wizard_request_option: "I need a donation", wizard_title_2: "Basic Information", wizard_title_3: "Medical & Location Details", wizard_next: "Next", wizard_prev: "Previous", wizard_submit: "Submit Data", form_name: "Full Name", form_phone: "Phone Number", form_blood: "Blood Type", form_gov: "Governorate", form_dist: "District", form_notes: "Notes (Urgent, Accident, etc.)", form_select_gov: "Select governorate...", form_select_dist: "Select district...", card_needed: "Needs Donation", card_ready: "Ready to Donate", card_gov: "Governorate", card_dist: "District", card_contact: "Contact", card_notes: "Notes", card_date: "Registration Date", no_results: "No results match your search.", ai_button: "AI Donor Search", ai_modal_title: "Top Recommended Donors", ai_modal_request_for: "For case:", ai_match_score: "Reputation Score", ai_notify_button: "Send Notification", ai_alert_urgent: "Smart Alert: New emergency case registered!", ai_notification_sent: "Simulated notification sent to donor", notification_ok: "OK", notification_error: "An error occurred. Please try again.", notification_success: "Your data has been saved successfully!", notification_select_location: "Please select a governorate and district.", dev_contact_title: "Contact Us", quote1: "A drop of your blood, a pulse of life for another.", quote2: "Donating blood is the ultimate act of giving.", quote3: "Don't hesitate, a life is waiting in your veins.", hall_of_fame_title: "Hall of Fame for Heroes", stat_total_users: "Total Registered" },
        ku: { site_name: "لێدانێکی تر", hero_title: "ببە بەو پاڵەوانەی کە ژیانێک ڕزگار دەکات", hero_subtitle: "پلاتفۆرمی زیرەکی ئێمە بە نزیکترین دەرفەتەکانی خوێنبەخشینەوە دەتبەستێتەوە، چونکە هەر دڵۆپێک هیوایەکی نوێ دەبەخشێت.", hero_button: "ئێستا تۆمار بکە و ژیانێک ڕزگار بکە", stat_donors: "خوێنبەخشی تۆمارکراو", stat_requests: "داواکاری چالاک", stat_rescued: "ژیانی ڕزگارکراو", stat_cities: "شاری داپۆشراو", stats_title: "دەستکەوتەکانمان بە ژمارە", filter_title: "گەڕان بۆ جۆری خوێن", filter_all: "هەمووی", tab_requests: "پێویستەکان", tab_donors: "خوێنبەخشان", map_title: "نەخشەی کارلێککار", footer_rights: "هەموو مافێکی پارێزراوە (ئیبراهیم حامد)", wizard_title_1: "بەخێربێیت بۆ کۆمەڵگەی پاڵەوانان", wizard_subtitle_1: "جۆری تۆمارکردن هەڵبژێرە بۆ دەستپێکردن:", wizard_donor_option: "دەمەوێت خوێن ببەخشم", wizard_request_option: "پێویستم بە خوێنبەخشینە", wizard_title_2: "زانیاری سەرەتایی", wizard_title_3: "ورردەکاری پزیشکی و شوێن", wizard_next: "دواتر", wizard_prev: "پێشووتر", wizard_submit: "ناردنی زانیاری", form_name: "ناوی تەواو", form_phone: "ژمارەی تەلەفۆن", form_blood: "جۆری خوێن", form_gov: "پارێزگا", form_dist: "قەزا", form_notes: "تێبینی (بەپەلە، ڕووداو، هتد)", form_select_gov: "پارێزگا هەڵبژێرە...", form_select_dist: "قەزا هەڵبژێرە...", card_needed: "پێویستی بە بەخشینە", card_ready: "ئامادەیە بۆ بەخشین", card_gov: "پارێزگا", card_dist: "قەزا", card_contact: "پەیوەندی", card_notes: "تێبینی", card_date: "بەرواری تۆمارکردن", no_results: "هیچ ئەنجامێک نەدۆزرایەوە.", ai_button: "گەڕانی زیرەک بۆ خوێنبەخش", ai_modal_title: "باشترین خوێنبەخشە پێشنیارکراوەکان", ai_modal_request_for: "بۆ حاڵەتی:", ai_match_score: "خاڵی ناوبانگ", ai_notify_button: "ناردنی ئاگاداری", ai_alert_urgent: "ئاگاداری زیرەک: حاڵەتێکی بەپەلەی نوێ تۆمارکرا!", ai_notification_sent: "ئاگادارییەکی خەیاڵی بۆ خوێنبەخش نێردرا", notification_ok: "باشە", notification_error: "هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵبدەرەوە.", notification_success: "زانیارییەکانت بە سەرکەوتوویی پاشەکەوت کران!", notification_select_location: "تکایە پارێزگا و قەزا هەڵبژێرە.", dev_contact_title: "پەیوەندی بە گەشەپێدەرەوە بکە", quote1: "دڵۆپێک خوێن لە تۆ، لێدانێکی ژیانە بۆ کەسێکی تر.", quote2: "خوێنبەخشین بەرزترین جۆری بەخشینە.", quote3: "دوودڵ مەبە، ژیانێک لە خوێنهێنەرەکانتدا چاوەڕێیە.", hall_of_fame_title: "لیستی شانازی بۆ پاڵەوانان", stat_total_users: "کۆی تۆمارکراوان" }
    };
    const bloodCompatibility = { 'A+': ['A+', 'AB+'], 'A-': ['A+', 'A-', 'AB+', 'AB-'], 'B+': ['B+', 'AB+'], 'B-': ['B+', 'B-', 'AB+', 'AB-'], 'AB+': ['AB+'], 'AB-': ['AB+', 'AB-'], 'O+': ['A+', 'B+', 'AB+', 'O+'], 'O-': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] };
    const urgentKeywords = ["عاجل", "حادث", "فوري", "طوارئ", "urgent", "emergency", "accident", "بەپەلە", "ناکاو"];

    // --- Global Variables & DOM Elements ---
    let allData = { donors: [], requests: [] };
    let currentView = 'requests';
    let map;
    let markersLayer;
    let topDonors = [];
    const cardsContainer = document.getElementById('cards-container');
    const [showRequestsBtn, showDonorsBtn, filterBloodType] = ['show-requests-btn', 'show-donors-btn', 'filter-blood-type'].map(id => document.getElementById(id));
    const [donorsCountEl, requestsCountEl, rescuedCountEl, citiesCountEl, totalUsersCountEl] = ['donors-count', 'requests-count', 'rescued-count', 'cities-count', 'total-users-count'].map(id => document.getElementById(id));
    const [wizardModal, closeWizardBtn, wizardForm, wizardTitle, wizardNavigation, wizardPrevBtn, wizardNextBtn, wizardSubmitBtn] = ['wizard-modal', 'close-wizard-btn', 'wizard-form', 'wizard-title', 'wizard-navigation', 'wizard-prev-btn', 'wizard-next-btn', 'wizard-submit-btn'].map(id => document.getElementById(id));
    const [aiModal, closeAiBtn, aiModalContent] = ['ai-modal', 'close-ai-btn', 'ai-modal-content'].map(id => document.getElementById(id));
    const [liveAlert, liveAlertText] = ['live-alert', 'live-alert-text'].map(id => document.getElementById(id));
    const [notificationModal, notificationMessage, notificationCloseBtn] = ['notification-modal', 'notification-message', 'notification-close-btn'].map(id => document.getElementById(id));
    const languageSwitcher = document.getElementById('language-switcher');
    let currentStep = 0;
    
    // --- AI & Matching Logic ---
    const isUrgent = (request) => request.notes && urgentKeywords.some(keyword => request.notes.toLowerCase().includes(keyword));
    const findBestMatches = (request) => {
        const compatibleBloodTypes = bloodCompatibility[request.bloodType];
        if (!compatibleBloodTypes) return [];
        return allData.donors.map(donor => {
            let matchScore = 0;
            if (!compatibleBloodTypes.includes(donor.bloodType)) return null;
            matchScore += 50;
            if (donor.governorate === request.governorate) {
                matchScore += 30;
                if (donor.district === request.district) matchScore += 20;
            }
            return { ...donor, matchScore };
        }).filter(Boolean).sort((a, b) => b.matchScore - a.matchScore);
    };
    
    // --- UI & Rendering ---
    const getLang = () => localStorage.getItem('language') || 'ar';
    function setLanguage(lang) {
        const t = translations[lang];
        document.querySelectorAll('[data-key]').forEach(el => {
            const key = el.getAttribute('data-key');
            if (t[key]) {
                if(el.placeholder !== undefined) el.placeholder = t[key];
                else el.textContent = t[key];
            }
        });
        document.documentElement.lang = lang;
        document.documentElement.dir = (lang === 'ar' || lang === 'ku') ? 'rtl' : 'ltr';
        localStorage.setItem('language', lang);
        showMotivationalQuote();
        applyFilters(); 
    }

    function renderCards(data) {
        const t = translations[getLang()];
        cardsContainer.innerHTML = '';
        if (data.length === 0) {
            cardsContainer.innerHTML = `<div class="col-span-full text-center text-gray-500 py-10"><i class="fas fa-box-open text-4xl mb-4"></i><p data-key="no_results">${t.no_results}</p></div>`;
            return;
        }
        data.forEach(item => {
            const isRequest = currentView === 'requests';
            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden flex flex-col transition-transform transform hover:-translate-y-1';
            const isTopDonor = !isRequest && topDonors.some(d => d.id === item.id);
            let cardHTML = `
                <div class="p-4 border-b-4 ${isRequest ? 'border-red-500' : 'border-green-500'}">
                    <div class="flex items-center justify-between">
                        <h3 class="font-black text-xl flex items-center">${item.name} ${isTopDonor ? '<i class="fas fa-medal text-yellow-400 mr-2"></i>' : ''}</h3>
                        <div class="text-3xl font-bold text-white ${isRequest ? 'bg-red-500' : 'bg-green-500'} rounded-full w-14 h-14 flex items-center justify-center">${item.bloodType}</div>
                    </div>
                    <p class="text-sm ${isRequest ? 'text-red-600' : 'text-green-600'} dark:${isRequest ? 'text-red-400' : 'text-green-400'} mt-1 font-bold">${isRequest ? t.card_needed : t.card_ready}</p>
                </div>
                <div class="p-4 space-y-2 flex-grow">
                    <p><i class="fas fa-map-marker-alt fa-fw w-5 text-gray-400 ml-2 rtl:ml-0 rtl:mr-2"></i><strong>${t.card_gov}:</strong> ${item.governorate}</p>
                    <p><i class="fas fa-city fa-fw w-5 text-gray-400 ml-2 rtl:ml-0 rtl:mr-2"></i><strong>${t.card_dist}:</strong> ${item.district}</p>
                    <p><i class="fas fa-phone-alt fa-fw w-5 text-gray-400 ml-2 rtl:ml-0 rtl:mr-2"></i><strong>${t.card_contact}:</strong> <a href="tel:${item.phone}" onclick="incrementDonorClickCount('${item.id}')" class="text-blue-500 hover:underline">${item.phone}</a></p>
                    ${item.notes ? `<p class="text-sm text-slate-600 dark:text-slate-300 mt-2"><i class="fas fa-notes-medical fa-fw w-5 text-gray-400 ml-2 rtl:ml-0 rtl:mr-2"></i><strong>${t.card_notes}:</strong> ${item.notes}</p>` : ''}
                </div>
            `;
            if (isRequest) {
                cardHTML += `<div class="p-3 bg-gray-100 dark:bg-slate-700"><button onclick="openAiModal('${item.id}')" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition"><i class="fas fa-brain mr-2"></i> ${t.ai_button}</button></div>`;
            }
            const date = item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : '...';
            cardHTML += `<div class="p-3 bg-gray-50 dark:bg-slate-700/50"><p class="text-xs text-gray-500 dark:text-gray-400">${t.card_date}: ${date}</p></div>`;
            card.innerHTML = cardHTML;
            cardsContainer.appendChild(card);
        });
    }
    
    function renderHallOfFame(donors) {
        const container = document.getElementById('hall-of-fame-container');
        container.innerHTML = '';
        if (donors.length === 0) {
            container.innerHTML = `<p class="col-span-full text-center text-gray-500 py-10">${translations[getLang()].no_results}</p>`;
            return;
        }
        donors.forEach((donor, index) => {
            const colors = ['bg-yellow-400', 'bg-gray-300', 'bg-yellow-600'];
            const color = colors[index] || 'bg-gray-200';
            const card = document.createElement('div');
            card.className = `p-4 rounded-lg shadow-lg text-center ${color} dark:bg-slate-700`;
            card.innerHTML = `
                <i class="fas fa-medal text-4xl mb-2 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-500' : 'text-yellow-700'}"></i>
                <h4 class="font-bold text-lg text-black dark:text-white">${donor.name}</h4>
                <p class="text-sm text-black dark:text-gray-300">${donor.governorate}</p>
                <p class="text-sm font-bold text-black dark:text-white mt-2">${donor.clickCount || 0} ${translations[getLang()].ai_match_score || 'Points'}</p>
            `;
            container.appendChild(card);
        });
    }
    
    function updateStats() {
        totalUsersCountEl.textContent = allData.donors.length + allData.requests.length;
        donorsCountEl.textContent = allData.donors.length;
        requestsCountEl.textContent = allData.requests.length;
        rescuedCountEl.textContent = allData.donors.reduce((sum, d) => sum + (d.clickCount || 0), 0);
        citiesCountEl.textContent = new Set(allData.donors.map(d => d.governorate)).size;
    }

    function applyFilters() {
        const bloodQuery = filterBloodType.value;
        const dataToFilter = allData[currentView];
        const filtered = dataToFilter.filter(item => !bloodQuery || item.bloodType === bloodQuery);
        renderCards(filtered);
        
        const mapSection = document.getElementById('map-section');
        if (bloodQuery) {
            mapSection.style.display = 'block';
            updateMapMarkers(filtered);
        } else {
            mapSection.style.display = 'none';
        }
    }

    function initializeMap() {
        if (map) map.remove();
        map = L.map('map').setView([33.3152, 44.3661], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
        markersLayer = L.layerGroup().addTo(map);
    }

    async function updateMapMarkers(data) {
        if (!map || !Array.isArray(data)) return;
        markersLayer.clearLayers();
        for (const item of data) {
            try {
                const query = `${item.district}, ${item.governorate}, Iraq`;
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
                const geoData = await response.json();
                if (geoData.length > 0) {
                    const { lat, lon } = geoData[0];
                    const isRequest = currentView === 'requests';
                    const iconColor = isRequest ? '#ef4444' : '#22c55e';
                    const marker = L.marker([lat, lon], {
                        icon: L.divIcon({ html: `<i class="fas fa-map-pin" style="color: ${iconColor}; font-size: 2rem; text-shadow: 0 0 3px black;"></i>`, className: 'bg-transparent border-0', iconSize: [30, 30], iconAnchor: [15, 30] })
                    }).addTo(markersLayer);
                    marker.bindPopup(`<b>${item.name} (${item.bloodType})</b><br>${item.district}, ${item.governorate}<br><a href="tel:${item.phone}" onclick="incrementDonorClickCount('${item.id}')" class="text-blue-500">تواصل</a>`);
                }
            } catch (error) { console.error("Geocoding error:", error); }
        }
    }
    
    function showLiveAlert(message) {
        liveAlertText.textContent = message;
        liveAlert.style.display = 'block';
        setTimeout(() => { liveAlert.style.transform = 'translateY(0)'; }, 10);
        setTimeout(() => { liveAlert.style.transform = 'translateY(-100%)'; }, 5000);
    }

    function showNotification(messageKey) {
        const t = translations[getLang()];
        notificationMessage.textContent = t[messageKey];
        notificationModal.classList.add('active');
    }

    function openAiModal(requestId) {
        const t = translations[getLang()];
        const request = allData.requests.find(r => r.id === requestId);
        if (!request) return;
        const matches = findBestMatches(request);
        let contentHTML = `<h3 class="text-2xl font-bold text-center mb-4">${t.ai_modal_title}</h3>
                           <p class="text-center mb-6">${t.ai_modal_request_for} <strong>${request.name} (${request.bloodType})</strong></p>
                           <div class="space-y-4 max-h-96 overflow-y-auto pr-2">`;
        if (matches.length === 0) {
            contentHTML += `<p class="text-center text-gray-500">${t.no_results}</p>`;
        } else {
            matches.slice(0, 5).forEach(donor => {
                contentHTML += `<div class="bg-gray-100 dark:bg-slate-700 p-4 rounded-lg flex justify-between items-center">
                        <div><p class="font-bold">${donor.name} (${donor.bloodType})</p><p class="text-sm text-gray-600 dark:text-gray-400">${donor.district}, ${donor.governorate}</p><p class="text-sm font-bold text-blue-500">${t.ai_match_score}: ${donor.matchScore}</p></div>
                        <button onclick="showNotification('ai_notification_sent')" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-full text-sm"><i class="fas fa-bell"></i> ${t.ai_notify_button}</button>
                    </div>`;
            });
        }
        contentHTML += `</div>`;
        aiModalContent.innerHTML = contentHTML;
        aiModal.classList.add('active');
    }

    function showMotivationalQuote() {
        const t = translations[getLang()];
        const quotes = [t.quote1, t.quote2, t.quote3];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        document.getElementById('motivational-quote').textContent = randomQuote;
    }

    // --- Wizard Logic ---
    const wizardStepElements = Array.from(document.querySelectorAll('.wizard-step'));
    const wizardGovSelect = wizardForm.querySelector('#wizard-governorate');
    const wizardDistSelect = wizardForm.querySelector('#wizard-district');

    function populateWizardGovernorates() {
        const t = translations[getLang()];
        wizardGovSelect.innerHTML = `<option value="">${t.form_select_gov}</option>`;
        Object.keys(iraqGovernorates).forEach(gov => {
            wizardGovSelect.innerHTML += `<option value="${gov}">${gov}</option>`;
        });
    }

    function updateWizardDistricts() {
        const t = translations[getLang()];
        const selectedGov = wizardGovSelect.value;
        wizardDistSelect.innerHTML = '';
        wizardDistSelect.disabled = true;
        if (!selectedGov) {
            wizardDistSelect.innerHTML = `<option value="">${t.form_select_dist}</option>`;
            return;
        }
        const districts = iraqGovernorates[selectedGov];
        wizardDistSelect.innerHTML = `<option value="">${t.form_select_dist}</option>`;
        districts.forEach(dist => {
            wizardDistSelect.innerHTML += `<option value="${dist}">${dist}</option>`;
        });
        wizardDistSelect.disabled = false;
    }

    function showWizardStep(stepIndex) {
        currentStep = stepIndex;
        const t = translations[getLang()];
        const titles = ["wizard_title_1", "wizard_title_2", "wizard_title_3"];
        
        wizardTitle.textContent = t[titles[stepIndex]];
        wizardStepElements.forEach((step, index) => {
            step.classList.toggle('active', index === stepIndex);
        });

        if (stepIndex === 2) {
            wizardForm.querySelector('#notes-field').style.display = wizardModal.querySelector('input[name="user_type"]:checked').value === 'donor' ? 'block' : 'none';
        }
        
        setLanguage(getLang());

        wizardPrevBtn.classList.toggle('hidden', stepIndex === 0);
        wizardNextBtn.classList.toggle('hidden', stepIndex === wizardStepElements.length - 1);
        wizardSubmitBtn.classList.toggle('hidden', stepIndex !== wizardStepElements.length - 1);
    }
    
    async function incrementDonorClickCount(donorId) {
        if (!donorId) return;
        const donorRef = db.collection('donors').doc(donorId);
        try {
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(donorRef);
                if (!doc.exists) return;
                const newCount = (doc.data().clickCount || 0) + 1;
                transaction.update(donorRef, { clickCount: newCount });
            });
        } catch (e) {
            console.error("Transaction failed: ", e);
        }
    }

    // --- Event Listeners & Initial Load ---
    document.addEventListener('DOMContentLoaded', () => {
        const savedLang = localStorage.getItem('language') || 'ar';
        languageSwitcher.value = savedLang;
        setLanguage(savedLang);
        initializeMap();
        populateWizardGovernorates();

        donorsCollection.orderBy('createdAt', 'desc').onSnapshot(snap => {
            allData.donors = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            topDonors = [...allData.donors].sort((a,b) => (b.clickCount || 0) - (a.clickCount || 0)).slice(0,3);
            renderHallOfFame(topDonors);
            applyFilters(); updateStats(); updateMapMarkers();
        });
        requestsCollection.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            const t = translations[getLang()];
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") {
                    if (isUrgent(change.doc.data())) {
                        showLiveAlert(`${t.ai_alert_urgent} (${change.doc.data().bloodType} in ${change.doc.data().governorate})`);
                    }
                }
            });
            allData.requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            applyFilters(); updateStats();
        });

        document.getElementById('dark-mode-toggle').addEventListener('click', () => { document.documentElement.classList.toggle('dark'); });
        languageSwitcher.addEventListener('change', (e) => setLanguage(e.target.value));
        
        showRequestsBtn.addEventListener('click', () => { currentView = 'requests'; showRequestsBtn.classList.add('active'); showDonorsBtn.classList.remove('active'); applyFilters(); updateMapMarkers(); });
        showDonorsBtn.addEventListener('click', () => { currentView = 'donors'; showDonorsBtn.classList.add('active'); showRequestsBtn.classList.remove('active'); applyFilters(); updateMapMarkers(); });

        filterBloodType.addEventListener('input', applyFilters);
        
        document.getElementById('start-donation-btn-hero').addEventListener('click', () => {
            showWizardStep(0);
            wizardModal.classList.add('active');
        });
        closeWizardBtn.addEventListener('click', () => wizardModal.classList.remove('active'));
        closeAiBtn.addEventListener('click', () => aiModal.classList.remove('active'));
        notificationCloseBtn.addEventListener('click', () => notificationModal.classList.remove('active'));
        
        wizardNextBtn.addEventListener('click', () => showWizardStep(currentStep + 1));
        wizardPrevBtn.addEventListener('click', () => showWizardStep(currentStep - 1));
        
        wizardGovSelect.addEventListener('change', () => updateWizardDistricts());

        wizardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userType = wizardModal.querySelector('input[name="user_type"]:checked').value;
            const collection = userType === 'donor' ? donorsCollection : requestsCollection;
            const data = {
                name: wizardForm.querySelector('#wizard-name').value, phone: wizardForm.querySelector('#wizard-phone').value,
                bloodType: wizardForm.querySelector('#wizard-blood-type').value, governorate: wizardForm.querySelector('#wizard-governorate').value,
                district: wizardForm.querySelector('#wizard-district').value, notes: wizardForm.querySelector('#wizard-notes').value,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if(!data.governorate || !data.district) { showNotification('notification_select_location'); return; }
            try {
                await db.collection(collection.path).add(data);
                showNotification('notification_success');
                wizardForm.reset();
                wizardModal.classList.remove('active');
            } catch (error) { console.error("Error adding document: ", error); showNotification('notification_error'); }
        });
    });
    </script>
</body>
</html>

stricts.forEach(dist => {
            wizardDistSelect.innerHTML += `<option value="${dist}">${dist}</option>`;
        });
        wizardDistSelect.disabled = false;
    }

    function showWizardStep(stepIndex) {
        currentStep = stepIndex;
        const t = translations[getLang()];
        const titles = ["wizard_title_1", "wizard_title_2", "wizard_title_3"];
        
        wizardTitle.textContent = t[titles[stepIndex]];
        wizardStepElements.forEach((step, index) => {
            step.classList.toggle('active', index === stepIndex);
        });

        if (stepIndex === 2) {
            wizardForm.querySelector('#notes-field').style.display = wizardModal.querySelector('input[name="user_type"]:checked').value === 'donor' ? 'block' : 'none';
        }
        
        setLanguage(getLang());

        wizardPrevBtn.classList.toggle('hidden', stepIndex === 0);
        wizardNextBtn.classList.toggle('hidden', stepIndex === wizardStepElements.length - 1);
        wizardSubmitBtn.classList.toggle('hidden', stepIndex !== wizardStepElements.length - 1);
    }
    
    async function incrementDonorClickCount(donorId) {
        if (!donorId) return;
        const donorRef = db.collection('donors').doc(donorId);
        try {
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(donorRef);
                if (!doc.exists) return;
                const newCount = (doc.data().clickCount || 0) + 1;
                transaction.update(donorRef, { clickCount: newCount });
            });
        } catch (e) {
            console.error("Transaction failed: ", e);
        }
    }

    // --- Event Listeners & Initial Load ---
    document.addEventListener('DOMContentLoaded', () => {
        const savedLang = localStorage.getItem('language') || 'ar';
        languageSwitcher.value = savedLang;
        setLanguage(savedLang);
        initializeMap();
        populateWizardGovernorates();

        donorsCollection.orderBy('createdAt', 'desc').onSnapshot(snap => {
            allData.donors = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            topDonors = [...allData.donors].sort((a,b) => (b.clickCount || 0) - (a.clickCount || 0)).slice(0,3);
            renderHallOfFame(topDonors);
            applyFilters(); updateStats(); updateMapMarkers();
        });
        requestsCollection.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            const t = translations[getLang()];
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") {
                    if (isUrgent(change.doc.data())) {
                        showLiveAlert(`${t.ai_alert_urgent} (${change.doc.data().bloodType} in ${change.doc.data().governorate})`);
                    }
                }
            });
            allData.requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            applyFilters(); updateStats();
        });

        document.getElementById('dark-mode-toggle').addEventListener('click', () => { document.documentElement.classList.toggle('dark'); });
        languageSwitcher.addEventListener('change', (e) => setLanguage(e.target.value));
        
        showRequestsBtn.addEventListener('click', () => { currentView = 'requests'; showRequestsBtn.classList.add('active'); showDonorsBtn.classList.remove('active'); applyFilters(); updateMapMarkers(); });
        showDonorsBtn.addEventListener('click', () => { currentView = 'donors'; showDonorsBtn.classList.add('active'); showRequestsBtn.classList.remove('active'); applyFilters(); updateMapMarkers(); });

        filterBloodType.addEventListener('input', applyFilters);
        
        document.getElementById('start-donation-btn-hero').addEventListener('click', () => {
            showWizardStep(0);
            wizardModal.classList.add('active');
        });
        closeWizardBtn.addEventListener('click', () => wizardModal.classList.remove('active'));
        closeAiBtn.addEventListener('click', () => aiModal.classList.remove('active'));
        notificationCloseBtn.addEventListener('click', () => notificationModal.classList.remove('active'));
        
        wizardNextBtn.addEventListener('click', () => showWizardStep(currentStep + 1));
        wizardPrevBtn.addEventListener('click', () => showWizardStep(currentStep - 1));
        
        wizardGovSelect.addEventListener('change', () => updateWizardDistricts());

        wizardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userType = wizardModal.querySelector('input[name="user_type"]:checked').value;
            const collection = userType === 'donor' ? donorsCollection : requestsCollection;
            const data = {
                name: wizardForm.querySelector('#wizard-name').value, phone: wizardForm.querySelector('#wizard-phone').value,
                bloodType: wizardForm.querySelector('#wizard-blood-type').value, governorate: wizardForm.querySelector('#wizard-governorate').value,
                district: wizardForm.querySelector('#wizard-district').value, notes: wizardForm.querySelector('#wizard-notes').value,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if(!data.governorate || !data.district) { showNotification('notification_select_location'); return; }
            try {
                await db.collection(collection.path).add(data);
                showNotification('notification_success');
                wizardForm.reset();
                wizardModal.classList.remove('active');
            } catch (error) { console.error("Error adding document: ", error); showNotification('notification_error'); }
        });
    });
    </script>
</body>
</html>


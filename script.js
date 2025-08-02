// =================================================================
// BAGIAN 1: KONFIGURASI FIREBASE
// =================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDxX4eA7nzdvIRZFGD9q6iJWmdVBg7VpKw",
    authDomain: "reading-tracker-1e75b.firebaseapp.com",
    databaseURL: "https://reading-tracker-1e75b-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "reading-tracker-1e75b",
    storageBucket: "reading-tracker-1e75b.firebasestorage.app",
    messagingSenderId: "236240069996",
    appId: "1:236240069996:web:dcbf03f90fa059e4c27f49",
    measurementId: "G-Z608HV2QPW"
  };
  
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();
let userRef = null;
let currentUsername = null;

// =================================================================
// BAGIAN 2: DATA & STATE GLOBAL
// =================================================================
let books = [];
let userStats = {}; 
let missions = {}; 
let achievements = {}; 
let currentSession = {};

const defaultState = {
    userStats: {
        totalPoints: 0, level: 1, booksCompleted: 0, totalReadingTime: 0,
        coins: 0, seasonStartDate: new Date().toISOString(), activeBoosters: [],
    },
    missions: {
        daily: { lastReset: new Date().toISOString(), list: [] },
        weekly: { lastReset: new Date().toISOString(), list: [] }
    },
    achievements: {
        read_1_book: { unlocked: false }, read_10_books: { unlocked: false },
        read_100_hours: { unlocked: false }, reach_level_10: { unlocked: false },
        complete_50_missions: { unlocked: false },
    }
};

const LEVEL_NAMES=["Bookworm Beginner","Page Turner","Story Seeker","Chapter Chaser","Novel Navigator","Literary Learner","Reading Rookie","Book Browser","Tale Tracker","Word Warrior","Prose Pioneer","Fiction Fan","Literature Lover","Story Scholar","Reading Ranger","Book Buff","Chapter Champion","Novel Ninja","Literary Legend","Reading Royalty","Manuscript Master","Epic Explorer","Saga Specialist","Chronicle Conqueror","Tome Titan","Literary Luminary","Reading Ruler","Book Baron","Story Sovereign","Word Wizard","Prose Prodigy","Fiction Pharaoh","Literary Lord","Reading Regent","Book Emperor","Chapter Czar","Novel Noble","Story Sultan","Word Warlord","Literary Laureate","Reading Virtuoso","Book Maestro","Story Savant","Literary Genius","Reading Oracle","Book Prophet","Story Sage","Literary Saint","Reading Deity","Omnireader Supreme"];
const POINTS_PER_LEVEL=[100,150,200,250,300,350,400,450,500,550,600,650,700,750,800,850,900,950,1000,1100,1200,1300,1400,1500,1600,1700,1800,1900,2000,2200,2400,2600,2800,3000,3200,3400,3600,3800,4000,4500,5000,5500,6000,6500,7000,7500,8000,8500,9000,10000];
const ALL_MISSIONS={daily:[{id:'read_30_min',text:'Read for 30 minutes',target:1800,type:'time',reward:25},{id:'read_1_session',text:'Complete one reading session',target:1,type:'session',reward:15},],weekly:[{id:'read_5_hours',text:'Read for 5 hours in a week',target:18000,type:'time',reward:100},{id:'finish_1_book',text:'Finish one book',target:1,type:'complete_book',reward:150},]};
const ALL_ACHIEVEMENTS={read_1_book:{name:"First Chapter",description:"Finish your first book."},read_10_books:{name:"Book Collector",description:"Finish 10 books."},read_100_hours:{name:"Time Weaver",description:"Read for a total of 100 hours."},reach_level_10:{name:"Double Digits",description:"Reach level 10 in any season."},complete_50_missions:{name:"Taskmaster",description:"Complete 50 missions."}};
const SHOP_ITEMS=[{id:'double_points_1hr',name:'2x Points (1 Hour)',description:'Earn double points from reading for one hour.',cost:50,action:'buyBooster',duration:3600000},{id:'bonus_100_points',name:'Instant 100 Points',description:'Get 100 points instantly.',cost:75,action:'buyInstantPoints',points:100},{id:'skip_mission',name:'Mission Skip Ticket',description:'Instantly complete one daily mission.',cost:30,action:'buyMissionSkip'}];

// =================================================================
// BAGIAN 3: INISIALISASI APLIKASI
// =================================================================

// Deklarasi semua elemen DOM di satu tempat
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const appHeader = document.querySelector('.header');
const appMain = document.querySelector('.main-container');
const currentUserDisplay = document.getElementById('current-user-display');
const mainNav = document.getElementById('main-nav');
const views = document.querySelectorAll('.view');
const userCoinsElement = document.getElementById('user-coins');
const addBookForm = document.getElementById('add-book-form');
const bookList = document.getElementById('book-list');
const timerModal = document.getElementById('timer-modal');
const modalBookTitle = document.getElementById('modal-book-title');
const timerText = document.getElementById('timer-text');
const pauseResumeBtn = document.getElementById('pause-resume-btn');
const stopSessionBtn = document.getElementById('stop-session-btn');
const pageInputSection = document.getElementById('page-input-section');
const currentPageInput = document.getElementById('current-page');
const saveProgressBtn = document.getElementById('save-progress-btn');
const closeModalBtn = document.getElementById('close-modal');
const userLevelElement = document.getElementById('user-level');
const levelNameElement = document.getElementById('level-name');
const levelFillElement = document.getElementById('level-fill');
const currentPointsElement = document.getElementById('current-points');
const nextLevelPointsElement = document.getElementById('next-level-points');
const profileContent = document.getElementById('profile-content');
const missionsContent = document.getElementById('missions-content');
const achievementsContent = document.getElementById('achievements-content');
const shopContent = document.getElementById('shop-content');

document.addEventListener('DOMContentLoaded', function() {
    loginModal.classList.remove('hidden'); // Tampilkan modal login
    loginForm.addEventListener('submit', handleLogin);
    setupEventListeners();
});

function handleLogin(e) {
    e.preventDefault();
    const username = usernameInput.value.trim();
    if (!username) {
        alert("Please enter a name.");
        return;
    }

    currentUsername = username;
    const sanitizedUsername = username.toLowerCase().replace(/[.#$\[\]]/g, '_');
    userRef = database.ref('users/' + sanitizedUsername);
    
    loadUserData();
}

function loadUserData() {
    userRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Pengguna lama
            books = data.books ? Object.values(data.books) : [];
            userStats = { ...defaultState.userStats, ...data.userStats };
            missions = { ...defaultState.missions, ...data.missions };
            achievements = { ...defaultState.achievements, ...data.achievements };
        } else {
            // Pengguna baru
            books = [];
            userStats = defaultState.userStats;
            achievements = defaultState.achievements;
            // Langsung buat misi baru, jangan tunggu reset
            missions = {
                daily: { lastReset: new Date().toISOString(), list: ALL_MISSIONS.daily.map(m => ({ ...m, progress: 0, claimed: false })) },
                weekly: { lastReset: new Date().toISOString(), list: ALL_MISSIONS.weekly.map(m => ({ ...m, progress: 0, claimed: false })) }
            };
            saveData(); 
        }
        
        initializeApp();
    }, (error) => {
        console.error("Firebase read failed:", error);
        alert("Could not connect to the database.");
    });
}

function initializeApp() {
    loginModal.classList.add('hidden');
    appHeader.classList.remove('app-hidden');
    appMain.classList.remove('app-hidden');
    currentUserDisplay.textContent = currentUsername;

    checkAndResetSeason();
    checkAndResetMissions();
    render();
}

async function saveData() {
    if (!userRef) return;
    try {
        const booksAsObject = books.reduce((obj, book) => {
            if (book && book.id) obj[book.id] = book;
            return obj;
        }, {});
        await userRef.set({ books: booksAsObject, userStats, missions, achievements });
    } catch (error) {
        console.error('Gagal menyimpan data ke Firebase:', error);
    }
}

function setupEventListeners() {
    mainNav.addEventListener('click', (e) => {
        if (e.target.matches('.nav-link')) {
            e.preventDefault();
            const targetViewId = e.target.getAttribute('href').substring(1) + '-view';
            views.forEach(view => view.classList.add('hidden'));
            document.getElementById(targetViewId).classList.remove('hidden');
            mainNav.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
            e.target.classList.add('active');
        }
    });

    addBookForm.addEventListener('submit', handleAddBook);
    bookList.addEventListener('click', handleBookListClick);
    pauseResumeBtn.addEventListener('click', handlePauseResume);
    stopSessionBtn.addEventListener('click', handleStopSession);
    saveProgressBtn.addEventListener('click', handleSaveProgress);
    closeModalBtn.addEventListener('click', closeTimerModal);
    document.body.addEventListener('click', handleDynamicClicks);
}

// =================================================================
// BAGIAN 4: RENDER SEMUA TAMPILAN
// =================================================================

function render() {
    renderStatsHeader();
    renderBookList();
    renderMissions();
    renderAchievements();
    renderShop();
    renderProfile();
}

function renderStatsHeader() {
    if(!userStats.level) return;
    userLevelElement.textContent = userStats.level;
    levelNameElement.textContent = LEVEL_NAMES[userStats.level - 1] || "Ultimate Reader";
    userCoinsElement.innerHTML = `🪙 ${userStats.coins}`;
    const levelInfo = getLevelInfo(userStats.totalPoints);
    const currentLevelPoints = userStats.totalPoints - levelInfo.currentLevelStartPoints;
    const pointsNeededForNext = levelInfo.pointsForNextLevel;
    const progressPercentage = pointsNeededForNext > 0 ? (currentLevelPoints / pointsNeededForNext) * 100 : 100;
    levelFillElement.style.width = `${Math.min(progressPercentage, 100)}%`;
    currentPointsElement.textContent = currentLevelPoints;
    nextLevelPointsElement.textContent = pointsNeededForNext;
}

function renderBookList() {
    if (!bookList) return;
    bookList.innerHTML = '';
    if (books.length === 0) {
        bookList.innerHTML = `<div class="empty-state"><h3>📚 No books yet!</h3><p>Add your first book.</p></div>`;
        return;
    }
    books.forEach(book => bookList.appendChild(createBookCard(book)));
}

function renderMissions() {
    if (!missionsContent || !missions || !missions.daily || !missions.weekly) return;
    missionsContent.innerHTML = `
        <div class="mission-category">
            <h3>Daily Missions</h3>
            <div class="mission-list">${missions.daily.list.map(mission => createMissionCard(mission, 'daily')).join('')}</div>
        </div>
        <div class="mission-category">
            <h3>Weekly Missions</h3>
            <div class="mission-list">${missions.weekly.list.map(mission => createMissionCard(mission, 'weekly')).join('')}</div>
        </div>`;
}

function renderAchievements() {
    if (!achievementsContent) return;
    achievementsContent.innerHTML = Object.keys(ALL_ACHIEVEMENTS).map(key => {
        const achievement = ALL_ACHIEVEMENTS[key];
        const isUnlocked = achievements[key] && achievements[key].unlocked;
        return `
            <div class="achievement-card ${isUnlocked ? 'unlocked' : ''}">
                <div class="achievement-icon">${isUnlocked ? '🏆' : '🔒'}</div>
                <div class="achievement-details"><h4>${achievement.name}</h4><p>${achievement.description}</p></div>
            </div>`;
    }).join('');
}

function renderShop() {
    if (!shopContent) return;
    shopContent.innerHTML = SHOP_ITEMS.map(item => `
        <div class="shop-item-card">
            <h4>${item.name}</h4><p>${item.description}</p>
            <div class="shop-item-footer">
                <span class="item-cost">🪙 ${item.cost}</span>
                <button class="btn btn-small btn-primary buy-item-btn" data-item-id="${item.id}" ${userStats.coins < item.cost ? 'disabled' : ''}>Buy</button>
            </div>
        </div>`).join('');
}

function renderProfile() {
    if (!profileContent) return;
    const totalTimeFormatted = formatReadingTime(books.reduce((sum, book) => sum + book.totalReadTime, 0));
    profileContent.innerHTML = `
        <div class="profile-grid">
            <div class="profile-stat-card"><h4>Level</h4><p>${userStats.level} - ${LEVEL_NAMES[userStats.level - 1]}</p></div>
            <div class="profile-stat-card"><h4>Total Points (Season)</h4><p>${userStats.totalPoints}</p></div>
            <div class="profile-stat-card"><h4>Total Reading Time</h4><p>${totalTimeFormatted}</p></div>
            <div class="profile-stat-card"><h4>Books Completed</h4><p>${books.filter(b => b.isCompleted).length}</p></div>
            <div class="profile-stat-card"><h4>Current Coins</h4><p>🪙 ${userStats.coins}</p></div>
            <div class="profile-stat-card"><h4>Season Ends In</h4><p id="season-countdown-profile">Calculating...</p></div>
        </div>`;
    updateSeasonCountdown(); 
}

// =================================================================
// BAGIAN 5: SEMUA FUNGSI LAINNYA
// =================================================================

function handleDynamicClicks(e) {
    if (e.target.matches('.claim-mission-btn')) {
        handleClaimMission(e.target.dataset.missionId, e.target.dataset.type);
    }
    if (e.target.matches('.buy-item-btn')) {
        handleBuyItem(e.target.dataset.itemId);
    }
}

function handleAddBook(e) {
    e.preventDefault();
    const title = document.getElementById('book-title').value.trim();
    const totalPages = parseInt(document.getElementById('total-pages').value);
    if (!title || !totalPages || totalPages <= 0) return alert('Please enter a valid book title and page count.');
    books.push({ id: Date.now(), title, totalPages, currentPage: 0, totalReadTime: 0, isCompleted: false });
    saveData();
    render();
    e.target.reset();
}

function handleBookListClick(e) {
    const bookId = parseInt(e.target.closest('.book-card')?.dataset.bookId);
    if (!bookId) return;
    if (e.target.matches('.delete-btn')) handleDeleteBook(bookId);
    else if (e.target.matches('.start-reading-btn')) handleStartReading(bookId);
}

function handleDeleteBook(bookId) {
    const book = books.find(b => b.id === bookId);
    if (confirm(`Are you sure you want to delete "${book.title}"?`)) {
        books = books.filter(b => b.id !== bookId);
        saveData();
        render();
    }
}

function handleStartReading(bookId) {
    const book = books.find(b => b.id === bookId);
    currentSession = { bookId, startTime: Date.now(), elapsedTime: 0, isRunning: true, intervalId: null };
    modalBookTitle.textContent = book.title;
    timerText.textContent = '00:00:00';
    pauseResumeBtn.textContent = 'Pause';
    pageInputSection.classList.add('hidden');
    timerModal.classList.remove('hidden');
    startTimer();
}

function handleSaveProgress() {
    const newCurrentPage = parseInt(currentPageInput.value);
    const book = books.find(b => b.id === currentSession.bookId);
    if (!book || isNaN(newCurrentPage) || newCurrentPage < 0 || newCurrentPage > book.totalPages) {
        return alert(`Please enter a valid page number between 0 and ${book.totalPages}.`);
    }
    const wasCompleted = book.isCompleted;
    const sessionTimeSeconds = Math.floor(currentSession.elapsedTime / 1000);
    book.currentPage = newCurrentPage;
    book.totalReadTime += sessionTimeSeconds;
    let timePoints = Math.floor(sessionTimeSeconds / 20);
    const doublePointsBooster = userStats.activeBoosters.find(b => b.id === 'double_points_1hr' && b.expires > Date.now());
    if (doublePointsBooster) {
        timePoints *= 2;
        showLevelUpNotification("2x Points Booster Active!");
    }
    userStats.totalPoints += timePoints;
    if (newCurrentPage >= book.totalPages && !wasCompleted) {
        book.isCompleted = true;
        userStats.booksCompleted++;
        userStats.totalPoints += 50;
        showLevelUpNotification("Book completed! +50 bonus points!");
        updateMissionProgress('complete_book', 1);
    }
    updateMissionProgress('time', sessionTimeSeconds);
    updateMissionProgress('session', 1);
    checkAllAchievements();
    const oldLevel = userStats.level;
    userStats.level = calculateLevelFromPoints(userStats.totalPoints);
    if (userStats.level > oldLevel) {
        showLevelUpNotification(`Level Up! You're now ${LEVEL_NAMES[userStats.level - 1]}!`);
        checkAllAchievements();
    }
    saveData();
    render();
    closeTimerModal();
}

function updateMissionProgress(type, amount) {
    if (!missions || !missions.daily || !missions.weekly) return;
    [missions.daily.list, missions.weekly.list].forEach(list => {
        list.forEach(mission => {
            if (mission.type === type && !mission.claimed) mission.progress += amount;
        });
    });
}

function handleClaimMission(missionId, type) {
    const list = type === 'daily' ? missions.daily.list : missions.weekly.list;
    const mission = list.find(m => m.id === missionId);
    if (mission && mission.progress >= mission.target && !mission.claimed) {
        userStats.totalPoints += mission.reward;
        mission.claimed = true;
        showLevelUpNotification(`Reward Claimed! +${mission.reward} points.`);
        const oldLevel = userStats.level;
        userStats.level = calculateLevelFromPoints(userStats.totalPoints);
        if (userStats.level > oldLevel) showLevelUpNotification(`Level Up! You're now ${LEVEL_NAMES[userStats.level - 1]}!`);
        saveData();
        render();
    }
}

function checkAllAchievements() {
    if (!achievements) return;
    // PERBAIKAN BUG: totalReadTime, bukan totalReadT
    const totalHoursRead = books.reduce((sum, b) => sum + b.totalReadTime, 0) / 3600;
    const booksDone = books.filter(b => b.isCompleted).length;
    if (booksDone >= 1 && !achievements.read_1_book.unlocked) unlockAchievement('read_1_book');
    if (booksDone >= 10 && !achievements.read_10_books.unlocked) unlockAchievement('read_10_books');
    if (totalHoursRead >= 100 && !achievements.read_100_hours.unlocked) unlockAchievement('read_100_hours');
    if (userStats.level >= 10 && !achievements.reach_level_10.unlocked) unlockAchievement('reach_level_10');
}

function unlockAchievement(id) {
    if (achievements[id]) {
        achievements[id].unlocked = true;
        showLevelUpNotification(`Achievement Unlocked: ${ALL_ACHIEVEMENTS[id].name}!`);
        saveData();
        render();
    }
}

function handleBuyItem(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item || userStats.coins < item.cost) return alert("Not enough coins!");
    userStats.coins -= item.cost;
    switch (item.action) {
        case 'buyBooster':
            userStats.activeBoosters.push({ id: item.id, expires: Date.now() + item.duration });
            showLevelUpNotification(`${item.name} purchased and activated!`);
            break;
        case 'buyInstantPoints':
            userStats.totalPoints += item.points;
            showLevelUpNotification(`Purchased ${item.points} points!`);
            break;
        case 'buyMissionSkip':
            alert("Mission Skip functionality coming soon!");
            userStats.coins += item.cost;
            break;
    }
    saveData();
    render();
}

function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.dataset.bookId = book.id;
    const progressPercentage = book.totalPages > 0 ? (book.currentPage / book.totalPages) * 100 : 0;
    const readingTimeFormatted = formatReadingTime(book.totalReadTime);
    card.innerHTML = `<h3>${escapeHtml(book.title)}</h3><div class="reading-time">Total reading time: ${readingTimeFormatted}</div><div class="book-progress"><div class="progress-text"><span>Progress: ${book.currentPage} / ${book.totalPages} pages</span><span>${Math.round(progressPercentage)}%</span></div><div class="progress-bar"><div class="progress-fill" style="width: ${progressPercentage}%"></div></div></div><div class="book-actions"><button class="btn btn-success btn-small start-reading-btn" data-book-id="${book.id}">📖 Start Reading</button><button class="btn btn-danger btn-small delete-btn" data-book-id="${book.id}">🗑️ Delete</button></div>`;
    return card;
}

function startTimer() { currentSession.intervalId = setInterval(updateTimer, 1000); updateTimer(); }
function pauseTimer() { if (currentSession.intervalId) clearInterval(currentSession.intervalId); currentSession.isRunning = false; }
function resumeTimer() { currentSession.startTime = Date.now() - currentSession.elapsedTime; currentSession.isRunning = true; startTimer(); }
function stopTimer() { if (currentSession.intervalId) clearInterval(currentSession.intervalId); currentSession.isRunning = false; }
function updateTimer() { if (currentSession.isRunning) currentSession.elapsedTime = Date.now() - currentSession.startTime; timerText.textContent = formatTime(Math.floor(currentSession.elapsedTime / 1000)); }
function handlePauseResume() { if (currentSession.isRunning) { pauseTimer(); pauseResumeBtn.textContent = 'Resume'; } else { resumeTimer(); pauseResumeBtn.textContent = 'Pause'; } }
function handleStopSession() { stopTimer(); pageInputSection.classList.remove('hidden'); const book = books.find(b => b.id === currentSession.bookId); if (book) { currentPageInput.value = book.currentPage; currentPageInput.max = book.totalPages; currentPageInput.focus(); } }
function closeTimerModal() { stopTimer(); timerModal.classList.add('hidden'); currentSession = {}; }
function formatTime(s) { const h = Math.floor(s/3600).toString().padStart(2,'0'), m=Math.floor(s%3600/60).toString().padStart(2,'0'), c=Math.floor(s%60).toString().padStart(2,'0'); return `${h}:${m}:${c}`; }
function formatReadingTime(s) { if(s===0)return'0m';const h=Math.floor(s/3600),m=Math.floor(s%3600/60); if(h===0)return`${m}m`; return`${h}h ${m}m`; }
function showLevelUpNotification(msg) { const n=document.createElement('div'); n.className='level-notification'; n.textContent=msg; document.body.appendChild(n); setTimeout(()=>n.remove(),3000); }
function escapeHtml(txt) { const d=document.createElement('div'); d.textContent=txt; return d.innerHTML; }
function calculateLevelFromPoints(p) { let l=1, u=0; for(let i=0;i<POINTS_PER_LEVEL.length;i++) { if(p>=u+POINTS_PER_LEVEL[i]) { u+=POINTS_PER_LEVEL[i]; l++; } else break; } return Math.min(l, 50); }
function getLevelInfo(p) { const l=calculateLevelFromPoints(p); let u=0; for(let i=0;i<l-1;i++) u+=POINTS_PER_LEVEL[i]||0; return { currentLevelStartPoints:u, pointsForNextLevel: l<50?POINTS_PER_LEVEL[l-1]||0:0 }; }

function checkAndResetSeason() {
    const now=new Date(), s=new Date(userStats.seasonStartDate);
    if((now.getFullYear()-s.getFullYear())*12 + now.getMonth()-s.getMonth() >= 3) {
        const c=userStats.level*10; userStats.coins+=c;
        showLevelUpNotification(`A new season has begun! You earned ${c} coins. Progress reset.`);
        userStats.totalPoints=0; userStats.level=1; userStats.seasonStartDate=now.toISOString();
        saveData();
    }
}

function updateSeasonCountdown() {
    if(!userStats||!userStats.seasonStartDate)return;
    const s=new Date(userStats.seasonStartDate), e=new Date(s); e.setMonth(e.getMonth()+3);
    const r=e-new Date(); let t="New Season!";
    if(r>0){const d=Math.floor(r/864e5),h=Math.floor(r%864e5/36e5);t=`${d}d ${h}h`;}
    const c=document.getElementById('season-countdown-profile'); if(c)c.textContent=t;
}

function checkAndResetMissions() {
    const n = new Date().getTime();
    if (!missions.daily || (n - new Date(missions.daily.lastReset).getTime() > 864e5)) {
        missions.daily = { lastReset: new Date().toISOString(), list: ALL_MISSIONS.daily.map(m => ({ ...m, progress: 0, claimed: false })) };
    }
    if (!missions.weekly || (n - new Date(missions.weekly.lastReset).getTime() > 6048e5)) {
        missions.weekly = { lastReset: new Date().toISOString(), list: ALL_MISSIONS.weekly.map(m => ({ ...m, progress: 0, claimed: false })) };
    }
}

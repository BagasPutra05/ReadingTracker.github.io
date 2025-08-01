// =================================================================
// BAGIAN 1: KONFIGURASI FIREBASE (TETAP SAMA)
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

// Variabel pengguna sekarang dinamis, tidak lagi statis
let userRef = null;
let currentUsername = null;

// =================================================================
// BAGIAN 2: GLOBAL STATE & DEFINISI DATA
// =================================================================
let books = [];
let userStats = {}; 
let missions = {}; 
let achievements = {}; 

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

let currentSession = {
    bookId: null, startTime: null, elapsedTime: 0, isRunning: false,
    intervalId: null, sessionPoints: 0
};

// DOM elements (ditambah elemen baru untuk login)
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const appHeader = document.querySelector('.header');
const appMain = document.querySelector('.main-container');
const currentUserDisplay = document.getElementById('current-user-display');
// ... (sisa DOM elements sama)
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


// =================================================================
// BAGIAN 3: KONFIGURASI LEVEL, MISI, DLL (TIDAK BERUBAH)
// =================================================================
const LEVEL_NAMES=["Bookworm Beginner","Page Turner","Story Seeker","Chapter Chaser","Novel Navigator","Literary Learner","Reading Rookie","Book Browser","Tale Tracker","Word Warrior","Prose Pioneer","Fiction Fan","Literature Lover","Story Scholar","Reading Ranger","Book Buff","Chapter Champion","Novel Ninja","Literary Legend","Reading Royalty","Manuscript Master","Epic Explorer","Saga Specialist","Chronicle Conqueror","Tome Titan","Literary Luminary","Reading Ruler","Book Baron","Story Sovereign","Word Wizard","Prose Prodigy","Fiction Pharaoh","Literary Lord","Reading Regent","Book Emperor","Chapter Czar","Novel Noble","Story Sultan","Word Warlord","Literary Laureate","Reading Virtuoso","Book Maestro","Story Savant","Literary Genius","Reading Oracle","Book Prophet","Story Sage","Literary Saint","Reading Deity","Omnireader Supreme"];
const POINTS_PER_LEVEL=[100,150,200,250,300,350,400,450,500,550,600,650,700,750,800,850,900,950,1000,1100,1200,1300,1400,1500,1600,1700,1800,1900,2000,2200,2400,2600,2800,3000,3200,3400,3600,3800,4000,4500,5000,5500,6000,6500,7000,7500,8000,8500,9000,10000];
const ALL_MISSIONS={daily:[{id:'read_30_min',text:'Read for 30 minutes',target:1800,type:'time',reward:25},{id:'read_1_session',text:'Complete one reading session',target:1,type:'session',reward:15},],weekly:[{id:'read_5_hours',text:'Read for 5 hours in a week',target:18000,type:'time',reward:100},{id:'finish_1_book',text:'Finish one book',target:1,type:'complete_book',reward:150},]};
const ALL_ACHIEVEMENTS={read_1_book:{name:"First Chapter",description:"Finish your first book."},read_10_books:{name:"Book Collector",description:"Finish 10 books."},read_100_hours:{name:"Time Weaver",description:"Read for a total of 100 hours."},reach_level_10:{name:"Double Digits",description:"Reach level 10 in any season."},complete_50_missions:{name:"Taskmaster",description:"Complete 50 missions."}};
const SHOP_ITEMS=[{id:'double_points_1hr',name:'2x Points (1 Hour)',description:'Earn double points from reading for one hour.',cost:50,action:'buyBooster',duration:3600000},{id:'bonus_100_points',name:'Instant 100 Points',description:'Get 100 points instantly.',cost:75,action:'buyInstantPoints',points:100},{id:'skip_mission',name:'Mission Skip Ticket',description:'Instantly complete one daily mission.',cost:30,action:'buyMissionSkip'}];


// =================================================================
// BAGIAN 4: INISIALISASI APLIKASI & LOGIKA LOGIN
// =================================================================
document.addEventListener('DOMContentLoaded', function() {
    // Tampilkan modal login dan sembunyikan aplikasi utama
    loginModal.classList.remove('hidden');
    appHeader.classList.add('app-hidden');
    appMain.classList.add('app-hidden');

    // Tambahkan event listener untuk form login
    loginForm.addEventListener('submit', handleLogin);
    
    // Setup event listener lainnya
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
    // Ubah nama menjadi kunci yang aman untuk Firebase (lowercase, tanpa karakter ilegal)
    const sanitizedUsername = username.toLowerCase().replace(/[.#$\[\]]/g, '_');

    // Set referensi database ke path pengguna yang spesifik
    userRef = database.ref('users/' + sanitizedUsername);

    // Setelah userRef di-set, kita mulai memuat data mereka
    loadUserData();
}

function loadUserData() {
    userRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Pengguna lama, muat data mereka
            books = data.books ? Object.values(data.books) : [];
            userStats = { ...defaultState.userStats, ...data.userStats };
            missions = { ...defaultState.missions, ...data.missions };
            achievements = { ...defaultState.achievements, ...data.achievements };
        } else {
            // Pengguna baru, gunakan state default
            books = [];
            userStats = defaultState.userStats;
            missions = defaultState.missions;
            achievements = defaultState.achievements;
            // Buat entri awal di database
            saveData(); 
        }
        
        // Inisialisasi setelah data siap
        initializeApp();

    }, (error) => {
        console.error("Gagal membaca data dari Firebase:", error);
        alert("Tidak bisa terhubung ke database. Cek koneksi internet dan nama Anda.");
    });
}

function initializeApp() {
    // Sembunyikan login dan tampilkan aplikasi
    loginModal.classList.add('hidden');
    appHeader.classList.remove('app-hidden');
    appMain.classList.remove('app-hidden');
    currentUserDisplay.textContent = currentUsername;

    // Jalankan fungsi-fungsi penting
    checkAndResetSeason();
    checkAndResetMissions();
    render();
}

// =================================================================
// BAGIAN 5: FUNGSI PENYIMPANAN DATA (FIREBASE)
// =================================================================
async function saveData() {
    // Pastikan pengguna sudah login sebelum menyimpan
    if (!userRef) {
        console.error("Tidak bisa menyimpan: pengguna belum login.");
        return;
    }
    try {
        const booksAsObject = books.reduce((obj, book) => {
            if (book && book.id) obj[book.id] = book;
            return obj;
        }, {});

        await userRef.set({
            books: booksAsObject,
            userStats: userStats,
            missions: missions,
            achievements: achievements
        });
    } catch (error) {
        console.error('Gagal menyimpan data ke Firebase:', error);
    }
}

// =================================================================
// BAGIAN 6: EVENT LISTENERS
// =================================================================
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

// Sisa kode dari sini ke bawah sebagian besar tetap sama,
// jadi Anda bisa menyalin dan menempel seluruh blok ini
// untuk menggantikan bagian yang relevan di file Anda.

// =================================================================
// SISA KODE (Fungsi Render, Aksi, Utilitas, dll)
// Anda dapat menyalin bagian ini dari jawaban sebelumnya
// atau gunakan yang di bawah ini karena tidak ada perubahan signifikan.
// =================================================================
// =================================================================
// BAGIAN 7: HANDLER UNTUK AKSI DINAMIS & RENDER UI
// =================================================================

function handleDynamicClicks(e) {
    if (e.target.matches('.claim-mission-btn')) {
        const missionId = e.target.dataset.missionId;
        const type = e.target.dataset.type; // 'daily' atau 'weekly'
        handleClaimMission(missionId, type);
    }
    if (e.target.matches('.buy-item-btn')) {
        const itemId = e.target.dataset.itemId;
        handleBuyItem(itemId);
    }
}

function render() {
    renderStatsHeader();
    renderBookList();
    renderMissions();
    renderAchievements();
    renderShop();
    renderProfile();
}

function renderStatsHeader() {
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
    bookList.innerHTML = '';
    if (books.length === 0) {
        bookList.innerHTML = `<div class="empty-state"><h3>📚 No books yet!</h3><p>Add your first book to start tracking.</p></div>`;
        return;
    }
    books.forEach(book => {
        bookList.appendChild(createBookCard(book));
    });
}

function renderMissions() {
    missionsContent.innerHTML = `
        <div class="mission-category">
            <h3>Daily Missions</h3>
            <div class="mission-list">${missions.daily.list.map(mission => createMissionCard(mission, 'daily')).join('')}</div>
        </div>
        <div class="mission-category">
            <h3>Weekly Missions</h3>
            <div class="mission-list">${missions.weekly.list.map(mission => createMissionCard(mission, 'weekly')).join('')}</div>
        </div>
    `;
}

function createMissionCard(mission, type) {
    const progress = Math.min((mission.progress / mission.target) * 100, 100);
    const isComplete = progress >= 100;
    return `
        <div class="mission-card ${isComplete ? 'complete' : ''} ${mission.claimed ? 'claimed' : ''}">
            <div class="mission-info">
                <p>${mission.text}</p>
                <span class="mission-reward">🎁 ${mission.reward} Points</span>
            </div>
            <div class="mission-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <span>${mission.progress > mission.target ? mission.target : mission.progress} / ${mission.target}</span>
            </div>
            <button class="btn btn-small claim-mission-btn" 
                data-mission-id="${mission.id}" 
                data-type="${type}" 
                ${!isComplete || mission.claimed ? 'disabled' : ''}>
                ${mission.claimed ? 'Claimed' : 'Claim'}
            </button>
        </div>
    `;
}


function renderAchievements() {
    achievementsContent.innerHTML = Object.keys(ALL_ACHIEVEMENTS).map(key => {
        const achievement = ALL_ACHIEVEMENTS[key];
        const isUnlocked = achievements[key] && achievements[key].unlocked;
        return `
            <div class="achievement-card ${isUnlocked ? 'unlocked' : ''}">
                <div class="achievement-icon">${isUnlocked ? '🏆' : '🔒'}</div>
                <div class="achievement-details">
                    <h4>${achievement.name}</h4>
                    <p>${achievement.description}</p>
                </div>
            </div>
        `;
    }).join('');
}

function renderShop() {
    shopContent.innerHTML = SHOP_ITEMS.map(item => `
        <div class="shop-item-card">
            <h4>${item.name}</h4>
            <p>${item.description}</p>
            <div class="shop-item-footer">
                <span class="item-cost">🪙 ${item.cost}</span>
                <button class="btn btn-small btn-primary buy-item-btn" data-item-id="${item.id}" ${userStats.coins < item.cost ? 'disabled' : ''}>
                    Buy
                </button>
            </div>
        </div>
    `).join('');
}

function renderProfile() {
    const totalTimeFormatted = formatReadingTime(books.reduce((sum, book) => sum + book.totalReadTime, 0));
    profileContent.innerHTML = `
        <div class="profile-grid">
            <div class="profile-stat-card">
                <h4>Level</h4>
                <p>${userStats.level} - ${LEVEL_NAMES[userStats.level - 1]}</p>
            </div>
            <div class="profile-stat-card">
                <h4>Total Points (Season)</h4>
                <p>${userStats.totalPoints}</p>
            </div>
            <div class="profile-stat-card">
                <h4>Total Reading Time</h4>
                <p>${totalTimeFormatted}</p>
            </div>
            <div class="profile-stat-card">
                <h4>Books Completed</h4>
                <p>${books.filter(b => b.isCompleted).length}</p>
            </div>
             <div class="profile-stat-card">
                <h4>Current Coins</h4>
                <p>🪙 ${userStats.coins}</p>
            </div>
             <div class="profile-stat-card">
                <h4>Season Ends In</h4>
                <p id="season-countdown-profile">Calculating...</p>
            </div>
        </div>
    `;
    updateSeasonCountdown(); 
}

// =================================================================
// BAGIAN 8: HANDLER UNTUK AKSI PENGGUNA
// =================================================================

function handleAddBook(e) {
      e.preventDefault();
      const title = document.getElementById('book-title').value.trim();
      const totalPages = parseInt(document.getElementById('total-pages').value);
      if (!title || !totalPages || totalPages <= 0) {
          alert('Please enter a valid book title and page count.');
          return;
      }
      const newBook = { id: Date.now(), title, totalPages, currentPage: 0, totalReadTime: 0, isCompleted: false };
      books.push(newBook);
      saveData();
      render();
      e.target.reset();
}

function handleBookListClick(e) {
    const bookId = parseInt(e.target.closest('.book-card')?.dataset.bookId);
    if (!bookId) return;
    if (e.target.matches('.delete-btn')) {
        handleDeleteBook(bookId);
    } else if (e.target.matches('.start-reading-btn')) {
        handleStartReading(bookId);
    }
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
    currentSession = { bookId, startTime: Date.now(), elapsedTime: 0, isRunning: true, intervalId: null, sessionPoints: 0 };
    modalBookTitle.textContent = book.title;
    timerText.textContent = '00:00:00';
    pauseResumeBtn.textContent = 'Pause';
    pageInputSection.classList.add('hidden');
    timerModal.classList.remove('hidden');
    startTimer();
}

// INI ADALAH FUNGSI YANG DIPERBAIKI
function handleSaveProgress() {
    const newCurrentPage = parseInt(currentPageInput.value);
    const book = books.find(b => b.id === currentSession.bookId);
    if (!book || isNaN(newCurrentPage) || newCurrentPage < 0 || newCurrentPage > book.totalPages) {
        alert(`Please enter a valid page number between 0 and ${book.totalPages}.`);
        return;
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

// =================================================================
// BAGIAN 9: LOGIKA BARU (MISI, PENCAPAIAN, TOKO)
// =================================================================

function updateMissionProgress(type, amount) {
    const missionLists = [missions.daily.list, missions.weekly.list];
    missionLists.forEach(list => {
        list.forEach(mission => {
            if (mission.type === type && !mission.claimed) {
                mission.progress += amount;
            }
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
        if (userStats.level > oldLevel) {
            showLevelUpNotification(`Level Up! You're now ${LEVEL_NAMES[userStats.level - 1]}!`);
        }

        saveData();
        render();
    }
}

function checkAllAchievements() {
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
    if (!item || userStats.coins < item.cost) {
        alert("Not enough coins!");
        return;
    }

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

// =================================================================
// BAGIAN 10: FUNGSI UTILITAS (Timer, Format, dll.)
// =================================================================

function createBookCard(book) {
      const card = document.createElement('div');
      card.className = 'book-card';
      card.dataset.bookId = book.id;
      const progressPercentage = book.totalPages > 0 ? (book.currentPage / book.totalPages) * 100 : 0;
      const readingTimeFormatted = formatReadingTime(book.totalReadTime);
      card.innerHTML = `
          <h3>${escapeHtml(book.title)}</h3>
          <div class="reading-time">Total reading time: ${readingTimeFormatted}</div>
          <div class="book-progress">
              <div class="progress-text">
                  <span>Progress: ${book.currentPage} / ${book.totalPages} pages</span>
                  <span>${Math.round(progressPercentage)}%</span>
              </div>
              <div class="progress-bar">
                  <div class="progress-fill" style="width: ${progressPercentage}%"></div>
              </div>
          </div>
          <div class="book-actions">
              <button class="btn btn-success btn-small start-reading-btn" data-book-id="${book.id}">📖 Start Reading</button>
              <button class="btn btn-danger btn-small delete-btn" data-book-id="${book.id}">🗑️ Delete</button>
          </div>`;
      return card;
}

function startTimer() {
    currentSession.intervalId = setInterval(updateTimer, 1000);
    updateTimer();
}

function pauseTimer() {
    if (currentSession.intervalId) {
        clearInterval(currentSession.intervalId);
    }
    currentSession.isRunning = false;
}

function resumeTimer() {
    currentSession.startTime = Date.now() - currentSession.elapsedTime;
    currentSession.isRunning = true;
    startTimer();
}

function stopTimer() {
    if (currentSession.intervalId) {
        clearInterval(currentSession.intervalId);
    }
    currentSession.isRunning = false;
}

function updateTimer() {
    if (currentSession.isRunning) {
        currentSession.elapsedTime = Date.now() - currentSession.startTime;
    }
    timerText.textContent = formatTime(Math.floor(currentSession.elapsedTime / 1000));
}

function handlePauseResume() {
    if (currentSession.isRunning) {
        pauseTimer();
        pauseResumeBtn.textContent = 'Resume';
    } else {
        resumeTimer();
        pauseResumeBtn.textContent = 'Pause';
    }
}

function handleStopSession() {
    stopTimer();
    pageInputSection.classList.remove('hidden');
    const book = books.find(b => b.id === currentSession.bookId);
    if (book) {
        currentPageInput.value = book.currentPage;
        currentPageInput.max = book.totalPages;
        currentPageInput.focus();
    }
}

function closeTimerModal() {
    stopTimer();
    timerModal.classList.add('hidden');
    currentSession = { bookId: null, startTime: null, elapsedTime: 0, isRunning: false, intervalId: null, sessionPoints: 0 };
}

function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function formatReadingTime(totalSeconds) {
    if (totalSeconds === 0) return '0m';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
}

function showLevelUpNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'level-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =================================================================
// BAGIAN 11: KALKULASI LEVEL DAN MUSIM
// =================================================================

function calculateLevelFromPoints(totalPoints) {
    let level = 1;
    let pointsUsed = 0;
    for (let i = 0; i < POINTS_PER_LEVEL.length; i++) {
        if (totalPoints >= pointsUsed + POINTS_PER_LEVEL[i]) {
            pointsUsed += POINTS_PER_LEVEL[i];
            level++;
        } else { break; }
    }
    return Math.min(level, 50);
}
  
function getLevelInfo(totalPoints) {
    const level = calculateLevelFromPoints(totalPoints);
    let pointsUsedForCurrentLevel = 0;
    for (let i = 0; i < level - 1; i++) {
        pointsUsedForCurrentLevel += POINTS_PER_LEVEL[i] || 0;
    }
    const pointsForNextLevel = level < 50 ? (POINTS_PER_LEVEL[level - 1] || 0) : 0;
    return { currentLevelStartPoints: pointsUsedForCurrentLevel, pointsForNextLevel: pointsForNextLevel };
}

function checkAndResetSeason() {
      const now = new Date();
      const seasonStartDate = new Date(userStats.seasonStartDate);
      const monthDiff = (now.getFullYear() - seasonStartDate.getFullYear()) * 12 + (now.getMonth() - seasonStartDate.getMonth());
      if (monthDiff >= 3) {
          const coinsEarned = userStats.level * 10; 
          userStats.coins += coinsEarned;
          showLevelUpNotification(`A new season has begun! You earned ${coinsEarned} coins for reaching level ${userStats.level}. Your progress has been reset.`);
          
          userStats.totalPoints = 0;
          userStats.level = 1;
          userStats.seasonStartDate = now.toISOString();
          saveData();
      }
}

function updateSeasonCountdown() {
      if (!userStats || !userStats.seasonStartDate) return;
      const seasonStartDate = new Date(userStats.seasonStartDate);
      const seasonEndDate = new Date(seasonStartDate);
      seasonEndDate.setMonth(seasonEndDate.getMonth() + 3);
      const now = new Date();
      const remainingTime = seasonEndDate - now;
      let countdownText = "New Season!";
      if (remainingTime > 0) {
          const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
          const hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          countdownText = `${days}d ${hours}h`;
      }
      
      const countdownElementProfile = document.getElementById('season-countdown-profile');
      if(countdownElementProfile) countdownElementProfile.textContent = countdownText;
}

function checkAndResetMissions() {
    const now = new Date().getTime();
    
    if (!missions.daily) missions.daily = { lastReset: new Date().toISOString(), list: [] };
    if (!missions.weekly) missions.weekly = { lastReset: new Date().toISOString(), list: [] };

    const lastDailyReset = new Date(missions.daily.lastReset).getTime();
    const lastWeeklyReset = new Date(missions.weekly.lastReset).getTime();
    
    if ((now - lastDailyReset > 24 * 60 * 60 * 1000) || !missions.daily.list.length) {
        missions.daily.list = ALL_MISSIONS.daily.map(m => ({ ...m, progress: 0, claimed: false }));
        missions.daily.lastReset = new Date().toISOString();
    }
    
    if ((now - lastWeeklyReset > 7 * 24 * 60 * 60 * 1000) || !missions.weekly.list.length) {
        missions.weekly.list = ALL_MISSIONS.weekly.map(m => ({ ...m, progress: 0, claimed: false }));
        missions.weekly.lastReset = new Date().toISOString();
    }
}
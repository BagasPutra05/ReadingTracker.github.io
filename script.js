document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const welcomeScreen = document.getElementById('welcome-screen');
    const appContainer = document.getElementById('app-container');
    const startButton = document.getElementById('start-button');
    const usernameInput = document.getElementById('username-input');
    const addBookButton = document.getElementById('add-book-button');
    const bookTitleInput = document.getElementById('book-title-input');
    const bookPagesInput = document.getElementById('book-pages-input');
    const bookshelf = document.getElementById('bookshelf');
    const resetSeasonButton = document.getElementById('reset-season-button');
    const deleteUserButton = document.getElementById('delete-user-button'); // BARU


    // DOM Elements for Mission
    const dailyMissionsList = document.getElementById('daily-missions-list');
    const weeklyMissionsList = document.getElementById('weekly-missions-list');
    const dailyTimerEl = document.getElementById('daily-timer');
    const weeklyTimerEl = document.getElementById('weekly-timer');

    // User Profile UI
    const displayName = document.getElementById('display-name');
    const levelNameEl = document.getElementById('level-name');
    const currentLevelEl = document.getElementById('current-level');
    const currentXpEl = document.getElementById('current-xp');
    const iconNameEl = document.getElementById('icon-name');
    const xpToNextLevelEl = document.getElementById('xp-to-next-level');
    const xpProgress = document.getElementById('xp-progress');
    const seasonPointsEl = document.getElementById('season-points');

    // Leveling System Configuration
    const LEVELS = [
        { name: "Seed Reader", xpToNext: 250, point: 50, icon: "🌱"},
        { name: "Page Wanderer", xpToNext: 500, point: 100, icon: "🧭"},
        { name: "Story Scout", xpToNext: 750, point: 200, icon: "🏮"},
        { name: "Knowledge Keeper", xpToNext: 1000, point: 300, icon: "🎓"},
        { name: "Book Voyager", xpToNext: 1500, point: 500, icon: "🛳️"},
        { name: "Word Artisan", xpToNext:  2000, point: 700, icon: "🖋️"},
        { name: "Deep Thinker", xpToNext: 2500, point: 1000, icon: "🧠"},
        { name: "Tome Scholar", xpToNext: 3500, point: 2000, icon: "📚"},
        { name: "Literary Luminary", xpToNext: 5000, point: 5000, icon: "👑"},
        { name: "Grand Bibliophile", xpToNext: Infinity, point: 7000, icon: "🏰"}
    ];

    // Mission System Configuration
    const ALL_MISSIONS = {
        daily: [
            { id: 'read_15_min', text: "Baca buku selama 15 menit", goal: 900, reward: 50 }, // 900 detik
            { id: 'read_10_pages', text: "Baca 10 halaman", goal: 10, reward: 75 },
            { id: 'add_new_book', text: "Tambahkan 1 buku baru", goal: 1, reward: 100 }
        ],
        weekly: [
            { id: 'read_120_min', text: "Baca total selama 2 jam", goal: 7200, reward: 300 }, // 7200 detik
            { id: 'read_100_pages', text: "Baca total 100 halaman", goal: 100, reward: 400 },
            { id: 'finish_a_book', text: "Selesaikan membaca 1 buku", goal: 1, reward: 500 } // Note: This one needs special logic
        ]
    };

    let user = {
        name: '',
        level: 0,
        xp: 0,
        seasonPoints: 0,
        seasonStartDate: null,
        missions: {
            daily: [],
            weekly: []
        },
        lastDailyReset: null,
        lastWeeklyReset: null,
        stats: { // To track progress towards goals
            dailyTimeRead: 0,
            dailyPagesRead: 0,
            dailyBooksAdded: 0,
            weeklyTimeRead: 0,
            weeklyPagesRead: 0,
            weeklyBooksFinished: 0
        }
    };

    let books = [];
    let readingInterval = null;
    let xpInterval = null;

    // --- MAIN FUNCTIONS ---

    function init() {
        const savedUser = JSON.parse(localStorage.getItem('readingTrackerUser'));
        const savedBooks = JSON.parse(localStorage.getItem('readingTrackerBooks'));

        // Logika ini secara otomatis menangani login persisten
        if (savedUser && savedUser.name) {
            user = { ...user, ...savedUser, stats: {...user.stats, ...savedUser.stats }, missions: {...user.missions, ...savedUser.missions} };
            books = savedBooks || [];

            checkAndHandleSeasonReset();
            checkAndResetMissions();

            showApp();
            renderBooks();
            updateProfileUI();
        } else {
            // Jika tidak ada user, tampilkan welcome screen
            welcomeScreen.classList.add('active');
            appContainer.classList.add('hidden');
        }
    }

    // BARU: Fungsi untuk menghapus semua data user
    function deleteUser() {
        const confirmation = confirm("APAKAH ANDA YAKIN? Semua data Anda, termasuk nama, level, XP, poin, dan daftar buku akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.");
        if (confirmation) {
            // Hapus data dari localStorage
            localStorage.removeItem('readingTrackerUser');
            localStorage.removeItem('readingTrackerBooks');

            // Muat ulang halaman untuk kembali ke welcome screen
            alert("Data berhasil dihapus. Anda akan kembali ke halaman awal.");
            location.reload();
        }
    }

    function checkAndHandleSeasonReset() {
        if (!user.seasonStartDate) {
            user.seasonStartDate = Date.now();
            saveData();
            return;
        }

        const threeMonthsInMillis = 3 * 30 * 24 * 60 * 60 * 1000;
        const seasonEndDate = user.seasonStartDate + threeMonthsInMillis;

        if (Date.now() > seasonEndDate) {
            alert("Musim telah berakhir! Saatnya reset.");
            performSeasonReset();
        }
    }

    function performSeasonReset() {
        const rankInfo = LEVELS[user.level];
        const pointsEarned = rankInfo.point;

        // FIX: Pastikan user.seasonPoints adalah angka sebelum melakukan penambahan
        user.seasonPoints = (user.seasonPoints || 0) + pointsEarned;

        alert(`Selamat! Anda menyelesaikan musim sebagai ${rankInfo.name} (Level ${user.level + 1}) dan mendapatkan ${pointsEarned} Poin Musim.`);

        user.level = 0;
        user.xp = 0;
        user.seasonStartDate = Date.now();

        books.forEach(book => {
            book.timeRead = 0;
            book.pagesRead = 0;
            book.pageBonusAwarded = false;
        });

        saveData();
        updateProfileUI();
        renderBooks();
    }

    function showApp() {
        displayName.textContent = `Selamat Datang ${user.name}`;
        welcomeScreen.classList.remove('active');
        appContainer.classList.remove('hidden');
    }

    function updateProfileUI() {
        const currentLevelInfo = LEVELS[user.level];
        iconNameEl.textContent = iconNameEl.icon;
        levelNameEl.textContent = currentLevelInfo.name;
        currentLevelEl.textContent = user.level + 1;
        currentXpEl.textContent = user.xp;
        xpToNextLevelEl.textContent = currentLevelInfo.xpToNext === Infinity ? 'MAX' : currentLevelInfo.xpToNext;

        const progressPercentage = currentLevelInfo.xpToNext === Infinity ? 100 : (user.xp / currentLevelInfo.xpToNext) * 100;
        xpProgress.style.width = `${progressPercentage}%`;

        seasonPointsEl.textContent = user.seasonPoints;
    }

    function addXp(amount) {
        if (user.level >= LEVELS.length - 1) return;

        user.xp += amount;
        console.log(`+${amount} XP! Total XP: ${user.xp}`);

        while (user.xp >= LEVELS[user.level].xpToNext) {
            if (user.level >= LEVELS.length - 1) break;
            user.xp -= LEVELS[user.level].xpToNext;
            user.level++;
            alert(`🎉 SELAMAT! Anda naik ke Level ${user.level + 1}: ${LEVELS[user.level].name}!`);
        }
        updateProfileUI();
        saveData();
    }

    function renderBooks() {
        bookshelf.innerHTML = '';
        books.forEach((book, index) => {
            const bookEl = document.createElement('div');
            bookEl.classList.add('book-item');
            if (book.isFinished) {
                bookEl.classList.add('finished')
            }
            bookEl.dataset.index = index;

            const finishedMark = book.isFinished ? '✓' : '';
            const disabledState = book.isFinished ? 'disabled' : '';

            const totalPagesDisplay = book.totalPages ? `/ ${book.totalPages}` : '';

            bookEl.innerHTML = `
            <h3>${book.title} ${finishedMark}</h3>
            <div class="reading-stats">
                <span class="timer">Waktu: ${formatTime(book.timeRead)}</span>
                <span class="pages">Halaman: ${book.pagesRead} / ${book.totalPages}</span>
            </div>
            <div class="reading-controls">
                <button class="start-reading-btn" ${disabledState}>Mulai Membaca</button>
                <button class="stop-reading-btn" disabled>Berhenti</button>
                <button class="add-page-btn" ${disabledState}>+1 Halaman</button>
                <button class="delete-book-btn">Hapus</button> 
            </div>
        `;
            bookshelf.appendChild(bookEl);
        });
    }

    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function saveData() {
        localStorage.setItem('readingTrackerUser', JSON.stringify(user));
        localStorage.setItem('readingTrackerBooks', JSON.stringify(books));
    }

    // --- MISSION FUNCTIONS ---

    function checkAndResetMissions() {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfWeek = new Date(startOfToday - (now.getDay() * 24 * 60 * 60 * 1000)).getTime();

        if (!user.lastDailyReset || user.lastDailyReset < startOfToday) {
            console.log("Resetting daily missions...");
            user.lastDailyReset = startOfToday;
            user.stats.dailyTimeRead = 0;
            user.stats.dailyPagesRead = 0;
            user.stats.dailyBooksAdded = 0;
            user.missions.daily = selectRandomMissions('daily', 2); // Get 2 random daily missions
            alert("Misi harian baru telah tersedia!");
        }

        if (!user.lastWeeklyReset || user.lastWeeklyReset < startOfWeek) {
            console.log("Resetting weekly missions...");
            user.lastWeeklyReset = startOfWeek;
            user.stats.weeklyTimeRead = 0;
            user.stats.weeklyPagesRead = 0;
            user.stats.weeklyBooksFinished = 0;
            user.missions.weekly = selectRandomMissions('weekly', 2); // Get 2 random weekly missions
            alert("Misi mingguan baru telah tersedia!");
        }
        renderMissions();
        startMissionTimers();
        saveData();
    }

    function selectRandomMissions(type, count) {
        const missionsSource = ALL_MISSIONS[type].slice(0); // Create a copy
        const selectedMissions = [];
        for (let i = 0; i < count && missionsSource.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * missionsSource.length);
            const mission = missionsSource.splice(randomIndex, 1)[0];
            selectedMissions.push({
                id: mission.id,
                text: mission.text,
                goal: mission.goal,
                reward: mission.reward,
                progress: 0,
                completed: false
            });
        }
        return selectedMissions;
    }

    function renderMissions() {
        dailyMissionsList.innerHTML = '';
        user.missions.daily.forEach(mission => {
            dailyMissionsList.innerHTML += createMissionHTML(mission);
        });

        weeklyMissionsList.innerHTML = '';
        user.missions.weekly.forEach(mission => {
            weeklyMissionsList.innerHTML += createMissionHTML(mission);
        });
    }

    function createMissionHTML(mission) {
        const progress = Math.min(mission.progress, mission.goal);
        return `
        <li class="mission-item ${mission.completed ? 'completed' : ''}" data-id="${mission.id}">
            <span>${mission.text} (${progress} / ${mission.goal})</span>
            <span class="reward">+${mission.reward} XP</span>
        </li>
    `;
    }

    function updateMissionProgress(action, value) {
        const missionsToCheck = [...user.missions.daily, ...user.missions.weekly];

        missionsToCheck.forEach(mission => {
            if (mission.completed) return;

            let missionNeedsUpdate = false;

            if (action === 'read_time' && (mission.id === 'read_15_min' || mission.id === 'read_120_min')) {
                mission.progress += value;
                missionNeedsUpdate = true;
            } else if (action === 'read_pages' && (mission.id === 'read_10_pages' || mission.id === 'read_100_pages')) {
                mission.progress += value;
                missionNeedsUpdate = true;
            } else if (action === 'add_book' && mission.id === 'add_new_book') {
                mission.progress += value;
                missionNeedsUpdate = true;
            } else if (action === 'finish_book' && mission.id === 'finish_a_book') {
                mission.progress += value;
                missionNeedsUpdate = true;
            }

            if (missionNeedsUpdate && mission.progress >= mission.goal) {
                mission.completed = true;
                addXp(mission.reward);
                alert(`Misi Selesai: "${mission.text}"! Anda mendapatkan +${mission.reward} XP.`);
            }
        });

        renderMissions();
        saveData();
    }

    function startMissionTimers() {
        setInterval(() => {
            const now = new Date();
            const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
            const dailyRemaining = endOfToday - now;
            dailyTimerEl.textContent = `(Reset dalam: ${formatTime(Math.floor(dailyRemaining / 1000))})`;

            const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - now.getDay()), 0, 0, 0);
            const weeklyRemaining = endOfWeek - now;
            weeklyTimerEl.textContent = `(Reset dalam: ${Math.floor(weeklyRemaining / (1000 * 60 * 60 * 24))} hari ${new Date(weeklyRemaining).getUTCHours()} jam)`;
        }, 1000);
    }



    // --- EVENT LISTENERS ---

    startButton.addEventListener('click', () => {
        const name = usernameInput.value.trim();
        if (name) {
            user.name = name;
            if (!user.seasonStartDate) {
                user.seasonStartDate = Date.now();
            }
            showApp();
            updateProfileUI();
            saveData();
        } else {
            alert('Tolong masukkan nama Anda.');
        }
    });

    resetSeasonButton.addEventListener('click', () => {
        const confirmation = confirm("Apakah Anda yakin ingin mereset musim sekarang? Level dan XP Anda akan di-reset, dan Anda akan mendapatkan poin berdasarkan rank saat ini.");
        if(confirmation) {
            performSeasonReset();
        }
    });

    // BARU: Event listener untuk tombol hapus user
    deleteUserButton.addEventListener('click', deleteUser);

    addBookButton.addEventListener('click', () => {
        const title = bookTitleInput.value.trim();
        const totalPages = parseInt(bookPagesInput.value, 10);
        if (title && totalPages > 0) {
            books.push({
                title: title,
                timeRead: 0,
                pagesRead: 0,
                totalPages: totalPages,
                pageBonusAwarded: false,
                isFinished: false,
            });
            bookTitleInput.value = '';
            bookPagesInput.value = '';

            alert("Buku berhasil ditambahkan! Anda mendapatkan bonus +100 XP.");
            addXp(100);
            updateMissionProgress('add_book', 1);

            renderBooks();
            saveData();
        } else {
            alert("Mohon masukkan judul dan jumlah halaman yang valid");
        }
    });

    bookshelf.addEventListener('click', (e) => {
        const bookEl = e.target.closest('.book-item');
        if (!bookEl) return;

        const bookIndex = parseInt(bookEl.dataset.index);
        const book = books[bookIndex];

        if (e.target.classList.contains('start-reading-btn')) {
            if (readingInterval) {
                alert("Anda sudah sedang membaca buku lain!");
                return;
            }

            bookEl.classList.add('reading');
            document.querySelectorAll('.start-reading-btn').forEach(btn => btn.disabled = true);
            e.target.nextElementSibling.disabled = false;
            e.target.nextElementSibling.nextElementSibling.disabled = false;

            readingInterval = setInterval(() => {
                book.timeRead++;
                bookEl.querySelector('.timer').textContent = `Waktu: ${formatTime(book.timeRead)}`;
                updateMissionProgress('read_time', 1);
                saveData();
            }, 1000);

            xpInterval = setInterval(() => {
                addXp(1);
            }, 10000);
        }
        if (e.target.classList.contains('delete-book-btn')) {
            const confirmation = confirm(`Apakah Anda yakin ingin menghapus buku "${book.title}" dari rak Anda?`);
            if (confirmation) {
                // Hentikan interval jika buku yang dihapus sedang dibaca
                if (bookEl.classList.contains('reading')) {
                    clearInterval(readingInterval);
                    clearInterval(xpInterval);
                    readingInterval = null;
                    xpInterval = null;
                }

                // Hapus buku dari array
                books.splice(bookIndex, 1);

                // Simpan data dan render ulang rak buku
                saveData();
                renderBooks();

                alert(`Buku "${book.title}" telah dihapus.`);
            }
        }

        if (e.target.classList.contains('stop-reading-btn')) {
            clearInterval(readingInterval);
            clearInterval(xpInterval);
            readingInterval = null;
            xpInterval = null;

            bookEl.classList.remove('reading');
            document.querySelectorAll('.start-reading-btn').forEach(btn => btn.disabled = false);
            e.target.disabled = true;
            e.target.nextElementSibling.disabled = true;
        }

        if (e.target.classList.contains('add-page-btn')) {
            if (book.isFinished) return;

            book.pagesRead++;
            addXp(1);
            updateMissionProgress('read_pages', 1);

            const totalPagesDisplay = book.totalPages? `/ ${book.totalPages}` : '';
            bookEl.querySelector('.pages').textContent = `Halaman: ${book.pagesRead} ${totalPagesDisplay}`;


            if (book.pagesRead > 300 && !book.pageBonusAwarded) {
                book.pageBonusAwarded = true;
                alert(`Luar biasa! Anda telah membaca lebih dari 300 halaman di buku ini! Bonus +300 XP.`);
                addXp(300);
            }

            if (book.totalPages && book.pagesRead >= book.totalPages) {
                book.isFinished = true;
                book.pagesRead = book.totalPages;

                alert(`🎉 Selamat! Anda telah menyelesaikan buku ${book.title}`)
                updateMissionProgress('finish_book', 1);

                // Jika buku sedang dibaca saat selesai, hentikan timernya.
                if (bookEl.classList.contains('reading')) {
                    clearInterval(readingInterval);
                    clearInterval(xpInterval);
                    readingInterval = null;
                    xpInterval = null;
                }

                // Panggil renderBooks HANYA saat buku selesai untuk mengunci UI
                renderBooks()
            }
            saveData();
        }
    });

    // --- INITIALIZE APP ---
    init();
});
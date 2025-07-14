document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const welcomeScreen = document.getElementById('welcome-screen');
    const appContainer = document.getElementById('app-container');
    const startButton = document.getElementById('start-button');
    const usernameInput = document.getElementById('username-input');
    const addBookButton = document.getElementById('add-book-button');
    const bookTitleInput = document.getElementById('book-title-input');
    const bookshelf = document.getElementById('bookshelf');
    const resetSeasonButton = document.getElementById('reset-season-button');
    const deleteUserButton = document.getElementById('delete-user-button'); // BARU

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

    let user = {
        name: '',
        level: 0,
        xp: 0,
        seasonPoints: 0,
        seasonStartDate: null
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
            user = { ...user, ...savedUser };
            books = savedBooks || [];

            checkAndHandleSeasonReset();

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
        const pointsEarned = rankInfo.points;
        user.seasonPoints += pointsEarned;

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
            bookEl.dataset.index = index;

            bookEl.innerHTML = `
                <h3>${book.title}</h3>
                <div class="reading-stats">
                    <span class="timer">Waktu: ${formatTime(book.timeRead)}</span>
                    <span class="pages">Halaman: ${book.pagesRead}</span>
                </div>
                <div class="reading-controls">
                    <button class="start-reading-btn">Mulai Membaca</button>
                    <button class="stop-reading-btn" disabled>Berhenti</button>
                    <button class="add-page-btn" disabled>+1 Halaman</button>
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
        if (title) {
            books.push({
                title: title,
                timeRead: 0,
                pagesRead: 0,
                pageBonusAwarded: false
            });
            bookTitleInput.value = '';

            alert("Buku berhasil ditambahkan! Anda mendapatkan bonus +100 XP.");
            addXp(100);

            renderBooks();
            saveData();
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
                saveData();
            }, 1000);

            xpInterval = setInterval(() => {
                addXp(1);
            }, 10000);
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
            book.pagesRead++;
            bookEl.querySelector('.pages').textContent = `Halaman: ${book.pagesRead}`;
            addXp(1);

            if (book.pagesRead > 300 && !book.pageBonusAwarded) {
                book.pageBonusAwarded = true;
                alert(`Luar biasa! Anda telah membaca lebih dari 300 halaman di buku ini! Bonus +300 XP.`);
                addXp(300);
            }
        }
    });

    // --- INITIALIZE APP ---
    init();
});
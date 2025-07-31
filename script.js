// =================================================================
// BAGIAN 1: KONFIGURASI FIREBASE
// =================================================================

// !! PENTING: GANTI BAGIAN INI DENGAN KONFIGURASI DARI PROYEK FIREBASE ANDA !!
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
  
  // Inisialisasi Firebase
  const app = firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  
  // Untuk aplikasi ini, kita gunakan ID pengguna statis agar data sinkron di semua perangkat Anda.
  // Untuk aplikasi multi-user, ini harus diganti dengan ID dari Firebase Authentication.
  const userId = 'user-utama'; 
  const userRef = database.ref('users/' + userId);
  
  // =================================================================
  // BAGIAN 2: GLOBAL STATE & DOM ELEMENTS (Tidak Ada Perubahan)
  // =================================================================
  let books = [];
  let userStats = {
      totalPoints: 0,
      level: 1,
      booksCompleted: 0,
      seasonStartDate: new Date().toISOString()
  };
  let currentSession = {
      bookId: null,
      startTime: null,
      elapsedTime: 0,
      isRunning: false,
      intervalId: null,
      sessionPoints: 0
  };
  
  // DOM elements
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
  const totalTimeElement = document.getElementById('total-time');
  const booksCompletedElement = document.getElementById('books-completed');
  const seasonCountdownElement = document.getElementById('season-countdown');
  
  // =================================================================
  // BAGIAN 3: KONFIGURASI LEVEL & FUNGSI KALKULASI (Tidak Ada Perubahan)
  // =================================================================
  const LEVEL_NAMES = ["Bookworm Beginner", "Page Turner", "Story Seeker", "Chapter Chaser", "Novel Navigator", "Literary Learner", "Reading Rookie", "Book Browser", "Tale Tracker", "Word Warrior", "Prose Pioneer", "Fiction Fan", "Literature Lover", "Story Scholar", "Reading Ranger", "Book Buff", "Chapter Champion", "Novel Ninja", "Literary Legend", "Reading Royalty", "Manuscript Master", "Epic Explorer", "Saga Specialist", "Chronicle Conqueror", "Tome Titan", "Literary Luminary", "Reading Ruler", "Book Baron", "Story Sovereign", "Word Wizard", "Prose Prodigy", "Fiction Pharaoh", "Literary Lord", "Reading Regent", "Book Emperor", "Chapter Czar", "Novel Noble", "Story Sultan", "Word Warlord", "Literary Laureate", "Reading Virtuoso", "Book Maestro", "Story Savant", "Literary Genius", "Reading Oracle", "Book Prophet", "Story Sage", "Literary Saint", "Reading Deity", "Omnireader Supreme"];
  const POINTS_PER_LEVEL = [100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2200, 2400, 2600, 2800, 3000, 3200, 3400, 3600, 3800, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 10000];
  
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
  
  function recalculateUserStats() {
      const totalReadingTime = books.reduce((sum, book) => sum + book.totalReadTime, 0);
      const timePoints = Math.floor(totalReadingTime / 20);
      const completedBooks = books.filter(book => book.isCompleted).length;
      const completionPoints = completedBooks * 50;
      userStats.totalPoints = timePoints + completionPoints;
      userStats.level = calculateLevelFromPoints(userStats.totalPoints);
      userStats.booksCompleted = completedBooks;
  }
  
  function checkAndResetSeason() {
      const now = new Date();
      const seasonStartDate = new Date(userStats.seasonStartDate);
      const monthDiff = (now.getFullYear() - seasonStartDate.getFullYear()) * 12 + (now.getMonth() - seasonStartDate.getMonth());
      if (monthDiff >= 3) {
          userStats.totalPoints = 0;
          userStats.level = 1;
          userStats.seasonStartDate = now.toISOString();
          recalculateUserStats();
          saveData();
          showLevelUpNotification("A new season has begun! Your level and points have been reset. Happy reading!");
      }
  }
  
  function updateSeasonCountdown() {
      if (!userStats.seasonStartDate) return;
      const seasonStartDate = new Date(userStats.seasonStartDate);
      const seasonEndDate = new Date(seasonStartDate);
      seasonEndDate.setMonth(seasonEndDate.getMonth() + 3);
      const now = new Date();
      const remainingTime = seasonEndDate - now;
      if (remainingTime > 0) {
          const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
          const hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
          seasonCountdownElement.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
      } else {
          seasonCountdownElement.textContent = "New Season!";
      }
  }
  
  // =================================================================
  // BAGIAN 4: INISIALISASI APLIKASI (DIUBAH UNTUK FIREBASE)
  // =================================================================
  document.addEventListener('DOMContentLoaded', function() {
      // Menghubungkan ke Firebase untuk mengambil data secara real-time.
      userRef.on('value', (snapshot) => {
          const data = snapshot.val();
          if (data) {
              // Jika ada data di Firebase, kita muat ke aplikasi.
              // Firebase menyimpan array sebagai objek, jadi kita ubah kembali ke array
              books = data.books ? Object.values(data.books) : [];
              userStats = data.userStats || userStats;
          } else {
              // Jika tidak ada data (pengguna baru), simpan data awal ke Firebase
              saveData();
          }
          
          // Setelah data siap, jalankan fungsi-fungsi ini
          checkAndResetSeason();
          updateSeasonCountdown();
          render(); // <-- Render UI setelah data dimuat
      }, (error) => {
          console.error("Gagal membaca data dari Firebase:", error);
          alert("Tidak bisa terhubung ke database. Cek koneksi internet dan konfigurasi Firebase Anda.");
      });
  
      setupEventListeners();
      setInterval(updateSeasonCountdown, 1000);
  });
  
  // =================================================================
  // BAGIAN 5: FUNGSI PENYIMPANAN DATA (DIUBAH UNTUK FIREBASE)
  // =================================================================
  async function saveData() {
      try {
          // Firebase tidak suka array, jadi kita ubah array 'books' menjadi objek
          const booksAsObject = books.reduce((obj, book) => {
              obj[book.id] = book;
              return obj;
          }, {});
  
          // Kirim data ke Firebase
          await userRef.set({
              books: booksAsObject,
              userStats: userStats
          });
      } catch (error) {
          console.error('Gagal menyimpan data ke Firebase:', error);
      }
  }
  
  // FUNGSI localStorage.getItem() dan localStorage.setItem() SUDAH TIDAK DIGUNAKAN LAGI
  
  // =================================================================
  // BAGIAN 6: SEMUA FUNGSI LAINNYA (Tidak Ada Perubahan)
  // =================================================================
  function setupEventListeners() {
      addBookForm.addEventListener('submit', handleAddBook);
      bookList.addEventListener('click', handleBookListClick);
      pauseResumeBtn.addEventListener('click', handlePauseResume);
      stopSessionBtn.addEventListener('click', handleStopSession);
      saveProgressBtn.addEventListener('click', handleSaveProgress);
      closeModalBtn.addEventListener('click', closeTimerModal);
      timerModal.addEventListener('click', function(e) {
          if (e.target === timerModal || e.target.classList.contains('modal-backdrop')) {
              closeTimerModal();
          }
      });
      document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape' && !timerModal.classList.contains('hidden')) {
              closeTimerModal();
          }
      });
  }
  
  function render() {
      renderBookList();
      renderStats();
  }
  
  function renderBookList() {
      bookList.innerHTML = '';
      if (books.length === 0) {
          bookList.innerHTML = `<div class="empty-state"><h3>📚 No books yet!</h3><p>Add your first book to start tracking your reading progress.</p></div>`;
          return;
      }
      books.forEach(book => {
          const bookCard = createBookCard(book);
          bookList.appendChild(bookCard);
      });
  }
  
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
  
  function renderStats() {
      const totalTime = books.reduce((sum, book) => sum + book.totalReadTime, 0);
      const totalTimeFormatted = formatReadingTime(totalTime);
      const completedBooks = books.filter(book => book.isCompleted).length;
      const levelInfo = getLevelInfo(userStats.totalPoints);
      userLevelElement.textContent = userStats.level;
      levelNameElement.textContent = LEVEL_NAMES[userStats.level - 1] || "Ultimate Reader";
      totalTimeElement.textContent = totalTimeFormatted;
      booksCompletedElement.textContent = completedBooks;
      const currentLevelPoints = userStats.totalPoints - levelInfo.currentLevelStartPoints;
      const pointsNeededForNext = levelInfo.pointsForNextLevel;
      const progressPercentage = pointsNeededForNext > 0 ? (currentLevelPoints / pointsNeededForNext) * 100 : 100;
      levelFillElement.style.width = `${Math.min(progressPercentage, 100)}%`;
      currentPointsElement.textContent = currentLevelPoints;
      nextLevelPointsElement.textContent = pointsNeededForNext;
  }
  
  function handleAddBook(e) {
      e.preventDefault();
      const formData = new FormData(e.target);
      const title = formData.get('title').trim();
      const totalPages = parseInt(formData.get('totalPages'));
      if (!title || !totalPages || totalPages <= 0) {
          alert('Please enter a valid book title and page count.');
          return;
      }
      const newBook = { id: Date.now(), title: title, totalPages: totalPages, currentPage: 0, totalReadTime: 0, isCompleted: false };
      books.push(newBook);
      saveData(); // Ini sekarang menyimpan ke Firebase
      render();
      e.target.reset();
  }
  
  function handleBookListClick(e) {
      const target = e.target;
      const bookId = target.dataset.bookId;
      if (!bookId) return;
      if (target.classList.contains('delete-btn')) {
          handleDeleteBook(parseInt(bookId));
      } else if (target.classList.contains('start-reading-btn')) {
          handleStartReading(parseInt(bookId));
      }
  }
  
  function handleDeleteBook(bookId) {
      const book = books.find(b => b.id === bookId);
      if (!book) return;
      if (confirm(`Are you sure you want to delete "${book.title}"?`)) {
          books = books.filter(b => b.id !== bookId);
          saveData(); // Ini sekarang menyimpan ke Firebase
          render();
      }
  }
  
  function handleStartReading(bookId) {
      const book = books.find(b => b.id === bookId);
      if (!book) return;
      currentSession = { bookId: bookId, startTime: Date.now(), elapsedTime: 0, isRunning: true, intervalId: null, sessionPoints: 0 };
      modalBookTitle.textContent = book.title;
      timerText.textContent = '00:00:00';
      pauseResumeBtn.textContent = 'Pause';
      pageInputSection.classList.add('hidden');
      timerModal.classList.remove('hidden');
      startTimer();
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
  
  function handleSaveProgress() {
      const newCurrentPage = parseInt(currentPageInput.value);
      const book = books.find(b => b.id === currentSession.bookId);
      if (!book) { closeTimerModal(); return; }
      if (isNaN(newCurrentPage) || newCurrentPage < 0 || newCurrentPage > book.totalPages) {
          alert(`Please enter a valid page number between 0 and ${book.totalPages}.`);
          return;
      }
      const wasCompleted = book.isCompleted;
      const sessionTimeSeconds = Math.floor(currentSession.elapsedTime / 1000);
      book.currentPage = newCurrentPage;
      book.totalReadTime += sessionTimeSeconds;
      if (newCurrentPage >= book.totalPages && !wasCompleted) {
          book.isCompleted = true;
          userStats.booksCompleted++;
          userStats.totalPoints += 50;
          showLevelUpNotification("Book completed! +50 bonus points!");
      }
      const timePoints = Math.floor(sessionTimeSeconds / 20);
      userStats.totalPoints += timePoints;
      const oldLevel = userStats.level;
      userStats.level = calculateLevelFromPoints(userStats.totalPoints);
      if (userStats.level > oldLevel) {
          showLevelUpNotification(`Level Up! You're now ${LEVEL_NAMES[userStats.level - 1]}!`);
      }
      saveData(); // Ini sekarang menyimpan ke Firebase
      render();
      closeTimerModal();
  }
  
  function startTimer() {
      currentSession.intervalId = setInterval(updateTimer, 1000);
      updateTimer();
  }
  
  function pauseTimer() {
      if (currentSession.intervalId) { clearInterval(currentSession.intervalId); currentSession.intervalId = null; }
      currentSession.isRunning = false;
  }
  
  function resumeTimer() {
      currentSession.startTime = Date.now() - currentSession.elapsedTime;
      currentSession.isRunning = true;
      startTimer();
  }
  
  function stopTimer() {
      if (currentSession.intervalId) { clearInterval(currentSession.intervalId); currentSession.intervalId = null; }
      currentSession.isRunning = false;
  }
  
  function updateTimer() {
      if (currentSession.isRunning) {
          currentSession.elapsedTime = Date.now() - currentSession.startTime;
      }
      const seconds = Math.floor(currentSession.elapsedTime / 1000);
      timerText.textContent = formatTime(seconds);
  }
  
  function closeTimerModal() {
      stopTimer();
      timerModal.classList.add('hidden');
      currentSession = { bookId: null, startTime: null, elapsedTime: 0, isRunning: false, intervalId: null, sessionPoints: 0 };
  }
  
  function formatTime(totalSeconds) {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  function formatReadingTime(totalSeconds) {
      if (totalSeconds === 0) return '0m';
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      if (hours === 0) return `${minutes}m`;
      if (minutes === 0) return `${hours}h`;
      return `${hours}h ${minutes}m`;
  }
  
  function showLevelUpNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'level-notification';
      notification.textContent = message;
      notification.style.cssText = `position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 1rem 1.5rem; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); z-index: 10000; font-weight: 600; font-size: 1rem; max-width: 300px; animation: slideInRight 0.5s ease, fadeOut 0.5s ease 2.5s;`;
      if (!document.querySelector('#notification-styles')) {
          const style = document.createElement('style');
          style.id = 'notification-styles';
          style.textContent = `@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }`;
          document.head.appendChild(style);
      }
      document.body.appendChild(notification);
      setTimeout(() => { if (notification.parentNode) { notification.parentNode.removeChild(notification); } }, 3000);
  }
  
  function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
  }
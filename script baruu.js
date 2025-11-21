// Pelacak Kebiasaan Sehat - JavaScript Sisi Klien

// Chart instances
let waterChart = null;
let sleepChart = null;
let statsChart = null;

// Inisialisasi user
let currentUser = localStorage.getItem('currentUser') || null;

// Fungsi untuk mendapatkan storage key berdasarkan user
function getStorageKey(key) {
    if (currentUser) {
        return `${currentUser}_${key}`;
    }
    return key; // Guest mode
}

// Inisialisasi data kebiasaan dari localStorage atau array kosong
let habits = JSON.parse(localStorage.getItem(getStorageKey('habits'))) || [];

// Inisialisasi data minum air
let waterData = JSON.parse(localStorage.getItem(getStorageKey('waterData'))) || {
    daily: {},
    weekly: {}
};

// Inisialisasi data jam tidur
let sleepData = JSON.parse(localStorage.getItem(getStorageKey('sleepData'))) || {
    daily: {},
    weekly: {}
};

// Fungsi untuk menampilkan section (navigasi SPA)
function showSection(sectionId) {
    $('.section').hide();
    $('#' + sectionId).show();
    if (sectionId === 'stats') {
        renderStats();
    } else if (sectionId === 'sleep-tracker') {
        renderSleepChart();
    }
}

// Fungsi untuk menyimpan kebiasaan ke localStorage
function saveHabits() {
    localStorage.setItem(getStorageKey('habits'), JSON.stringify(habits));
}

// Fungsi untuk menyimpan data air ke localStorage
function saveWaterData() {
    localStorage.setItem(getStorageKey('waterData'), JSON.stringify(waterData));
}

// Fungsi untuk menyimpan data tidur ke localStorage
function saveSleepData() {
    localStorage.setItem(getStorageKey('sleepData'), JSON.stringify(sleepData));
}

// Fungsi untuk merender daftar kebiasaan
function renderHabits() {
    const container = $('#habits-container');
    container.empty();
    habits.forEach((habit, index) => {
        const today = new Date().toDateString();
        const isCompletedToday = habit.completedDates && habit.completedDates.includes(today);
        const habitItem = $(`
            <div class="habit-item ${isCompletedToday ? 'completed' : ''}">
                <span>${habit.name}</span>
                <button class="btn btn-complete ${isCompletedToday ? 'completed' : ''}" onclick="completeHabit(${index})">${isCompletedToday ? 'Selesai Hari Ini' : 'Tandai Selesai'}</button>
                <button class="btn btn-warning btn-sm" onclick="renameHabit(${index})">Rename</button>
                <button class="btn btn-danger btn-sm" onclick="deleteHabit(${index})">Hapus</button>
            </div>
        `);
        container.append(habitItem);
    });
}

// Fungsi untuk menambah kebiasaan baru
function addHabit(name) {
    habits.push({
        name: name,
        completedDates: []
    });
    saveHabits();
    renderHabits();
    $('#habit-name').val('');
    showSection('habit-list');
    showNotification('Kebiasaan baru berhasil ditambahkan!', 'success');
    // If adding water habit, check if already completed today
    if (name === 'Minum Air') {
        updateWaterHabitCompletion();
    }
    // If adding sleep habit, check if already completed today
    if (name === 'Jam Tidur') {
        updateSleepHabitCompletion();
    }
}

// Fungsi untuk menandai kebiasaan selesai hari ini
function completeHabit(index) {
    const today = new Date().toDateString();
    if (!habits[index].completedDates) {
        habits[index].completedDates = [];
    }
    if (!habits[index].completedDates.includes(today)) {
        habits[index].completedDates.push(today);
        showNotification('Bagus! Kebiasaan berhasil diselesaikan!', 'success');
    } else {
        showNotification('Kebiasaan ini sudah selesai hari ini.', 'info');
    }
    saveHabits();
    renderHabits();
}

// Fungsi untuk menambah gelas air
function addWaterGlass() {
    const today = new Date().toDateString();
    const weekStart = getWeekStart();

    if (!waterData.daily[today]) {
        waterData.daily[today] = 0;
    }
    waterData.daily[today]++;

    if (!waterData.weekly[weekStart]) {
        waterData.weekly[weekStart] = 0;
    }
    waterData.weekly[weekStart]++;

    saveWaterData();
    updateWaterDisplay();
    updateHealthStatus();
    renderWaterChart();
    showNotification('Gel as air berhasil ditambahkan!', 'success');
    // Update habit completion if water habit exists
    updateWaterHabitCompletion();
}

// Fungsi untuk menambah jam tidur
function addSleepHour() {
    const today = new Date().toDateString();
    const weekStart = getWeekStart();

    if (!sleepData.daily[today]) {
        sleepData.daily[today] = 0;
    }
    sleepData.daily[today]++;

    if (!sleepData.weekly[weekStart]) {
        sleepData.weekly[weekStart] = 0;
    }
    sleepData.weekly[weekStart]++;

    saveSleepData();
    updateSleepDisplay();
    updateSleepStatus();
    renderSleepChart();
    showNotification('Jam tidur berhasil ditambahkan!', 'success');
    // Update habit completion if sleep habit exists
    updateSleepHabitCompletion();
}

// Fungsi untuk menambah entry tidur berdasarkan waktu tidur dan bangun
function addSleepEntry() {
    const bedtime = $('#bedtime').val();
    const waketime = $('#waketime').val();

    if (!bedtime || !waketime) {
        showNotification('Harap isi waktu tidur dan waktu bangun!', 'warning');
        return;
    }

    const bedTime = new Date(`1970-01-01T${bedtime}:00`);
    let wakeTime = new Date(`1970-01-01T${waketime}:00`);

    // Jika waktu bangun lebih kecil dari waktu tidur, berarti bangun di hari berikutnya
    if (wakeTime < bedTime) {
        wakeTime.setDate(wakeTime.getDate() + 1);
    }

    const sleepDuration = (wakeTime - bedTime) / (1000 * 60 * 60); // dalam jam
    const sleepHours = Math.round(sleepDuration * 10) / 10; // bulatkan ke 1 desimal

    if (sleepHours < 0 || sleepHours > 24) {
        showNotification('Durasi tidur tidak valid!', 'warning');
        return;
    }

    const today = new Date().toDateString();
    const weekStart = getWeekStart();

    // Set jam tidur hari ini ke durasi yang dihitung
    sleepData.daily[today] = sleepHours;

    // Hitung ulang total mingguan
    sleepData.weekly[weekStart] = 0;
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        if (sleepData.daily[dateStr]) {
            sleepData.weekly[weekStart] += sleepData.daily[dateStr];
        }
    }

    saveSleepData();
    updateSleepDisplay();
    updateSleepStatus();
    renderSleepChart();
    showNotification(`Waktu tidur ${sleepHours} jam berhasil dicatat!`, 'success');
    // Update habit completion if sleep habit exists
    updateSleepHabitCompletion();

    // Reset form
    $('#bedtime').val('');
    $('#waketime').val('');
}

// Fungsi untuk mendapatkan tanggal awal minggu
function getWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    const weekStart = new Date(now.setDate(diff));
    return weekStart.toDateString();
}

// Fungsi untuk memperbarui tampilan air
function updateWaterDisplay() {
    const today = new Date().toDateString();
    const weekStart = getWeekStart();

    const todayCount = waterData.daily[today] || 0;
    const weekCount = waterData.weekly[weekStart] || 0;

    $('#today-water').text(todayCount);
    $('#week-water').text(weekCount);
}

// Fungsi untuk memperbarui tampilan tidur
function updateSleepDisplay() {
    const today = new Date().toDateString();
    const weekStart = getWeekStart();

    const todayHours = sleepData.daily[today] || 0;
    const weekHours = sleepData.weekly[weekStart] || 0;

    $('#today-sleep').text(todayHours);
    $('#week-sleep').text(weekHours);
}

// Fungsi untuk memperbarui status kesehatan
function updateHealthStatus() {
    const today = new Date().toDateString();
    const todayCount = waterData.daily[today] || 0;
    const weekStart = getWeekStart();
    const weekCount = waterData.weekly[weekStart] || 0;

    const dailyTarget = 8; // 8 gelas per hari
    const weeklyTarget = 56; // 8 * 7 hari

    let statusText = '';
    let alertClass = 'alert-info';
    let solutionText = '';
    let showSolution = false;

    if (todayCount === 0) {
        statusText = 'Belum minum air hari ini. Mulai dengan minum 1 gelas air!';
        alertClass = 'alert-warning';
        solutionText = 'Minumlah setidaknya 8 gelas air per hari untuk menjaga kesehatan. Mulai sekarang dengan minum 1 gelas air putih.';
        showSolution = true;
    } else if (todayCount < dailyTarget) {
        const remaining = dailyTarget - todayCount;
        statusText = `Hari ini sudah minum ${todayCount} gelas. Masih kurang ${remaining} gelas lagi untuk mencapai target harian.`;
        alertClass = 'alert-warning';
        solutionText = `Anda perlu minum ${remaining} gelas lagi hari ini. Tetap terhidrasi dengan minum air secara teratur untuk menjaga kesehatan tubuh Anda.`;
        showSolution = true;
    } else {
        if (todayCount > 10) {
            statusText = `Hati-hati! Hari ini sudah minum ${todayCount} gelas air. Terlalu banyak minum air juga dapat membahayakan tubuh.`;
            alertClass = 'alert-warning';
            solutionText = 'Minumlah air secukupnya sesuai kebutuhan tubuh (1.5-2.5 liter per hari). Terlalu banyak air dapat menyebabkan hiponatremia atau masalah kesehatan lainnya.';
            showSolution = true;
        } else {
            statusText = `Bagus! Hari ini sudah minum ${todayCount} gelas air. Target harian tercapai.`;
            alertClass = 'alert-success';
            solutionText = 'Lanjutkan kebiasaan baik ini! Minum air yang cukup membantu menjaga kesehatan tubuh, meningkatkan energi, dan mencegah dehidrasi.';
            showSolution = true;
        }
    }

    $('#status-text').text(statusText);
    $('#health-status').removeClass('alert-info alert-warning alert-success').addClass(alertClass);

    if (showSolution) {
        $('#solution-text').text(solutionText);
        $('#solution').show();
    } else {
        $('#solution').hide();
    }
}

// Fungsi untuk memperbarui status tidur
function updateSleepStatus() {
    const today = new Date().toDateString();
    const todayHours = sleepData.daily[today] || 0;
    const weekStart = getWeekStart();
    const weekHours = sleepData.weekly[weekStart] || 0;

    const dailyTarget = 8; // 8 jam per hari
    const weeklyTarget = 56; // 8 * 7 hari

    let statusText = '';
    let alertClass = 'alert-info';
    let solutionText = '';
    let showSolution = false;

    if (todayHours === 0) {
        statusText = 'Belum ada data tidur hari ini. Catat waktu tidur Anda!';
        alertClass = 'alert-warning';
        solutionText = 'Tidurlah setidaknya 7-9 jam per hari untuk kualitas tidur yang ideal. Catat waktu tidur dan bangun Anda untuk melacak pola tidur.';
        showSolution = true;
    } else if (todayHours < 7) {
        statusText = `Hari ini tidur ${todayHours} jam. Kurang dari ideal (7-9 jam).`;
        alertClass = 'alert-warning';
        solutionText = 'Kualitas tidur Anda kurang ideal. Coba tidur lebih awal atau hindari kafein sebelum tidur. Targetkan 7-9 jam tidur per malam.';
        showSolution = true;
    } else if (todayHours >= 7 && todayHours <= 9) {
        statusText = `Bagus! Hari ini tidur ${todayHours} jam. Kualitas tidur ideal tercapai.`;
        alertClass = 'alert-success';
        solutionText = 'Kualitas tidur Anda sudah ideal! Lanjutkan pola tidur yang baik untuk menjaga kesehatan dan produktivitas.';
        showSolution = true;
    } else if (todayHours > 9 && todayHours <= 12) {
        statusText = `Hari ini tidur ${todayHours} jam. Sedikit berlebihan, tapi masih dalam batas normal.`;
        alertClass = 'alert-info';
        solutionText = 'Tidur Anda cukup, tapi coba sesuaikan dengan kebutuhan tubuh. Idealnya 7-9 jam per malam.';
        showSolution = true;
    } else {
        statusText = `Hati-hati! Hari ini tidur ${todayHours} jam. Terlalu banyak tidur.`;
        alertClass = 'alert-warning';
        solutionText = 'Terlalu banyak tidur dapat menyebabkan masalah kesehatan. Coba bangun lebih awal dan aktifkan tubuh Anda.';
        showSolution = true;
    }

    $('#sleep-status-text').text(statusText);
    $('#sleep-status').removeClass('alert-info alert-warning alert-success').addClass(alertClass);

    if (showSolution) {
        $('#sleep-solution-text').text(solutionText);
        $('#sleep-solution').show();
    } else {
        $('#sleep-solution').hide();
    }
}

// Fungsi untuk merender grafik air
function renderWaterChart() {
    const ctx = $('#water-chart')[0].getContext('2d');
    const labels = [];
    const data = [];

    // Mendapatkan 7 hari terakhir
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        labels.push(date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }));

        const count = waterData.daily[dateStr] || 0;
        data.push(count);
    }

    if (waterChart) {
        waterChart.destroy();
    }

    waterChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Gelas Air per Hari',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Fungsi untuk merender grafik tidur
function renderSleepChart() {
    const ctx = $('#sleep-chart')[0].getContext('2d');
    const labels = [];
    const data = [];

    // Mendapatkan 7 hari terakhir
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        labels.push(date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }));

        const hours = sleepData.daily[dateStr] || 0;
        data.push(hours);
    }

    if (sleepChart) {
        sleepChart.destroy();
    }

    sleepChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jam Tidur per Hari',
                data: data,
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Fungsi untuk merender grafik statistik
function renderStats() {
    const ctx = $('#stats-chart')[0].getContext('2d');
    const labels = [];
    const habitsData = [];
    const waterDataArray = [];
    const sleepDataArray = [];

    // Mendapatkan 7 hari terakhir
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        labels.push(date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }));

        // Hitung kebiasaan selesai
        let completedCount = 0;
        habits.forEach(habit => {
            if (habit.completedDates && habit.completedDates.includes(dateStr)) {
                completedCount++;
            }
        });
        habitsData.push(completedCount);

        // Data minum air
        const waterCount = waterData.daily[dateStr] || 0;
        waterDataArray.push(waterCount);

        // Data jam tidur
        const sleepHours = sleepData.daily[dateStr] || 0;
        sleepDataArray.push(sleepHours);
    }

    if (statsChart) {
        statsChart.destroy();
    }

    statsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Kebiasaan Selesai',
                data: habitsData,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1
            }, {
                label: 'Minum Air (Gelas)',
                data: waterDataArray,
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                tension: 0.1
            }, {
                label: 'Jam Tidur (Jam)',
                data: sleepDataArray,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
    renderStatsTable();
}

// Fungsi untuk rename habit
function renameHabit(index) {
    const newName = prompt('Masukkan nama baru untuk kebiasaan:', habits[index].name);
    if (newName && newName.trim()) {
        habits[index].name = newName.trim();
        saveHabits();
        renderHabits();
        // Update stats in case habit name affects stats
        renderStats();
        showNotification('Kebiasaan berhasil diubah nama!', 'success');
    }
}

// Fungsi untuk delete habit
function deleteHabit(index) {
    if (confirm('Apakah Anda yakin ingin menghapus kebiasaan ini?')) {
        habits.splice(index, 1);
        saveHabits();
        renderHabits();
        showNotification('Kebiasaan berhasil dihapus!', 'success');
    }
}

// Fungsi untuk update water habit completion
function updateWaterHabitCompletion() {
    const waterHabitIndex = habits.findIndex(habit => habit.name === 'Minum Air');
    if (waterHabitIndex !== -1) {
        const today = new Date().toDateString();
        const todayCount = waterData.daily[today] || 0;
        if (todayCount >= 8 && !habits[waterHabitIndex].completedDates.includes(today)) {
            habits[waterHabitIndex].completedDates.push(today);
            saveHabits();
            renderHabits();
            // Update stats immediately when water habit is completed
            renderStats();
            showNotification('Kebiasaan Minum Air otomatis diselesaikan!', 'success');
        }
    }
}

// Fungsi untuk update sleep habit completion
function updateSleepHabitCompletion() {
    const sleepHabitIndex = habits.findIndex(habit => habit.name === 'Jam Tidur');
    if (sleepHabitIndex !== -1) {
        const today = new Date().toDateString();
        const todayHours = sleepData.daily[today] || 0;
        if (todayHours >= 7 && todayHours <= 9 && !habits[sleepHabitIndex].completedDates.includes(today)) {
            habits[sleepHabitIndex].completedDates.push(today);
            saveHabits();
            renderHabits();
            // Update stats immediately when sleep habit is completed
            renderStats();
            showNotification('Kebiasaan Jam Tidur otomatis diselesaikan!', 'success');
        }
    }
}

// Fungsi untuk render stats table
function renderStatsTable() {
    const tableContainer = $('#stats-table-container');
    tableContainer.empty();
    const table = $('<table class="table table-striped"></table>');
    const thead = $('<thead><tr><th>Tanggal</th><th>Kebiasaan Selesai</th><th>Minum Air (Gelas)</th><th>Jam Tidur (Jam)</th></tr></thead>');
    const tbody = $('<tbody></tbody>');
    table.append(thead).append(tbody);

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        const dateDisplay = date.toLocaleDateString('id-ID');

        // Hitung kebiasaan selesai
        let completedCount = 0;
        habits.forEach(habit => {
            if (habit.completedDates && habit.completedDates.includes(dateStr)) {
                completedCount++;
            }
        });

        // Data minum air
        const waterCount = waterData.daily[dateStr] || 0;

        // Data jam tidur
        const sleepHours = sleepData.daily[dateStr] || 0;

        const row = $(`<tr><td>${dateDisplay}</td><td>${completedCount}</td><td>${waterCount}</td><td>${sleepHours}</td></tr>`);
        tbody.append(row);
    }

    tableContainer.append(table);
}

// Fungsi untuk toggle view stats
function toggleStatsView() {
    const chart = $('#stats-chart');
    const table = $('#stats-table-container');
    if (chart.is(':visible')) {
        chart.hide();
        table.show();
    } else {
        chart.show();
        table.hide();
    }
}

// Fungsi untuk download CSV
function downloadStatsCSV() {
    let startDate = $('#start-date').val();
    let endDate = $('#end-date').val();
    let start, end;

    if (!startDate || !endDate) {
        // Jika tidak ada tanggal dipilih, download semua data yang ada
        let allDates = [];
        habits.forEach(habit => {
            if (habit.completedDates) {
                allDates = allDates.concat(habit.completedDates);
            }
        });
        if (allDates.length === 0) {
            showNotification('Tidak ada data untuk diunduh!', 'warning');
            return;
        }
        allDates = allDates.map(d => new Date(d));
        start = new Date(Math.min(...allDates));
        end = new Date(Math.max(...allDates));
    } else {
        start = new Date(startDate);
        end = new Date(endDate);
    }

    let csv = 'Tanggal,Kebiasaan Selesai,Minum Air (Gelas),Jam Tidur\n';

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toDateString();
        const dateDisplay = d.toLocaleDateString('id-ID');

        // Hitung kebiasaan selesai
        let completedCount = 0;
        habits.forEach(habit => {
            if (habit.completedDates && habit.completedDates.includes(dateStr)) {
                completedCount++;
            }
        });

        // Data minum air
        let waterCount = waterData.daily[dateStr] || 0;

        // Data jam tidur
        let sleepHours = sleepData.daily[dateStr] || 0;

        csv += `${dateDisplay},${completedCount},${waterCount},${sleepHours}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stats.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    showNotification('Data berhasil diunduh!', 'success');
}

// Fungsi untuk login
function loginUser() {
    const username = $('#login-username').val().trim();
    const password = $('#login-password').val();

    if (!username || !password) {
        showNotification('Nama pengguna dan password harus diisi!', 'warning');
        return;
    }

    const storedPassword = localStorage.getItem(`${username}_password`);
    if (!storedPassword) {
        showNotification('Akun tidak ditemukan! Silakan buat akun baru.', 'warning');
        return;
    }

    if (password !== storedPassword) {
        showNotification('Password salah!', 'warning');
        return;
    }

    currentUser = username;
    localStorage.setItem('currentUser', currentUser);
    // Reload data
    habits = JSON.parse(localStorage.getItem(getStorageKey('habits'))) || [];
    waterData = JSON.parse(localStorage.getItem(getStorageKey('waterData'))) || { daily: {}, weekly: {} };
    sleepData = JSON.parse(localStorage.getItem(getStorageKey('sleepData'))) || { daily: {}, weekly: {} };
    renderHabits();
    renderStats();
    updateWaterDisplay();
    updateHealthStatus();
    updateSleepDisplay();
    updateSleepStatus();
    renderWaterChart();
    $('#login-modal').modal('hide');
    $('#logout-item').show();
    $('#login-item').hide();
    showNotification(`Selamat datang, ${username}!`, 'success');
}

// Fungsi untuk guest
function guestLogin() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    habits = JSON.parse(localStorage.getItem('habits')) || [];
    waterData = JSON.parse(localStorage.getItem('waterData')) || { daily: {}, weekly: {} };
    sleepData = JSON.parse(localStorage.getItem('sleepData')) || { daily: {}, weekly: {} };
    renderHabits();
    renderStats();
    updateWaterDisplay();
    updateHealthStatus();
    updateSleepDisplay();
    updateSleepStatus();
    renderWaterChart();
    $('#login-modal').modal('hide');
    $('#logout-item').hide();
    showNotification('Masuk sebagai tamu!', 'info');
}

// Fungsi untuk create account
function createAccount() {
    const username = $('#create-username').val().trim();
    const password = $('#create-password').val();
    const confirmPassword = $('#confirm-password').val();

    if (!username || !password || !confirmPassword) {
        showNotification('Semua field harus diisi!', 'warning');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Password dan konfirmasi password tidak cocok!', 'warning');
        return;
    }

    // Check if username already exists
    const existingHabits = localStorage.getItem(`${username}_habits`);
    const existingWaterData = localStorage.getItem(`${username}_waterData`);

    if (existingHabits || existingWaterData) {
        showNotification('Nama pengguna sudah ada! Gunakan nama lain atau login dengan akun tersebut.', 'warning');
        return;
    }

    // Show confirmation dialog
    if (!confirm(`Apakah Anda yakin ingin membuat akun dengan nama pengguna "${username}"?`)) {
        return;
    }

    currentUser = username;
    localStorage.setItem('currentUser', currentUser);
    localStorage.setItem(`${username}_password`, password); // Store password (in real app, this should be hashed)
    // Initialize empty data for new user
    habits = [];
    waterData = { daily: {}, weekly: {} };
    sleepData = { daily: {}, weekly: {} };
    saveHabits();
    saveWaterData();
    saveSleepData();
    renderHabits();
    renderStats();
    updateWaterDisplay();
    updateHealthStatus();
    updateSleepDisplay();
    updateSleepStatus();
    renderWaterChart();
    $('#login-modal').modal('hide');
    $('#logout-item').show();
    showNotification(`Akun ${username} berhasil dibuat!`, 'success');
}

// Fungsi untuk logout
function logoutUser() {
    if (confirm('Apakah Anda yakin ingin logout? Data Anda akan tetap tersimpan.')) {
        currentUser = null;
        localStorage.removeItem('currentUser');
        habits = JSON.parse(localStorage.getItem('habits')) || [];
        waterData = JSON.parse(localStorage.getItem('waterData')) || { daily: {}, weekly: {} };
        sleepData = JSON.parse(localStorage.getItem('sleepData')) || { daily: {}, weekly: {} };
        renderHabits();
        renderStats();
        updateWaterDisplay();
        updateHealthStatus();
        updateSleepDisplay();
        updateSleepStatus();
        renderWaterChart();
        $('#logout-item').hide();
        $('#login-item').show();
        $('#login-modal').modal('show');
        showNotification('Berhasil logout!', 'info');
    }
}

// Fungsi untuk add water as habit
function addWaterAsHabit() {
    const exists = habits.some(habit => habit.name === 'Minum Air');
    if (!exists) {
        addHabit('Minum Air');
    } else {
        showNotification('Kebiasaan Minum Air sudah ada!', 'info');
    }
}

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type) {
    const notification = $(`
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
    $('body').prepend(notification);
    setTimeout(() => {
        notification.alert('close');
    }, 3000);
}

// Event listeners
$(document).ready(function() {
    // Show login modal if no user is logged in
    if (!currentUser) {
        $('#login-modal').modal('show');
        $('#login-item').show();
    } else {
        $('#logout-item').show();
        $('#login-item').hide();
    }

    renderHabits();
    renderStats();
    updateWaterDisplay();
    updateHealthStatus();
    renderWaterChart();

    $('#habit-form').submit(function(e) {
        e.preventDefault();
        const habitName = $('#habit-name').val().trim();
        if (habitName) {
            addHabit(habitName);
        }
    });

    // Tampilkan section tambah kebiasaan secara default
    showSection('add-habit');
});

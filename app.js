const express = require('express');
const session = require('express-session');
const path = require('path');
const mysql = require('mysql2/promise');
const app = express();
const PORT = process.env.PORT || 3000;

// ==============================================
// ✅ ONLINE DATABASE — Ilagay ang tamang password!
// ==============================================
const pool = mysql.createPool({
  host: 'sql209.byetcluster.com',
  user: 'if0_42612322',
  password: 'YOUR_REAL_PASSWORD_HERE', // ⚠️ PALITAN ITO NG TUNAY NA PASSWORD MO!
  database: 'if0_42612322_classroom_db',
  waitForConnections: true,
  connectionLimit: 10
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Session
app.use(session({
  secret: 'classroom-monitor-secret-2026',
  resave: false,
  saveUninitialized: false
}));

// Pangunahing Pahina
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Login Check
function isLoggedIn(req, res, next) {
  if (req.session.userId) return next();
  res.redirect('/login');
}

// ===== ROUTES =====
app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.render('login', { error: '❌ Mali ang username o password!' });
    }
    const user = users[0];
    if (user.password !== password) {
      return res.render('login', { error: '❌ Mali ang username o password!' });
    }
    req.session.userId = user.user_id;
    req.session.fullName = user.full_name;
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('login', { error: '❌ Hindi makakonekta sa database! Tingnan ang password at host.' });
  }
});

app.get('/dashboard', isLoggedIn, async (req, res) => {
  const [rooms] = await pool.query('SELECT * FROM classrooms ORDER BY room_name');
  res.render('dashboard', {
    fullName: req.session.fullName,
    rooms
  });
});

app.get('/update/:id', isLoggedIn, async (req, res) => {
  const [rooms] = await pool.query('SELECT * FROM classrooms WHERE room_id = ?', [req.params.id]);
  if (rooms.length === 0) return res.send('❌ Room Not Found');
  res.render('update_status', { room: rooms[0], success: null });
});

app.post('/update/:id', isLoggedIn, async (req, res) => {
  const { new_status } = req.body;
  const roomId = req.params.id;
  await pool.query(
    'UPDATE classrooms SET current_status = ?, last_updated = NOW(), updated_by = ? WHERE room_id = ?',
    [new_status, req.session.userId, roomId]
  );
  const [rooms] = await pool.query('SELECT * FROM classrooms WHERE room_id = ?', [roomId]);
  res.render('update_status', {
    room: rooms[0],
    success: '✅ Status Updated Successfully!'
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.listen(PORT, () => {
  console.log(`✅ Server tumatakbo sa port ${PORT}`);
});

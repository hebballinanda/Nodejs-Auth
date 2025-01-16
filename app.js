const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const productRoutes = require('./routes/product'); // Ensure this exports a valid router
const authRoutes = require('./routes/auth');       // Ensure this exports a valid router
const db = require('./database');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

require('dotenv').config();

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

const store = new MongoDBStore({
  uri: process.env.MONGO_URI,
  collection: 'sessions',
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Use true if HTTPS is enabled
      maxAge: 1000 * 60 * 2, // 2 min
    },
    store: store,
  })
);

app.use('/products', productRoutes); // Valid middleware
app.use('/auth', authRoutes);       // Valid middleware

app.use((req, res, next) => {
  console.log('Cookies:', req.cookies);
  next();
});

// Catch errors for MongoDB store
store.on('error', (error) => {
  console.error('Session store error:', error);
});

// Connect to the database and start the server
db.connect()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`Server running on http://localhost:${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

app.use((req, res) => {
  res.status(404).send('404 Page Not Found');
});

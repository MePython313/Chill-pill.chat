const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database(process.env.DB_PATH || './database.db');

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email_verified INTEGER DEFAULT 0,
    verification_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Messages table
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
  )`);

  // Friends table
  db.run(`CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (friend_id) REFERENCES users(id),
    UNIQUE(user_id, friend_id)
  )`);
});

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify reCAPTCHA
async function verifyCaptcha(captchaToken) {
  if (!process.env.RECAPTCHA_SECRET_KEY) {
    console.warn('reCAPTCHA secret key not set, skipping verification');
    return true; // Allow in development
  }

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: captchaToken
        }
      }
    );
    return response.data.success;
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return false;
  }
}

// Generate JWT token
function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'secret-key', { expiresIn: '7d' });
}

// Verify JWT token middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.userId = user.userId;
    next();
  });
}

// Routes

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;

  // Validate input
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate password (at least 6 characters)
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate verification token
    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET || 'secret-key', { expiresIn: '24h' });

    // Insert user into database
    db.run(
      'INSERT INTO users (username, email, password, verification_token) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, verificationToken],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }

        // Send verification email
        const verificationLink = `${process.env.APP_URL || 'http://localhost:3000'}/verify?token=${verificationToken}`;
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Welcome! Verify Your Email',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4CAF50;">Welcome to Kids Chat! 🎉</h2>
              <p>Hi ${username}!</p>
              <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
              <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Verify Email</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="color: #666; word-break: break-all;">${verificationLink}</p>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't sign up for this account, please ignore this email.</p>
            </div>
          `
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error('Email error:', error);
            return res.status(500).json({ error: 'Failed to send verification email' });
          }
          res.json({ 
            message: 'Signup successful! Please check your email to verify your account.',
            userId: this.lastID 
          });
        });
      }
    );
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify email endpoint
app.get('/verify', (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.send(`
      <html>
        <head><title>Verification Failed</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #f44336;">Verification Failed</h2>
          <p>Invalid verification token.</p>
          <a href="/">Go to Home</a>
        </body>
      </html>
    `);
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret-key', (err, decoded) => {
      if (err) {
        return res.send(`
          <html>
            <head><title>Verification Failed</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #f44336;">Verification Failed</h2>
              <p>Verification token has expired or is invalid.</p>
              <a href="/">Go to Home</a>
            </body>
          </html>
        `);
      }

      db.run(
        'UPDATE users SET email_verified = 1, verification_token = NULL WHERE email = ? AND verification_token = ?',
        [decoded.email, token],
        function(err) {
          if (err || this.changes === 0) {
            return res.send(`
              <html>
                <head><title>Verification Failed</title></head>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                  <h2 style="color: #f44336;">Verification Failed</h2>
                  <p>Could not verify email. The link may have already been used.</p>
                  <a href="/">Go to Home</a>
                </body>
              </html>
            `);
          }

          res.send(`
            <html>
              <head><title>Email Verified!</title></head>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #4CAF50;">🎉 Email Verified Successfully!</h2>
                <p>Your email has been verified. You can now log in and start chatting with your friends!</p>
                <a href="/" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">Go to Login</a>
              </body>
            </html>
          `);
        }
      );
    });
  } catch (error) {
    res.send(`
      <html>
        <head><title>Verification Failed</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #f44336;">Verification Failed</h2>
          <p>An error occurred during verification.</p>
          <a href="/">Go to Home</a>
        </body>
      </html>
    `);
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      if (!user.email_verified) {
        return res.status(401).json({ error: 'Please verify your email before logging in' });
      }

      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const token = generateToken(user.id);
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email 
        } 
      });
    }
  );
});

// Get user info
app.get('/api/user', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, username, email FROM users WHERE id = ?',
    [req.userId],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    }
  );
});

// Get all users (for friend search)
app.get('/api/users', authenticateToken, (req, res) => {
  db.all(
    'SELECT id, username FROM users WHERE id != ? AND email_verified = 1',
    [req.userId],
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(users);
    }
  );
});

// Send friend request
app.post('/api/friends/request', authenticateToken, (req, res) => {
  const { friendId } = req.body;

  if (!friendId || friendId == req.userId) {
    return res.status(400).json({ error: 'Invalid friend ID' });
  }

  db.run(
    'INSERT OR IGNORE INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)',
    [req.userId, friendId, 'pending'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Friend request sent' });
    }
  );
});

// Get friends
app.get('/api/friends', authenticateToken, (req, res) => {
  db.all(
    `SELECT u.id, u.username, f.status 
     FROM friends f 
     JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id) 
     WHERE (f.user_id = ? OR f.friend_id = ?) AND u.id != ? AND f.status = 'accepted'`,
    [req.userId, req.userId, req.userId],
    (err, friends) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(friends);
    }
  );
});

// Accept friend request
app.post('/api/friends/accept', authenticateToken, (req, res) => {
  const { friendId } = req.body;

  db.run(
    'UPDATE friends SET status = ? WHERE user_id = ? AND friend_id = ?',
    ['accepted', friendId, req.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Friend request accepted' });
    }
  );
});

// Send message
app.post('/api/messages', authenticateToken, (req, res) => {
  const { receiverId, message } = req.body;

  if (!receiverId || !message) {
    return res.status(400).json({ error: 'Receiver ID and message are required' });
  }

  db.run(
    'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
    [req.userId, receiverId, message],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Message sent', messageId: this.lastID });
    }
  );
});

// Get messages with a friend
app.get('/api/messages/:friendId', authenticateToken, (req, res) => {
  const { friendId } = req.params;

  db.all(
    `SELECT m.*, u.username as sender_name 
     FROM messages m 
     JOIN users u ON m.sender_id = u.id 
     WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
     ORDER BY m.created_at ASC`,
    [req.userId, friendId, friendId, req.userId],
    (err, messages) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(messages);
    }
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Make sure to configure your .env file with email credentials!');
});

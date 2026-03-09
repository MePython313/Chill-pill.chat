# Kids Chat App 🌟

A safe and fun chat platform for kids with email verification and CAPTCHA protection.

## Features

- ✅ User signup with email verification
- ✅ Secure login with CAPTCHA
- ✅ Friend system (add and chat with friends)
- ✅ Real-time messaging
- ✅ Kid-friendly colorful UI
- ✅ Email verification required before login
- ✅ reCAPTCHA protection on signup and login

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

- **PORT**: Server port (default: 3000)
- **JWT_SECRET**: A random secret string for JWT tokens
- **EMAIL_HOST**: SMTP server (e.g., smtp.gmail.com)
- **EMAIL_PORT**: SMTP port (usually 587)
- **EMAIL_USER**: Your email address
- **EMAIL_PASS**: Your email password or app password
- **RECAPTCHA_SITE_KEY**: Your reCAPTCHA site key
- **RECAPTCHA_SECRET_KEY**: Your reCAPTCHA secret key
- **APP_URL**: Your app URL (e.g., http://localhost:3000)

### 3. Get reCAPTCHA Keys

1. Go to [Google reCAPTCHA](https://www.google.com/recaptcha/admin/create)
2. Register a new site (choose reCAPTCHA v2)
3. Copy your Site Key and Secret Key
4. Add them to your `.env` file
5. Update `YOUR_RECAPTCHA_SITE_KEY` in `public/index.html` (line 12 and 30)

### 4. Configure Email (Gmail Example)

For Gmail, you'll need to:
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the app password in `EMAIL_PASS`

### 5. Update reCAPTCHA Site Key in HTML

Edit `public/index.html` and replace `YOUR_RECAPTCHA_SITE_KEY` with your actual reCAPTCHA site key (appears twice in the file).

### 6. Run the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

### 7. Open in Browser

Navigate to `http://localhost:3000`

## Usage

1. **Sign Up**: Create an account with username, email, and password
2. **Verify Email**: Check your email and click the verification link
3. **Log In**: Login with your username and password
4. **Add Friends**: Search for other users and send friend requests
5. **Chat**: Select a friend and start chatting!

## Project Structure

```
kids-chat-app/
├── server.js          # Express server and API endpoints
├── package.json       # Dependencies
├── .env.example      # Environment variables template
├── .gitignore        # Git ignore file
├── README.md         # This file
└── public/
    ├── index.html    # Frontend HTML
    ├── styles.css    # Styling
    └── app.js        # Frontend JavaScript
```

## API Endpoints

- `POST /api/signup` - User registration
- `GET /verify?token=...` - Email verification
- `POST /api/login` - User login
- `GET /api/user` - Get current user info
- `GET /api/users` - Get all users (for friend search)
- `POST /api/friends/request` - Send friend request
- `GET /api/friends` - Get friends list
- `POST /api/messages` - Send a message
- `GET /api/messages/:friendId` - Get messages with a friend

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Email verification required
- reCAPTCHA on signup and login
- SQL injection protection (parameterized queries)

## Notes

- The database is SQLite and will be created automatically
- Messages are polled every 2 seconds (can be upgraded to WebSockets for real-time)
- Friend requests are automatically accepted (you can modify this to require approval)

## License

ISC

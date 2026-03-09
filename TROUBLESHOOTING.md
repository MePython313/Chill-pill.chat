# Troubleshooting Network Errors

## Common Causes of "Network Error"

### 1. Server Not Running
**Most Common Issue!**

The server must be running for the website to work. To start it:

```bash
cd kids-chat-app
npm install
npm start
```

You should see: `Server running on http://localhost:3000`

**Keep the terminal window open** while using the website!

### 2. Dependencies Not Installed

If you haven't installed dependencies yet:

```bash
cd kids-chat-app
npm install
```

### 3. Wrong Port

The server runs on port 3000 by default. Make sure:
- No other application is using port 3000
- You're accessing the site at `http://localhost:3000`

### 4. Browser Console Errors

Open your browser's Developer Tools (F12) and check the Console tab for detailed error messages.

### 5. CORS Issues

If you see CORS errors, make sure the server has `cors` middleware enabled (it's already in the code).

## Quick Test

1. Open terminal in the `kids-chat-app` folder
2. Run: `npm start`
3. You should see: `Server running on http://localhost:3000`
4. Open browser and go to: `http://localhost:3000`
5. Try signing up or logging in

## Still Having Issues?

Check the terminal where the server is running - it will show detailed error messages that can help identify the problem.

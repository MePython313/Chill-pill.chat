// API Base URL
const API_URL = window.location.origin;

// State management
let currentUser = null;
let currentFriendId = null;
let friends = [];
let messageInterval = null;

// DOM Elements
const signupSection = document.getElementById('signup-section');
const loginSection = document.getElementById('login-section');
const chatSection = document.getElementById('chat-section');
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const messageForm = document.getElementById('message-form');
const showLoginLink = document.getElementById('show-login');
const showSignupLink = document.getElementById('show-signup');
const logoutBtn = document.getElementById('logout-btn');
const friendsList = document.getElementById('friends-list');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const searchUsername = document.getElementById('search-username');
const searchResults = document.getElementById('search-results');
const chatHeaderInfo = document.getElementById('chat-header-info');
const messageInputSection = document.getElementById('message-input-section');

// Check if user is already logged in
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        verifyTokenAndLoadChat();
    }
});

// Form switching
showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupSection.style.display = 'none';
    loginSection.style.display = 'block';
});

showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginSection.style.display = 'none';
    signupSection.style.display = 'block';
});

// Signup form submission
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
        const response = await fetch(`${API_URL}/api/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({ error: 'Server error occurred' }));
            showMessage(data.error || `Error: ${response.status} ${response.statusText}`, 'error');
            return;
        }

        const data = await response.json();
        showMessage(data.message, 'success');
        signupForm.reset();
        setTimeout(() => {
            showMessage('Please check your email to verify your account!', 'success');
        }, 2000);
    } catch (error) {
        console.error('Signup error:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showMessage('Cannot connect to server. Make sure the server is running on port 3000.', 'error');
        } else {
            showMessage(`Network error: ${error.message}`, 'error');
        }
    }
});

// Login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({ error: 'Server error occurred' }));
            showMessage(data.error || `Error: ${response.status} ${response.statusText}`, 'error');
            return;
        }

        const data = await response.json();
        localStorage.setItem('token', data.token);
        currentUser = data.user;
        loadChat();
    } catch (error) {
        console.error('Login error:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showMessage('Cannot connect to server. Make sure the server is running on port 3000.', 'error');
        } else {
            showMessage(`Network error: ${error.message}`, 'error');
        }
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    currentUser = null;
    currentFriendId = null;
    if (messageInterval) {
        clearInterval(messageInterval);
    }
    signupSection.style.display = 'block';
    loginSection.style.display = 'none';
    chatSection.style.display = 'none';
});

// Verify token and load chat
async function verifyTokenAndLoadChat() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/api/user`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            currentUser = await response.json();
            loadChat();
        } else {
            localStorage.removeItem('token');
        }
    } catch (error) {
        localStorage.removeItem('token');
    }
}

// Load chat interface
function loadChat() {
    signupSection.style.display = 'none';
    loginSection.style.display = 'none';
    chatSection.style.display = 'block';
    loadFriends();
    setupMessagePolling();
}

// Load friends list
async function loadFriends() {
    try {
        const response = await fetch(`${API_URL}/api/friends`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            friends = await response.json();
            renderFriends();
        }
    } catch (error) {
        console.error('Error loading friends:', error);
    }
}

// Render friends list
function renderFriends() {
    friendsList.innerHTML = '';
    
    if (friends.length === 0) {
        friendsList.innerHTML = '<p style="color: #666; padding: 10px;">No friends yet. Search for friends below!</p>';
    } else {
        friends.forEach(friend => {
            const friendItem = document.createElement('div');
            friendItem.className = 'friend-item';
            friendItem.textContent = friend.username;
            friendItem.addEventListener('click', () => {
                selectFriend(friend.id, friend.username);
            });
            friendsList.appendChild(friendItem);
        });
    }
}

// Select friend for chatting
function selectFriend(friendId, friendName) {
    currentFriendId = friendId;
    
    // Update active friend in list
    document.querySelectorAll('.friend-item').forEach(item => {
        item.classList.remove('active');
        if (item.textContent === friendName) {
            item.classList.add('active');
        }
    });

    // Update chat header
    chatHeaderInfo.innerHTML = `<strong>Chatting with: ${friendName}</strong>`;
    messageInputSection.style.display = 'flex';
    
    // Load messages
    loadMessages(friendId);
}

// Load messages with a friend
async function loadMessages(friendId) {
    try {
        const response = await fetch(`${API_URL}/api/messages/${friendId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const messages = await response.json();
            renderMessages(messages);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Render messages
function renderMessages(messages) {
    messagesContainer.innerHTML = '';
    
    messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender_id === currentUser.id ? 'sent' : 'received'}`;
        
        const header = document.createElement('div');
        header.className = 'message-header';
        header.textContent = `${message.sender_name} - ${new Date(message.created_at).toLocaleString()}`;
        
        const text = document.createElement('div');
        text.className = 'message-text';
        text.textContent = message.message;
        
        messageDiv.appendChild(header);
        messageDiv.appendChild(text);
        messagesContainer.appendChild(messageDiv);
    });
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentFriendId) {
        showMessage('Please select a friend first', 'error');
        return;
    }

    const message = messageInput.value.trim();
    if (!message) return;

    try {
        const response = await fetch(`${API_URL}/api/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                receiverId: currentFriendId,
                message: message
            })
        });

        if (response.ok) {
            messageInput.value = '';
            loadMessages(currentFriendId);
        } else {
            const data = await response.json();
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Failed to send message', 'error');
    }
});

// Search for users
let searchTimeout;
searchUsername.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
    }

    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`${API_URL}/api/users`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const users = await response.json();
                const filtered = users.filter(user => 
                    user.username.toLowerCase().includes(query.toLowerCase())
                );
                renderSearchResults(filtered);
            }
        } catch (error) {
            console.error('Error searching users:', error);
        }
    }, 300);
});

// Render search results
function renderSearchResults(users) {
    searchResults.innerHTML = '';
    
    if (users.length === 0) {
        searchResults.innerHTML = '<p style="color: #666; padding: 10px;">No users found</p>';
        return;
    }

    users.forEach(user => {
        const isFriend = friends.some(f => f.id === user.id);
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.innerHTML = `
            <span>${user.username}</span>
            ${!isFriend ? `<button class="btn btn-primary" style="padding: 5px 15px; font-size: 12px;" onclick="sendFriendRequest(${user.id})">Add Friend</button>` : '<span style="color: #4CAF50;">✓ Friend</span>'}
        `;
        searchResults.appendChild(resultItem);
    });
}

// Send friend request
window.sendFriendRequest = async function(friendId) {
    try {
        const response = await fetch(`${API_URL}/api/friends/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ friendId })
        });

        if (response.ok) {
            showMessage('Friend request sent!', 'success');
            searchUsername.value = '';
            searchResults.innerHTML = '';
            // Reload friends after a short delay
            setTimeout(loadFriends, 1000);
        } else {
            const data = await response.json();
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Failed to send friend request', 'error');
    }
};

// Setup message polling
function setupMessagePolling() {
    if (messageInterval) {
        clearInterval(messageInterval);
    }
    
    messageInterval = setInterval(() => {
        if (currentFriendId) {
            loadMessages(currentFriendId);
        }
    }, 2000); // Poll every 2 seconds
}

// Show message notification
function showMessage(message, type) {
    const messageDisplay = document.getElementById('message-display');
    messageDisplay.textContent = message;
    messageDisplay.className = type;
    
    setTimeout(() => {
        messageDisplay.style.display = 'none';
    }, 5000);
}

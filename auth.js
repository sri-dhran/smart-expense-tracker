/**
 * auth.js - Session and Authentication Logic
 */

const Auth = {
    // 1. Register a new user
    register(name, email, password) {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        
        // Check if user already exists
        if (users.find(u => u.email === email)) {
            return { success: false, message: 'Email already registered' };
        }

        const newUser = {
            id: Date.now(),
            name,
            email,
            password, // In a real app, this would be hashed
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        return { success: true };
    },

    // 2. Login user
    login(email, password) {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            // Store session
            const session = {
                id: user.id,
                name: user.name,
                email: user.email,
                loginTime: new Date().toISOString()
            };
            localStorage.setItem('currentUser', JSON.stringify(session));
            return { success: true };
        }

        return { success: false, message: 'Invalid email or password' };
    },

    // 3. Logout user
    logout() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    },

    // 4. Get current user
    getCurrentUser() {
        return JSON.parse(localStorage.getItem('currentUser'));
    },

    // 5. Check if authenticated
    isAuthenticated() {
        return this.getCurrentUser() !== null;
    },

    // 6. Guard: Redirect to login if not authenticated
    checkAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
        }
    },

    // 7. Guard: Redirect to dashboard if already authenticated (for login/signup pages)
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            window.location.href = 'dashboard.html';
        }
    }
};

export default Auth;

const Auth = {

    // 1️⃣ Register user
    register(name, email, password) {
        const users = JSON.parse(localStorage.getItem("users")) || [];

        // check if user already exists
        const existing = users.find(user => user.email === email);
        if (existing) {
            return { success: false, message: "Email already registered" };
        }

        const newUser = {
            id: Date.now(),
            name,
            email,
            password
        };

        users.push(newUser);
        localStorage.setItem("users", JSON.stringify(users));

        return { success: true };
    },

    // 2️⃣ Login user
    login(email, password) {
        const users = JSON.parse(localStorage.getItem("users")) || [];

        const user = users.find(
            u => u.email === email && u.password === password
        );

        if (!user) {
            return { success: false, message: "Invalid email or password" };
        }

        // save session
        localStorage.setItem("loggedInUser", JSON.stringify(user));

        return { success: true };
    },

    // 3️⃣ Logout
    logout() {
        localStorage.removeItem("loggedInUser");
        window.location.href = "index.html";
    },

    // 4️⃣ Get current user
    getCurrentUser() {
        return JSON.parse(localStorage.getItem("loggedInUser"));
    },

    // 5️⃣ Check if logged in
    isAuthenticated() {
        return this.getCurrentUser() !== null;
    },

    // 6️⃣ Protect dashboard
    checkAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = "index.html";
        }
    },

    // 7️⃣ Redirect if already logged in
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            window.location.href = "dashboard.html";
        }
    }
};

export default Auth;
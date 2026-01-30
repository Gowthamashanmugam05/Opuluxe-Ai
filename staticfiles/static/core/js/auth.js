// Auth Logic handles switching between Login and Signup forms and database interactions
(function () {
    const initAuth = () => {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const btnShowSignup = document.getElementById('btn-show-signup');
        const btnShowLogin = document.getElementById('btn-show-login');
        const loginSubmitBtn = document.getElementById('login-submit-btn');
        const signupSubmitBtn = document.getElementById('signup-submit-btn');

        if (!loginForm || !signupForm) {
            console.error("Auth forms not found on page");
            return;
        }

        console.log("Auth System Initializing - v5.0");

        // Switch Forms with GSAP
        if (btnShowSignup && btnShowLogin) {
            btnShowSignup.addEventListener('click', () => {
                gsap.to(loginForm, {
                    opacity: 0, duration: 0.3, onComplete: () => {
                        loginForm.style.display = 'none';
                        signupForm.style.display = 'block';
                        gsap.fromTo(signupForm, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 });
                    }
                });
            });

            btnShowLogin.addEventListener('click', () => {
                gsap.to(signupForm, {
                    opacity: 0, duration: 0.3, onComplete: () => {
                        signupForm.style.display = 'none';
                        loginForm.style.display = 'block';
                        gsap.fromTo(loginForm, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 });
                    }
                });
            });
        }

        // Handle Login Button
        if (loginSubmitBtn) {
            loginSubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;

                if (!username || !password) {
                    showAuthToast('Please fill in both fields', '#ff4d4d');
                    return;
                }

                loginSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging In...';
                loginSubmitBtn.disabled = true;

                fetch('/api/login/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            localStorage.setItem('isLoggedIn', 'true');
                            showAuthToast('Welcome back! Redirecting...', '#4caf50');
                            setTimeout(() => { window.location.href = '/dashboard/'; }, 800);
                        } else {
                            showAuthToast(data.error || 'Invalid credentials', '#ff4d4d');
                            loginSubmitBtn.innerHTML = 'Log In';
                            loginSubmitBtn.disabled = false;
                        }
                    })
                    .catch(err => {
                        showAuthToast('Network Error', '#ff4d4d');
                        loginSubmitBtn.innerHTML = 'Log In';
                        loginSubmitBtn.disabled = false;
                    });
            });
        }

        // Handle Signup Button
        if (signupSubmitBtn) {
            signupSubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('new-password').value;
                const confirmPassword = document.getElementById('confirm-password').value;

                if (!email || !password || !confirmPassword) {
                    showAuthToast('All fields required', '#ff4d4d');
                    return;
                }

                if (password !== confirmPassword) {
                    showAuthToast('Passwords do not match', '#ff4d4d');
                    return;
                }

                signupSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
                signupSubmitBtn.disabled = true;

                fetch('/api/signup/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            localStorage.setItem('isLoggedIn', 'true');
                            showAuthToast('Account created! Entering...', '#4caf50');
                            setTimeout(() => { window.location.href = '/dashboard/'; }, 800);
                        } else {
                            showAuthToast(data.error || 'Signup failed', '#ff4d4d');
                            signupSubmitBtn.innerHTML = 'Sign Up';
                            signupSubmitBtn.disabled = false;
                        }
                    })
                    .catch(err => {
                        showAuthToast('Network Error', '#ff4d4d');
                        signupSubmitBtn.innerHTML = 'Sign Up';
                        signupSubmitBtn.disabled = false;
                    });
            });
        }
    };

    window.showAuthToast = (msg, color) => {
        const toast = document.getElementById('auth-toast');
        const toastMsg = document.getElementById('auth-toast-msg');
        if (toast && toastMsg) {
            toastMsg.innerText = msg;
            toast.style.borderColor = color;
            toast.style.opacity = '1';
            toast.style.visibility = 'visible';
            toast.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.visibility = 'hidden';
                toast.style.transform = 'translateX(-50%) translateY(0)';
            }, 3000);
        }
    };

    window.togglePasswordVisibility = (id) => {
        const field = document.getElementById(id);
        const icon = field.nextElementSibling;
        if (field.type === 'password') {
            field.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            field.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }
})();

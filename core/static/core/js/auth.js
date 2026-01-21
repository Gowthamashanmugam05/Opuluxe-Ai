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
                console.log("Login Attempt Started");

                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;

                if (!username || !password) {
                    alert('Please fill in both username and password.');
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
                            window.location.href = '/dashboard/';
                        } else {
                            alert('Login Failed: ' + (data.error || 'Check credentials'));
                            loginSubmitBtn.innerHTML = 'Log In';
                            loginSubmitBtn.disabled = false;
                        }
                    })
                    .catch(err => {
                        console.error('Login Error:', err);
                        alert('Network Error: Could not connect to authentication server.');
                        loginSubmitBtn.innerHTML = 'Log In';
                        loginSubmitBtn.disabled = false;
                    });
            });
        }

        // Handle Signup Button
        if (signupSubmitBtn) {
            signupSubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("Signup process initiated...");

                const email = document.getElementById('email').value;
                const password = document.getElementById('new-password').value;
                const confirmPassword = document.getElementById('confirm-password').value;

                if (!email || !password || !confirmPassword) {
                    alert('Please complete all signup fields.');
                    return;
                }

                if (password !== confirmPassword) {
                    alert('Passwords do not match. Please verify.');
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
                            window.location.href = '/dashboard/';
                        } else {
                            alert('Signup Error: ' + (data.error || 'Server rejected the request'));
                            signupSubmitBtn.innerHTML = 'Sign Up';
                            signupSubmitBtn.disabled = false;
                        }
                    })
                    .catch(err => {
                        console.error('Signup Failure:', err);
                        alert('Check your internet connection and try again.');
                        signupSubmitBtn.innerHTML = 'Sign Up';
                        signupSubmitBtn.disabled = false;
                    });
            });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }
})();

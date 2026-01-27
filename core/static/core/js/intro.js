document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth Visibility (Removed redundant redirects to let Backend handle routing)
    const introScreen = document.getElementById('intro-screen');
    const mainContentElements = document.querySelectorAll('.main-hide');

    // 2. Check if intro has already been shown in this session
    if (sessionStorage.getItem('introShown') === 'true') {
        if (introScreen) introScreen.style.display = 'none';
        mainContentElements.forEach(el => {
            el.classList.remove('main-hide');
            el.classList.add('main-show');
            el.style.transition = 'none';
        });
        return;
    }

    // Time to show the intro screen before fading out
    const introDuration = 1000;

    setTimeout(() => {
        if (introScreen) {
            introScreen.style.opacity = '0';
            introScreen.style.pointerEvents = 'none';

            setTimeout(() => {
                introScreen.style.display = 'none';
            }, 400);
        }

        mainContentElements.forEach(el => {
            el.classList.remove('main-hide');
            el.classList.add('main-show');
        });

        // Mark intro as shown for this session
        sessionStorage.setItem('introShown', 'true');
    }, introDuration);
});

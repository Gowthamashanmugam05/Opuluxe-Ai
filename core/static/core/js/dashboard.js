// --- VARIABLES ---
const chatRoot = document.getElementById('chat-root');
const input = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const fileInput = document.getElementById('file-up');
const filePreview = document.getElementById('file-preview');
const scrollContainer = document.getElementById('scroll-container');
const inputBar = document.getElementById('input-bar');
const sidebar = document.getElementById('sidebar');

let attachedFile = null;
let attachedFileSrc = null;
let isGenerating = false;
let chatHistory = [];
let currentSessionId = null;
let selectedPlatforms = JSON.parse(localStorage.getItem('selectedPlatforms') || '[]');

// --- THEME ENGINE ---
const themes = ['look-default', 'look-cyber', 'look-paper', 'look-ocean', 'look-sunset'];
let currentThemeIndex = 0;

function switchTheme() {
    // Remove current theme class
    document.body.classList.remove(themes[currentThemeIndex]);

    // Move to next theme
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;

    // Add new theme class
    const newTheme = themes[currentThemeIndex];
    document.body.classList.add(newTheme);

    let label = "Default Look";
    if (newTheme === 'look-cyber') label = "Cyberpunk Mode";
    if (newTheme === 'look-paper') label = "Writer Mode";
    if (newTheme === 'look-ocean') label = "Ocean Mode";
    if (newTheme === 'look-sunset') label = "Sunset Mode";

    showToast(`Switched to ${label}`, "ri-palette-line");
}

// --- RESET ---
function startNewChat() {
    chatHistory = []; attachedFile = null; attachedFileSrc = null; isGenerating = false;
    currentSessionId = null;
    localStorage.removeItem('lastChatSessionId');
    filePreview.style.display = 'none'; fileInput.value = ''; input.value = ''; input.style.height = 'auto'; sendBtn.disabled = true;
    chatRoot.innerHTML = `
        <div id="welcome" style="margin-top: 15vh; text-align: center; max-width: 600px; margin-inline: auto;">
            <div class="welcome-icon-wrapper" style="width:100px; height:100px; background:var(--bg-glass); border-radius:30px; margin:0 auto 32px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border); box-shadow:var(--shadow-float); overflow: hidden; position: relative;">
                <img src="/static/core/images/company_icon.png" alt="Icon" style="width: 100%; height: 100%; object-fit: cover;">
                <div style="position:absolute; inset:0; background:linear-gradient(45deg, rgba(255,255,255,0.1), transparent);"></div>
            </div>
            <h1 data-t="app_name" style="font-family: var(--font-brand); font-size: 2.5rem; letter-spacing: 0.15em; margin-bottom: 12px; color: var(--text-main);">OPULUXE AI</h1>
            <p data-t="welcome_desc" style="color:var(--text-muted); font-size: 1.1rem; max-width: 400px; margin: 0 auto 40px; line-height: 1.6;">AI-powered virtual personal shopping assistant.</p>
            
            <div class="welcome-actions" style="display: flex; gap: 12px; justify-content: center;">
                <button class="chip" onclick="setInput('What are the latest fashion trends?')"><i class="ri-sparkling-2-line"></i> Latest Trends</button>
                <button class="chip" onclick="setInput('Help me find a formal outfit')"><i class="ri-shirt-line"></i> Formal Style</button>
            </div>
        </div>`;
    showToast(getT('chat_started'), "ri-chat-new-line");
    applyTranslations(localStorage.getItem('preferredLang') || 'en');
    if (window.innerWidth <= 768) toggleMobileMenu();
}

// --- CHAT LOGIC ---
function autoResize() {
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
    validateSend();
}

function validateSend() {
    if (!sendBtn || !input) return;
    sendBtn.disabled = !input.value.trim() && !attachedFile;
}

function sendMessage() {
    if (isGenerating) return;
    const text = input.value.trim();
    const hasFile = attachedFile !== null;
    const fileSrc = attachedFileSrc;
    if (!text && !hasFile) return;

    const welcome = document.getElementById('welcome');
    if (welcome) welcome.style.display = 'none';

    input.value = ''; input.style.height = 'auto';
    chatHistory.push({ role: 'user', text: text, file: fileSrc });
    attachedFile = null; attachedFileSrc = null; filePreview.style.display = 'none'; fileInput.value = '';
    sendBtn.disabled = true; isGenerating = true;

    const msgId = addMessage('user', text, fileSrc);

    // Update Sidebar History Real-time
    const historyList = document.getElementById('chat-history-list');
    if (historyList && text) {
        const item = document.createElement('div');
        item.className = 'nav-item history-item';
        item.onclick = (e) => scrollToMessage(msgId);
        item.innerHTML = `<i class="ri-chat-4-line"></i> <span class="nav-label" style="font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${text}</span>`;
        historyList.insertBefore(item, historyList.firstChild);
    }

    // API Call to Groq via Django Backend
    const loaderId = showLoader();

    fetch('/api/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: text,
            history: chatHistory,
            session_id: currentSessionId,
            image: hasFile ? fileSrc : null
        })
    })
        .then(res => res.json())
        .then(data => {
            const loader = document.getElementById(loaderId);
            if (loader) loader.remove();

            if (data.success && data.reply && data.reply.trim()) {
                if (data.session_id) currentSessionId = data.session_id;
                chatHistory.push({ role: 'assistant', text: data.reply });
                streamReply(data.reply);
                loadChatHistory(); // Refresh sidebar to show new/updated session
            } else if (!data.success) {
                if (data.error === "Not logged in") {
                    window.location.href = '/';
                } else {
                    addMessage('ai', "Error: " + data.error);
                }
            }
        })
        .catch(err => {
            const loader = document.getElementById(loaderId);
            if (loader) loader.remove();
            addMessage('ai', "Network error occurred.");
        })
        .finally(() => {
            validateSend();
        });
}

function addMessage(role, text, attachment) {
    if (!text && !attachment) return;
    const div = document.createElement('div'); div.className = 'message-row';

    let contentHtml = text;
    const isAi = (role === 'ai' || role === 'assistant');
    if (isAi) {
        if (window.marked && typeof window.marked.parse === 'function') {
            contentHtml = window.marked.parse(text || '');
        }
    }

    if (attachment) contentHtml = `<img src="${attachment}" class="chat-attachment-thumb">` + contentHtml;

    const inner = role === 'user' ? `<div class="user-bubble">${contentHtml}</div>` : `<div class="msg-content">${contentHtml}</div>`;
    const aiAvatar = `<div class="avatar ai"><img src="/static/core/images/company_icon.png"></div>`;
    const userAvatar = `<div class="avatar user"><i class="ri-user-3-line"></i></div>`;
    div.innerHTML = (role === 'user' ? userAvatar : aiAvatar) + inner;

    // Add unique ID for scrolling to history
    if (role === 'user') {
        div.id = 'msg-' + Date.now();
    } else if (isAi) {
        const contentDiv = div.querySelector('.msg-content');
        if (contentDiv) {
            renderCodeBlocks(contentDiv);
            injectTryOnButtons(contentDiv);
        }
    }

    chatRoot.appendChild(div); scrollToBottom();
    return div.id;
}

function showLoader() {
    const id = 'loader-' + Date.now();
    const div = document.createElement('div'); div.className = 'message-row'; div.id = id;
    div.innerHTML = `<div class="avatar ai"><img src="/static/core/images/company_icon.png"></div><div class="msg-content"><div class="typing-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;
    chatRoot.appendChild(div); scrollToBottom(); return id;
}

function streamReply(text) {
    if (!text) { isGenerating = false; return; }
    let cleanText = text;
    let needsProfile = false;
    let needsShoppingDetails = false;

    if (text.includes('[NEED_PROFILE_SELECTION]')) {
        cleanText = text.replace('[NEED_PROFILE_SELECTION]', '').trim();
        needsProfile = true;
    }
    if (text.includes('[NEED_SHOPPING_DETAILS]')) {
        cleanText = text.replace('[NEED_SHOPPING_DETAILS]', '').trim();
        needsShoppingDetails = true;
    }

    if (!cleanText) {
        if (needsProfile) injectProfileSelector();
        if (needsShoppingDetails) injectShoppingWidget();
        isGenerating = false;
        return;
    }

    const div = document.createElement('div');
    div.className = 'message-row';
    div.innerHTML = `<div class="avatar ai"><img src="/static/core/images/company_icon.png"></div><div class="msg-content"></div>`;
    chatRoot.appendChild(div);
    const contentDiv = div.querySelector('.msg-content');
    let i = 0;
    const interval = setInterval(() => {
        if (i < cleanText.length) {
            const chunk = cleanText.slice(0, i += 2);
            if (window.marked && typeof window.marked.parse === 'function') {
                contentDiv.innerHTML = window.marked.parse(chunk);
            } else {
                contentDiv.textContent = chunk;
            }
            renderCodeBlocks(contentDiv);
            scrollToBottom();
        } else {
            clearInterval(interval);
            addSuggestions(["Tell me more"]);
            injectTryOnButtons(contentDiv);
            if (needsProfile) injectProfileSelector();
            if (needsShoppingDetails) injectShoppingWidget();
            isGenerating = false;
        }
    }, 20);
}

function injectTryOnButtons(container) {
    if (!container) return;

    container.querySelectorAll('li, p').forEach(el => {
        const strongs = el.querySelectorAll('strong');
        let productFound = null;

        strongs.forEach(s => {
            const itemName = s.innerText.trim();
            const parentText = el.innerText.trim();

            // Check if it's likely a product (at start of line or following a number)
            const isAtStart = parentText.startsWith(itemName) ||
                parentText.match(new RegExp(`^\\d+\\.\\s*${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

            const filterWords = ['fabric', 'style', 'fit', 'material', 'detail', 'type', 'occasion', 'season', 'price', 'brand', 'color', 'look', 'note', 'option'];
            const isFiltered = filterWords.includes(itemName.toLowerCase()) || itemName.includes(':');

            if (itemName.length > 3 && !isFiltered && isAtStart) {
                productFound = itemName;
            }
        });

        if (productFound) {
            // Create a clean Action Group at the end of the element
            const actionGroup = document.createElement('div');
            actionGroup.className = 'product-action-bar';

            // Magic Try-On Button
            const tryOnBtn = document.createElement('button');
            tryOnBtn.className = 'magic-tryon-pill';
            tryOnBtn.innerHTML = '<i class="ri-magic-line"></i> Magic Try-On';
            tryOnBtn.onclick = () => tryOnOutfit(productFound);

            // Shopping Link Button
            const shopBtn = document.createElement('button');
            shopBtn.className = 'product-shop-pill';
            shopBtn.innerHTML = '<i class="ri-shopping-bag-line"></i> Shop Now';
            shopBtn.onclick = (e) => {
                e.stopPropagation();
                const platform = selectedPlatforms.length > 0 ? selectedPlatforms[0] : 'Google';
                window.open(getProductUrl(productFound, platform), '_blank');
            };

            actionGroup.appendChild(tryOnBtn);
            actionGroup.appendChild(shopBtn);
            el.appendChild(actionGroup);
        }
    });
}

function getProductUrl(itemName, platform) {
    const rawQuery = itemName.trim();
    const queryEncoded = encodeURIComponent(rawQuery);
    const queryDashed = rawQuery.replace(/\s+/g, '-').toLowerCase();

    const p = platform.toLowerCase();
    if (p.includes('myntra')) return `https://www.myntra.com/${queryDashed}`;
    if (p.includes('ajio')) return `https://www.ajio.com/search/?text=${queryEncoded}`;
    if (p.includes('amazon')) return `https://www.amazon.in/s?k=${queryEncoded}`;
    if (p.includes('flipkart')) return `https://www.flipkart.com/search?q=${queryEncoded}`;
    if (p.includes('tata')) return `https://www.tatacliq.com/search/?text=${queryEncoded}`;
    return `https://www.google.com/search?tbm=shop&q=${queryEncoded}`;
}

function tryOnOutfit(itemName) {
    const profiles = JSON.parse(localStorage.getItem('user_profiles') || '[]');
    // Try to find the person based on current context or last edited, default to first
    const currentProfile = profiles.find(p => p.id === editingProfileId) || profiles[0];

    if (!currentProfile || !currentProfile.photo) {
        showToast("Please add a profile photo first for Magic Try-On", "ri-image-line");
        openMeasurementModal();
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'tryon-overlay';
    overlay.innerHTML = `
        <div class="tryon-content">
            <button onclick="this.parentElement.parentElement.remove()" style="position:absolute; top:20px; right:20px; background:none; border:none; color:white; font-size:24px; cursor:pointer;"><i class="ri-close-line"></i></button>
            <h2 style="color:var(--accent); margin:0 0 5px;">Magic AI Virtual Fit</h2>
            <p style="color:var(--text-muted); font-size:12px; margin-bottom:20px;">Applying <strong>${itemName}</strong> to <strong>${currentProfile.name}</strong></p>
            
            <div id="tryon-loading" style="margin:60px 0;">
                <div class="typing-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
                <p style="font-size:11px; margin-top:20px; letter-spacing:2px; text-transform:uppercase; color:var(--accent);">AI Model Processing...</p>
            </div>

            <div id="tryon-result" style="display:none;">
                <div class="tryon-view-container">
                    <div class="tryon-item">
                        <div class="tryon-frame">
                            <img src="${currentProfile.photo}">
                        </div>
                        <span class="tryon-label">Original Photo</span>
                    </div>
                    <div class="tryon-item">
                        <div class="tryon-frame" style="border-color:var(--accent);">
                            <img id="result-img" src="">
                        </div>
                        <span class="tryon-label" style="color:var(--accent);">AI Generated Preview</span>
                    </div>
                </div>
                
                <div style="margin-top:30px; display:flex; gap:12px; justify-content:center;">
                    <button class="setting-btn" style="background:rgba(255,255,255,0.05); border:1px solid var(--border);" onclick="showToast('Style Saved', 'ri-bookmark-line')"><i class="ri-bookmark-line"></i> Save Outfit</button>
                    <button class="setting-btn" onclick="window.open(window.getProductUrl('${itemName.replace(/'/g, "\\'")}'), '_blank')">Buy this Look</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Call API for real image generation
    fetch('/api/tryon/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            item: itemName,
            gender: currentProfile.category || 'men',
            user_photo: currentProfile.photo
        })
    })
        .then(res => res.json())
        .then(data => {
            const loading = document.getElementById('tryon-loading');
            const result = document.getElementById('tryon-result');
            const img = document.getElementById('result-img');

            if (data.success && data.image) {
                img.src = data.image; // Display generated base64 image
                img.onload = () => {
                    loading.style.display = 'none';
                    result.style.display = 'block';
                    showToast("AI Render Complete!", "ri-magic-line");
                };
            } else {
                showToast("Try-on generation failed. Using reference.", "ri-error-warning-line");
                // Fallback to placeholder if generation fails
                loading.style.display = 'none';
                result.style.display = 'block';
                img.src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800';
            }
        })
        .catch(err => {
            console.error("Try-on error:", err);
            showToast("Network error during generation", "ri-wifi-off-line");
            document.querySelector('.tryon-overlay').remove();
        });
}


function injectProfileSelector() {
    const profiles = JSON.parse(localStorage.getItem('user_profiles') || '[]');
    if (profiles.length === 0) {
        addMessage('ai', "I noticed you don't have any measurement profiles saved. You can add one by clicking 'Adding Persons' in the sidebar to get better recommendations!");
        return;
    }

    const div = document.createElement('div');
    div.className = 'message-row';
    div.innerHTML = `
        <div class="avatar ai"><img src="/static/core/images/company_icon.png"></div>
        <div class="msg-content profile-selection-box">
            <div style="font-weight:600; margin-bottom:12px; color:var(--accent); font-size:14px; text-transform:uppercase; letter-spacing:1px;">Select a Profile for tailored advice:</div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                ${profiles.map(p => `
                    <div class="profile-chip" onclick="useProfile('${p.id}')">
                        <i class="ri-user-3-line"></i> ${p.name}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    chatRoot.appendChild(div);
    scrollToBottom();
}

function useProfile(id) {
    const profiles = JSON.parse(localStorage.getItem('user_profiles') || '[]');
    const p = profiles.find(prof => prof.id == id);
    if (!p) return;

    const measurementStr = Object.entries(p.measurements)
        .filter(([k, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');

    const fitStr = `Fit preferences: ${p.fit.type}, comfort: ${p.fit.comfort}`;
    const message = `Please use my saved profile "${p.name}". My measurements are: ${measurementStr}. ${fitStr}. Now, could you help me with my fashion request?`;

    setInput(message);
}

function showImageGenResult(prompt) {
    const div = document.createElement('div'); div.className = 'message-row';
    div.innerHTML = `<div class="avatar ai" style="overflow: hidden;"><img src="/static/core/images/company_icon.png" style="width:100%; height:100%; object-fit:cover;"></div><div class="msg-content"><div class="gen-widget"><i class="ri-brush-ai-line" style="color:#8b5cf6"></i><div style="flex:1"><div style="font-size:12px;font-weight:600">Generating...</div><div class="gen-progress"><div class="gen-bar" style="width:100%; transition:width 2s"></div></div></div></div></div>`;
    chatRoot.appendChild(div); scrollToBottom();
    setTimeout(() => {
        div.querySelector('.msg-content').innerHTML = `<div>Result for: "${prompt}"</div><img src="https://via.placeholder.com/600x400/e0e7ff/4f46e5?text=AI+Generated+Art" style="width:100%; max-width:500px; border-radius:12px; margin-top:10px; border:1px solid var(--border);">`;
        scrollToBottom();
    }, 2000);
}

function addSuggestions(labels) {
    const div = document.createElement('div'); div.className = 'suggestion-row';
    labels.forEach(l => {
        const s = document.createElement('span'); s.className = 'chip'; s.innerHTML = `<i class="ri-sparkling-fill"></i> ${l}`;
        s.onclick = () => { setInput(l); }; div.appendChild(s);
    });
    chatRoot.lastElementChild.querySelector('.msg-content').appendChild(div); scrollToBottom();
}

function renderCodeBlocks(c) {
    if (!window.hljs) return;
    c.querySelectorAll('pre code').forEach(b => {
        if (!b.parentElement.classList.contains('styled')) hljs.highlightElement(b);
    });
}

// --- RESPONSIVE TOGGLES ---
function toggleMobileMenu() {
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function toggleSidebar() {
    if (window.innerWidth <= 768) {
        toggleMobileMenu();
    } else {
        sidebar.classList.toggle('collapsed');
        const isCol = sidebar.classList.contains('collapsed');
        const sidebarIcon = document.getElementById('sidebar-icon');
        if (sidebarIcon) sidebarIcon.className = isCol ? 'ri-menu-unfold-line' : 'ri-menu-fold-line';
    }
}

// --- UTILS ---
function handleFileSelect(inputElement) {
    const file = inputElement.files[0];
    if (file) {
        attachedFile = file;
        const r = new FileReader();
        r.onload = (ev) => {
            attachedFileSrc = ev.target.result;
            filePreview.style.display = 'block';
            filePreview.innerHTML = `<img src="${ev.target.result}" style="height:50px; border-radius:8px;">`;
            validateSend();
        };
        r.readAsDataURL(file);
    }
}

function setInput(t) {
    if (!input) return;
    input.value = t;
    input.focus();
    sendMessage();
}

function scrollToBottom() {
    if (scrollContainer) scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
}

function minimizeInput(e) {
    e.stopPropagation();
    if (inputBar) inputBar.classList.add('minimized');
}

function maximizeInput(e) {
    if (inputBar && inputBar.classList.contains('minimized')) {
        inputBar.classList.remove('minimized');
        if (input) input.focus();
    }
}

function action(type) {
    if (type === 'settings') openSettings();
    if (type === 'subscription') showToast("Subscription Details", "ri-vip-crown-2-line");
    if (type === 'persona') openMeasurementModal();
    if (type === 'gallery') showToast("Opening Gallery...", "ri-gallery-line");
}

function openSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('active');
}

function closeSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('active');
}

function switchSettingsTab(tabId) {
    // Update sidebar items
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
        // Get the onclick attribute to determine the tabId it switches to
        const onclickAttr = item.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes(`'${tabId}'`)) {
            item.classList.add('active');
        }
    });

    // Update content tabs
    const tabs = document.querySelectorAll('.settings-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });

    const targetTab = document.getElementById(`settings-${tabId}`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

// --- MEASUREMENT MODAL LOGIC (PROFILE MANAGEMENT) ---
let editingProfileId = null;
let selectedCategoryType = null;

function openMeasurementModal() {
    const modal = document.getElementById('measurement-modal');
    if (modal) {
        modal.classList.add('active');
        renderProfiles(); // Load list
        goToStep('profiles'); // Start at list
    }
}

function closeMeasurementModal() {
    const modal = document.getElementById('measurement-modal');
    if (modal) modal.classList.remove('active');
}

function goToStep(stepId) {
    const steps = document.querySelectorAll('.measurement-step');
    steps.forEach(s => s.style.display = 'none');
    const target = document.getElementById(`step-${stepId}`);
    if (target) target.style.display = 'block';
}

function startNewProfile() {
    editingProfileId = null;
    document.getElementById('prof-name').value = '';
    // Clear all inputs
    document.querySelectorAll('.m-input, .w-input').forEach(i => i.value = '');
    document.getElementById('fit-notes').value = '';
    document.getElementById('prof-photo-input').value = '';
    document.getElementById('photo-preview').innerHTML = '<i class="ri-user-add-line" style="font-size:32px; color:var(--text-muted); margin-bottom:10px;"></i><span style="font-size:12px; color:var(--text-muted);">Add Photo</span>';
    currentProfilePhoto = null;
    goToStep('name');
}

let currentProfilePhoto = null;
function handleProfilePhoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            currentProfilePhoto = e.target.result;
            document.getElementById('photo-preview').innerHTML = `<img src="${currentProfilePhoto}" style="width:100%; height:100%; object-fit:cover;">`;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function handleMeasurementRefPhoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('measurement-ref-photo-preview').innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function selectCategory(cat) {
    selectedCategoryType = cat;
    const menFields = document.getElementById('fields-men');
    const womenFields = document.getElementById('fields-women');

    if (cat === 'men') {
        menFields.style.display = 'block';
        womenFields.style.display = 'none';
        document.getElementById('ref-img').src = 'https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=800';
    } else {
        menFields.style.display = 'none';
        womenFields.style.display = 'block';
        document.getElementById('ref-img').src = 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800';
    }
    goToStep('measurements');
}

function saveMeasurements() {
    const name = document.getElementById('prof-name').value.trim();
    if (!name) {
        showToast("Please enter a profile name", "ri-error-warning-line");
        return;
    }

    const data = {
        id: editingProfileId || Date.now(),
        name: name,
        category: selectedCategoryType || 'men', // Default for partial saves
        photo: currentProfilePhoto,
        measurements: {},
        fit: {
            type: document.getElementById('fit-type') ? document.getElementById('fit-type').value : 'Slim fit',
            comfort: document.getElementById('fit-comfort') ? document.getElementById('fit-comfort').value : 'Regular',
            waist: document.getElementById('fit-waist') ? document.getElementById('fit-waist').value : 'Mid rise',
            length: document.getElementById('fit-length') ? document.getElementById('fit-length').value : 'Regular',
            notes: document.getElementById('fit-notes') ? document.getElementById('fit-notes').value : ''
        },
        timestamp: new Date().toISOString()
    };

    // Collect measurements if category is selected
    if (selectedCategoryType) {
        const selector = selectedCategoryType === 'men' ? '.m-input' : '.w-input';
        document.querySelectorAll(selector).forEach(input => {
            const key = input.getAttribute('data-key');
            data.measurements[key] = input.value;
        });
    }

    // Save via API
    fetch('/api/save-profile/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: data })
    })
        .then(res => res.json())
        .then(resData => {
            if (resData.success) {
                showToast(editingProfileId ? "Measurements Updated!" : "Profile Saved!", "ri-shield-user-line");
                renderProfiles();
                editingProfileId = null;
                goToStep('profiles');
            } else {
                showToast("Error saving profile", "ri-error-warning-line");
            }
        });
}

function renderProfiles() {
    const container = document.getElementById('profiles-container');
    container.innerHTML = '<div style="text-align:center; padding:20px;">Loading...</div>';

    fetch('/api/get-profiles/')
        .then(res => res.json())
        .then(data => {
            const profiles = data.profiles || [];

            // Sync to local storage for quick access in other functions
            localStorage.setItem('user_profiles', JSON.stringify(profiles));

            if (profiles.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted); border:1px dashed var(--border); border-radius:12px;">No profiles saved yet. Click "Add New" to get started.</div>`;
                return;
            }

            container.innerHTML = profiles.map(p => `
                <div class="profile-card" style="background:var(--bg-glass); border:1px solid var(--border); padding:16px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; transition:0.3s; margin-bottom:12px;">
            <div style="display:flex; gap:15px; align-items:center;">
                <div style="width:50px; height:60px; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:8px; overflow:hidden;">
                    ${p.photo ? `<img src="${p.photo}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="ri-user-3-line" style="display:flex; height:100%; align-items:center; justify-content:center; color:var(--text-muted);"></i>`}
                </div>
                <div>
                    <h4 style="margin:0; font-size:16px;">${p.name}</h4>
                    <p style="margin:5px 0 0; font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Category: ${p.category}</p>
                </div>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="action-btn" onclick="editProfile(${p.id})" style="background:rgba(255,255,255,0.05); border:1px solid var(--border); color:white; padding:8px; border-radius:8px; cursor:pointer;"><i class="ri-edit-line"></i></button>
                <button class="action-btn" onclick="deleteProfile(${p.id})" style="background:rgba(255,0,0,0.1); border:1px solid rgba(255,0,0,0.2); color:#ff4d4d; padding:8px; border-radius:8px; cursor:pointer;"><i class="ri-delete-bin-line"></i></button>
            </div>
        </div>
    `).join('');
        });
}

function editProfile(id) {
    fetch(`/api/get-profile/${id}`)
        .then(res => res.json())
        .then(data => {
            const p = data.profile;
            if (!p) {
                showToast("Profile not found", "ri-error-warning-line");
                return;
            }

            editingProfileId = id;
            document.getElementById('prof-name').value = p.name;
            currentProfilePhoto = p.photo;
            if (p.photo) {
                document.getElementById('photo-preview').innerHTML = `<img src="${p.photo}" style="width:100%; height:100%; object-fit:cover;">`;
            } else {
                document.getElementById('photo-preview').innerHTML = '<i class="ri-user-add-line" style="font-size:32px; color:var(--text-muted); margin-bottom:10px;"></i><span style="font-size:12px; color:var(--text-muted);">Add Photo</span>';
            }

            // Select category
            selectCategory(p.category);

            // Apply measurements
            const selector = p.category === 'men' ? '.m-input' : '.w-input';
            document.querySelectorAll(selector).forEach(input => {
                const key = input.getAttribute('data-key');
                input.value = p.measurements[key] || '';
            });

            // Apply fit
            document.getElementById('fit-type').value = p.fit.type;
            document.getElementById('fit-comfort').value = p.fit.comfort;
            document.getElementById('fit-waist').value = p.fit.waist;
            document.getElementById('fit-length').value = p.fit.length;
            document.getElementById('fit-notes').value = p.fit.notes;

            goToStep('name');
        })
        .catch(error => {
            console.error('Error fetching profile:', error);
            showToast("Error loading profile", "ri-error-warning-line");
        });
}

function deleteProfile(id) {
    if (!confirm("Delete this profile?")) return;

    fetch('/api/delete-profile/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                renderProfiles();
                showToast("Profile deleted", "ri-delete-bin-line");
            }
        });
}

// Global Exports
window.openMeasurementModal = openMeasurementModal;
window.closeMeasurementModal = closeMeasurementModal;
window.goToStep = goToStep;
window.startNewProfile = startNewProfile;
window.selectCategory = selectCategory;
window.saveMeasurements = saveMeasurements;
window.editProfile = editProfile;
window.deleteProfile = deleteProfile;
window.renderProfiles = renderProfiles;
window.handleProfilePhoto = handleProfilePhoto;
window.handleMeasurementRefPhoto = handleMeasurementRefPhoto;

function toggleHistorySearch(e) {
    const label = document.getElementById('history-search-label');
    const inputField = document.getElementById('history-search-input');
    const navItem = document.getElementById('history-search-item');

    if (label && inputField) {
        const isSearching = inputField.style.display === 'block';

        if (!isSearching) {
            // Start searching: Hide label, Show input
            label.style.display = 'none';
            inputField.style.display = 'block';

            if (sidebar.classList.contains('collapsed')) {
                toggleSidebar();
            }

            inputField.focus();
            navItem.style.cursor = 'default';

            // Add search logic
            inputField.oninput = (ev) => {
                const query = ev.target.value.toLowerCase();
                const items = document.querySelectorAll('.history-item');
                items.forEach(item => {
                    const text = item.innerText.toLowerCase();
                    item.style.display = text.includes(query) ? 'flex' : 'none';
                });
            };
        }
    }
}

// Add a global listener to close search when clicking outside
document.addEventListener('click', (e) => {
    const navItem = document.getElementById('history-search-item');
    const label = document.getElementById('history-search-label');
    const inputField = document.getElementById('history-search-input');

    if (navItem && !navItem.contains(e.target) && inputField && inputField.style.display === 'block') {
        inputField.style.display = 'none';
        label.style.display = 'block';
        inputField.value = '';
        navItem.style.cursor = 'pointer';

        // Reset visibility
        const items = document.querySelectorAll('.history-item');
        items.forEach(item => item.style.display = 'flex');
    }
});

function showToast(msg, icon) {
    const t = document.getElementById('toast');
    if (t) {
        t.innerHTML = `<i class="${icon}"></i> ${msg}`;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    }
}

function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return showToast("Voice not supported", "ri-mic-off-line");

    const recognition = new SpeechRecognition();

    // Get currently selected language from the dropdown
    const langSelect = document.getElementById('language-select');
    const selectedLang = langSelect ? langSelect.value : 'en';

    // Map language codes to recognition locales
    const langMap = {
        'en': 'en-IN',
        'hi': 'hi-IN',
        'ta': 'ta-IN',
        'te': 'te-IN',
        'kn': 'kn-IN',
        'ml': 'ml-IN',
        'mr': 'mr-IN',
        'bn': 'bn-IN',
        'gu': 'gu-IN',
        'pa': 'pa-IN'
    };

    recognition.lang = langMap[selectedLang] || 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    if (inputBar) inputBar.classList.add('hidden');
    const voiceIsland = document.getElementById('voice-island');
    if (voiceIsland) voiceIsland.classList.add('active');

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (input) {
            input.value = transcript;
            autoResize();
            showToast(`Recognized (${recognition.lang})`, "ri-mic-line");
        }
        stopVoice();
    };

    recognition.onerror = () => {
        showToast("Voice error", "ri-error-warning-line");
        stopVoice();
    };

    recognition.onend = () => {
        stopVoice();
    };

    recognition.start();
}

function stopVoice() {
    const voiceIsland = document.getElementById('voice-island');
    if (voiceIsland) voiceIsland.classList.remove('active');
    if (inputBar) inputBar.classList.remove('hidden');
}

// Global Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
            e.preventDefault();
            startNewChat();
        }
    });

    const wrapper = document.getElementById('input-wrapper');
    if (wrapper && inputBar) {
        wrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dragOverlay = inputBar.querySelector('.drag-overlay');
            if (dragOverlay) dragOverlay.style.opacity = 1;
        });
        wrapper.addEventListener('dragleave', () => {
            const dragOverlay = inputBar.querySelector('.drag-overlay');
            if (dragOverlay) dragOverlay.style.opacity = 0;
        });
        wrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            const dragOverlay = inputBar.querySelector('.drag-overlay');
            if (dragOverlay) dragOverlay.style.opacity = 0;
            if (e.dataTransfer.files.length) handleFileSelect({ files: e.dataTransfer.files });
        });
    }

    // Initialize Sidebar Toggle if on mobile
    if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.add('hidden');
    }
});

// --- TRANSLATION ENGINE ---
// translations are now loaded from translations.js

function getT(key) {
    const lang = localStorage.getItem('preferredLang') || 'en';
    return (translations[lang] && translations[lang][key]) ? translations[lang][key] : (translations['en'][key] || key);
}

function changeLanguage(lang) {
    localStorage.setItem('preferredLang', lang);
    applyTranslations(lang);
    showToast(getT('lang_switched') + lang.toUpperCase(), "ri-translate-2");
}

function applyTranslations(lang) {
    if (!translations[lang]) return;
    const t = translations[lang];

    // Translate elements with data-t
    document.querySelectorAll('[data-t]').forEach(el => {
        const key = el.getAttribute('data-t');
        if (t[key]) {
            el.innerText = t[key];
        }
    });

    // Translate placeholders with data-t-placeholder
    document.querySelectorAll('[data-t-placeholder]').forEach(el => {
        const key = el.getAttribute('data-t-placeholder');
        if (t[key]) {
            el.placeholder = t[key];
        }
    });

    document.documentElement.lang = lang;
}

// Global Event Listeners Extension
document.addEventListener('DOMContentLoaded', () => {
    // Language initialization

    // Language initialization
    const savedLang = localStorage.getItem('preferredLang') || 'en';
    const langSelect = document.getElementById('language-select');
    if (langSelect) {
        langSelect.value = savedLang;
    }
    applyTranslations(savedLang);

    // Load Chat History
    loadChatHistory();

    // Auto-load last active session
    const lastSessionId = localStorage.getItem('lastChatSessionId');
    if (lastSessionId) {
        openSession(lastSessionId);
    }
});

function loadChatHistory() {
    fetch('/api/chat-history/')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const historyList = document.getElementById('chat-history-list');
                if (!historyList) return;
                historyList.innerHTML = '';

                data.history.forEach(session => {
                    const item = document.createElement('div');
                    item.className = 'nav-item history-item';
                    if (currentSessionId === session.session_id) item.classList.add('active');

                    item.innerHTML = `
                        <i class="ri-chat-4-line"></i>
                        <span class="nav-label" style="font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${session.title}</span>
                        <div class="history-actions" onclick="event.stopPropagation(); toggleHistoryMenu(this, '${session.session_id}')">
                            <i class="ri-more-2-fill"></i>
                        </div>
                        <div class="history-menu" id="menu-${session.session_id}">
                            <div class="history-menu-item" onclick="shareChat('${session.session_id}')"><i class="ri-share-line"></i> Share</div>
                            <div class="history-menu-item delete" onclick="deleteChat('${session.session_id}')"><i class="ri-delete-bin-line"></i> Delete</div>
                        </div>
                    `;
                    item.onclick = () => openSession(session.session_id);
                    historyList.appendChild(item);
                });
            } else if (data.error === "Not logged in") {
                window.location.href = '/';
            }
        })
        .catch(err => console.error("History load failed:", err));
}

function toggleHistoryMenu(btn, id) {
    // Close others
    document.querySelectorAll('.history-menu').forEach(m => {
        if (m.id !== 'menu-' + id) m.classList.remove('show');
    });
    const menu = document.getElementById('menu-' + id);
    menu.classList.toggle('show');

    // Close on click outside
    const closer = (e) => {
        if (!btn.contains(e.target)) {
            menu.classList.remove('show');
            document.removeEventListener('click', closer);
        }
    };
    setTimeout(() => document.addEventListener('click', closer), 10);
}

function openSession(sessionId) {
    currentSessionId = sessionId;
    localStorage.setItem('lastChatSessionId', sessionId);
    fetch(`/api/chat-session/?id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const welcome = document.getElementById('welcome');
                if (welcome) welcome.style.display = 'none';

                chatRoot.innerHTML = '';
                chatHistory = [];
                data.messages.forEach(m => {
                    chatHistory.push({ role: m.role, text: m.text });
                    addMessage(m.role, m.text);
                });

                // Highlight active in sidebar
                document.querySelectorAll('.history-item').forEach(item => {
                    item.classList.remove('active');
                });
                loadChatHistory();
            }
        });
}

function deleteChat(id) {
    if (!confirm("Are you sure you want to delete this chat?")) return;
    fetch('/api/delete-chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            if (currentSessionId === id) startNewChat();
            loadChatHistory();
            showToast(getT('chat_deleted'), "ri-delete-bin-line");
        }
    });
}

function shareChat(id) {
    const url = window.location.origin + '/share/' + id;
    navigator.clipboard.writeText(url).then(() => {
        showToast(getT('link_copied'), "ri-share-line");
    });
}

function scrollToMessage(id) {
    const el = document.getElementById(id);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.background = 'rgba(255, 255, 255, 0.1)';
        setTimeout(() => el.style.background = 'transparent', 2000);
    }
}

// Exposed globally for onclick handlers
function logout() {
    localStorage.removeItem('isLoggedIn');
    // Also call server-side logout if needed, but for now just redirect
    window.location.href = '/';
}

window.logout = logout;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleSidebar = toggleSidebar;
window.startNewChat = startNewChat;
window.switchTheme = switchTheme;
window.setInput = setInput;
window.sendMessage = sendMessage;
window.maximizeInput = maximizeInput;
window.minimizeInput = minimizeInput;
window.action = action;
window.toggleHistorySearch = toggleHistorySearch;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.switchSettingsTab = switchSettingsTab;
window.startVoice = startVoice;
window.stopVoice = stopVoice;
window.autoResize = autoResize;
window.handleFileSelect = handleFileSelect;
window.changeLanguage = changeLanguage;
window.injectProfileSelector = injectProfileSelector;
window.useProfile = useProfile;
function injectShoppingWidget() {
    const div = document.createElement('div');
    div.className = 'message-row';
    div.innerHTML = `
        <div class="avatar ai"><img src="/static/core/images/company_icon.png"></div>
        <div class="msg-content shopping-widget">
            <h4 style="margin:0 0 20px; color:var(--accent);">Refine Your Shopping Preference</h4>
            
            <div class="pref-group">
                <label class="pref-label">💰 YOUR BUDGET (INR)</label>
                <input type="number" id="pref-budget" class="budget-input" placeholder="e.g. 5000">
            </div>

            <div class="pref-group">
                <label class="pref-label">🌐 PREFERRED PLATFORMS</label>
                <div id="pref-platforms">
                    <span class="choice-chip" onclick="toggleChoice(this)">Myntra</span>
                    <span class="choice-chip" onclick="toggleChoice(this)">Ajio</span>
                    <span class="choice-chip" onclick="toggleChoice(this)">Amazon</span>
                    <span class="choice-chip" onclick="toggleChoice(this)">Flipkart</span>
                    <span class="choice-chip" onclick="toggleChoice(this)">Tata CLiQ</span>
                </div>
            </div>

            <div class="pref-group">
                <label class="pref-label">🏷️ PREFERRED BRANDS</label>
                <div id="pref-brands">
                    <span class="choice-chip" onclick="toggleChoice(this)">Louis Philippe</span>
                    <span class="choice-chip" onclick="toggleChoice(this)">Van Heusen</span>
                    <span class="choice-chip" onclick="toggleChoice(this)">Zara</span>
                    <span class="choice-chip" onclick="toggleChoice(this)">H&M</span>
                    <span class="choice-chip" onclick="toggleChoice(this)">Peter England</span>
                    <span class="choice-chip" onclick="toggleChoice(this)">Levis</span>
                </div>
            </div>

            <button class="setting-btn" onclick="confirmShoppingPreferences()" style="width:100%; margin-top:10px;">Find Best Outfits</button>
        </div>
    `;
    chatRoot.appendChild(div);
    scrollToBottom();
}

function toggleChoice(el) {
    el.classList.toggle('selected');
}

function confirmShoppingPreferences() {
    const budget = document.getElementById('pref-budget').value;
    const platforms = Array.from(document.querySelectorAll('#pref-platforms .choice-chip.selected')).map(el => el.innerText);
    const brands = Array.from(document.querySelectorAll('#pref-brands .choice-chip.selected')).map(el => el.innerText);

    if (!budget || platforms.length === 0) {
        showToast("Enter budget and select platform", "ri-error-warning-line");
        return;
    }

    selectedPlatforms = platforms;
    localStorage.setItem('selectedPlatforms', JSON.stringify(platforms));

    const message = `Budget: ₹${budget} INR. Platforms: ${platforms.join(', ')}. Brands: ${brands.length > 0 ? brands.join(', ') : 'any'}. Suggestions for my fashion request?`;
    setInput(message);
}

window.injectShoppingWidget = injectShoppingWidget;
window.toggleChoice = toggleChoice;
window.confirmShoppingPreferences = confirmShoppingPreferences;
window.tryOnOutfit = tryOnOutfit;
window.injectTryOnButtons = injectTryOnButtons;
window.toggleHistoryMenu = toggleHistoryMenu;
window.openSession = openSession;
window.deleteChat = deleteChat;
window.getProductUrl = (name) => {
    const platform = selectedPlatforms.length > 0 ? selectedPlatforms[0] : 'Google';
    return getProductUrl(name, platform);
};
window.shareChat = shareChat;

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
        <div id="welcome" style="margin-top: 20vh; text-align: center;">
            <div style="width:72px; height:72px; background:var(--bg-glass); border-radius:20px; margin:0 auto 24px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border); box-shadow:var(--shadow-float); overflow: hidden;">
                <img src="/static/core/images/company_icon.png" alt="Icon" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <h1>OPULUXE AI</h1>
            <p style="color:var(--text-muted)">Voice to Text Conversion Active</p>
        </div>`;
    showToast("New chat started", "ri-chat-new-line");
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
const translations = {
    en: {
        new_chat: "New Chat",
        history: "HISTORY",
        search_history: "Search History",
        adding_persons: "Adding Persons",
        subscription: "Subscription",
        settings: "Settings",
        logout: "Logout",
        app_name: "OPULUXE AI",
        welcome_desc: "Welcome to AI-powered virtual personal shopping assistants. Ready for shopping.",
        general: "General",
        notifications: "Notifications",
        personalization: "Personalization",
        apps_tab: "Apps",
        data_controls: "Data controls",
        security: "Security",
        parental_controls: "Parental controls",
        account: "Account",
        theme_cust: "Theme Customization",
        theme_cust_desc: "Switch between optimized visual looks for the platform.",
        change_look: "Change Look",
        language: "Language",
        language_desc: "Choose your preferred Indian language for the interface.",
        responses: "Responses",
        responses_desc: "Get notified when ChatGPT responds to requests that take time, like research or image generation.",
        group_chats: "Group chats",
        group_chats_desc: "You'll receive notifications for new messages from group chats.",
        recommendations: "Recommendations",
        recommendations_desc: "Stay in the loop on new tools, tips, and features from Opuluxe AI.",

        notif_desc: "Manage your notification preferences here.",
        pers_desc: "Customize your experience.",
        apps_desc: "Manage connected applications.",
        data_desc: "Manage your data and privacy settings.",
        sec_desc: "Enhance your account security.",
        par_desc: "Set up parental controls.",
        acc_desc: "Manage your account settings.",
        search_chats_place: "Search chats...",
        chat_input_place: "Type a message or '/'..."
    },
    hi: {
        new_chat: "नई चैट",
        history: "इतिहास",
        search_history: "इतिहास खोजें",
        adding_persons: "लोग जोड़ें",
        subscription: "सदस्यता",
        settings: "सेटिंग्स",
        logout: "लॉगआउट",
        app_name: "OPULUXE AI",
        welcome_desc: "AI-संचालित वर्चुअल पर्सनल शॉपिंग सहायकों में आपका स्वागत है। खरीदारी के लिए तैयार।",
        general: "सामान्य",
        notifications: "सूचनाएं",
        personalization: "निजीकरण",
        apps_tab: "ऐप्स",
        data_controls: "डेटा नियंत्रण",
        security: "सुरक्षा",
        parental_controls: "माता-पिता का नियंत्रण",
        account: "खाता",
        theme_cust: "थीम कस्टमाइजेशन",
        theme_cust_desc: "प्लेटफ़ॉर्म के लिए अनुकूलित विजुअल लुक्स के बीच स्विच करें।",
        change_look: "लुक बदलें",
        language: "भाषा",
        language_desc: "इंटरफ़ेस के लिए अपनी पसंदीदा भारतीय भाषा चुनें।",
        responses: "प्रतिक्रियाएं",
        responses_desc: "ChatGPT द्वारा समय लेने वाले अनुरोधों, जैसे शोध या छवि निर्माण, पर उत्तर देने पर सूचना प्राप्त करें।",
        group_chats: "ग्रुप चैट",
        group_chats_desc: "आपको ग्रुप चैट से नए संदेशों की सूचनाएं प्राप्त होंगी।",
        recommendations: "सिफारिशें",
        recommendations_desc: "Opuluxe AI के नए टूल, युक्तियों और सुविधाओं के बारे में जानकारी रखें।",

        notif_desc: "यहां अपनी अधिसूचना प्राथमिकताएं प्रबंधित करें।",
        pers_desc: "अपने अनुभव को अनुकूलित करें।",
        apps_desc: "जुड़े हुए एप्लिकेशन प्रबंधित करें।",
        data_desc: "अपने डेटा और गोपनीयता सेटिंग्स प्रबंधित करें।",
        sec_desc: "अपनी खाता सुरक्षा बढ़ाएँ।",
        par_desc: "माता-पिता का नियंत्रण सेट करें।",
        acc_desc: "अपने खाता सेटिंग्स प्रबंधित करें।",
        search_chats_place: "चैट खोजें...",
        chat_input_place: "संदेश टाइप करें या '/'..."
    },
    ta: {
        new_chat: "புதிய அரட்டை",
        history: "வரலாறு",
        search_history: "வரலாற்றைத் தேடு",
        adding_persons: "நபர்களைச் சேர்த்தல்",
        subscription: "சந்தா",
        settings: "அமைப்புகள்",
        logout: "வெளியேறு",
        app_name: "OPULUXE AI",
        welcome_desc: "AI-இயங்கும் விர்ச்சுவல் ஷாப்பிங் உதவியாளர்களுக்கு உங்களை வரவேற்கிறோம். ஷாப்பிங்கிற்கு தயாரா?",
        general: "பொதுவானவை",
        notifications: "அறிவிப்புகள்",
        personalization: "தனிப்பயனாக்கம்",
        apps_tab: "பயன்பாடுகள்",
        data_controls: "தரவு கட்டுப்பாடுகள்",
        security: "பாதுகாப்பு",
        parental_controls: "பெற்றோர் கட்டுப்பாடுகள்",
        account: "கணக்கு",
        theme_cust: "தீம் தனிப்பயனாக்கம்",
        theme_cust_desc: "தளத்திற்கான மேம்படுத்தப்பட்ட காட்சி தோற்றங்களுக்கு இடையில் மாறவும்.",
        change_look: "தோற்றத்தை மாற்றவும்",
        language: "மொழி",
        language_desc: "இடைமுகத்திற்கு உங்களுக்கு விருப்பமான இந்திய மொழியைத் தேர்ந்தெடுக்கவும்.",
        responses: "பதில்கள்",
        responses_desc: "ChatGPT ஆராய்ச்சி அல்லது பட உருவாக்கம் போன்ற நேரம் எடுக்கும் கோரிக்கைகளுக்கு பதிலளிக்கும் போது அறிவிப்பைப் பெறுங்கள்.",
        group_chats: "குழு அரட்டைகள்",
        group_chats_desc: "குழு அரட்டைகளில் இருந்து புதிய செய்திகளுக்கான அறிவிப்புகளைப் பெறுவீர்கள்.",
        recommendations: "ಶಿಫಾರಸುಗಳು",
        recommendations_desc: "Opuluxe AI வழங்கும் ಹೊಸ ಟೂಲ್‌ಗಳು, ಸಲಹೆಗಳು ಮತ್ತು ವೈಶಿಷ್ಟ್ಯಗಳ ಕುರಿತು ಅಪ್‌ಡೇಟ್ ಆಗಿರಿ.",

        notif_desc: "உங்கள் அறிவிப்பு விருப்பங்களை இங்கே நிர்வகிக்கவும்.",
        pers_desc: "உங்கள் அனுபவத்தைத் தனிப்பயனாக்கவும்.",
        apps_desc: "இணைக்கப்பட்ட பயன்பாடுகளை நிர்வகிக்கவும்.",
        data_desc: "உங்கள் தரவு மற்றும் தனியுரிமை அமைப்புகளை நிர்வகிக்கவும்.",
        sec_desc: "உங்கள் கணக்கு பாதுகாப்பை மேம்படுத்தவும்.",
        par_desc: "பெற்றோர் கட்டுப்பாடுகளை அமைக்கவும்.",
        acc_desc: "உங்கள் கணக்கு அமைப்புகளை நிர்வகிக்கவும்.",
        search_chats_place: "அரட்டைகளைத் தேடு...",
        chat_input_place: "செய்தியைத் தட்டச்சு செய்யவும் அல்லது '/'..."
    },
    te: {
        new_chat: "కొత్త చాట్",
        history: "చరిత్ర",
        search_history: "చరిత్రను వెతకండి",
        adding_persons: "వ్యక్తులను జోడించడం",
        subscription: "చందా",
        settings: "అమరికలు",
        logout: "లాగ్ అవుట్",
        app_name: "OPULUXE AI",
        welcome_desc: "AI-ఆధారిత వర్చువల్ షాపింగ్ అసిస్టెంట్‌ల ప్రపంచానికి స్వాగతం. షాపింగ్‌కు సిద్ధమా?",
        general: "సాధారణం",
        notifications: "నోటిఫికేషన్లు",
        personalization: "వ్యక్తిగతీకరణ",
        apps_tab: "యాప్‌లు",
        data_controls: "డేటా నియంత్రణలు",
        security: "భద్రత",
        parental_controls: "తల్లిదండ్రుల నియంత్రణలు",
        account: "ఖాతా",
        theme_cust: "థీమ్ అనుకూలీకరణ",
        theme_cust_desc: "ప్లాట్‌ఫారమ్ కోసం ఆప్టిమైజ్ చేయబడిన విజువల్స్ మధ్య మారండి.",
        change_look: "లుక్ మార్చండి",
        language: "భాష",
        language_desc: "ఇంటర్‌ఫేస్ కోసం మీకు నచ్చిన భారతీయ భాషను ఎంచుకోండి.",
        responses: "ప్రతిస్పందనలు",
        responses_desc: "పరిశోధన లేదా చిత్ర సృష్టి వంటి సమయం తీసుకునే అభ్యర్థనలకు ChatGPT ప్రతిస్పందించినప్పుడు నోటిఫికేషన్ పొందండి.",
        group_chats: "గ్రూప్ చాట్‌లు",
        group_chats_desc: "మీరు గ్రూప్ చాట్‌ల నుండి కొత్త సందేశాల కోసం నోటిఫికేషన్‌లను అందుకుంటారు.",
        recommendations: "సిఫార్సులు",
        recommendations_desc: "Opuluxe AI నుండి కొత్త సాధనాలు, చిట్కాలు మరియు ఫీచర్ల గురించి ఎప్పటికప్పుడు తెలుసుకోండి.",

        notif_desc: "మీ నోటిఫికేషన్ ప్రాధాన్యతలను ఇక్కడ నిర్వహించండి.",
        pers_desc: "మీ అనుభవాన్ని అనుకూలీకరించుకోండి.",
        apps_desc: "కనెక్ట్ చేయబడిన యాప్‌లను నిర్వహించండి.",
        data_desc: "మీ డేటా మరియు గోప్యతా సెట్టింగ్‌లను నిర్వహించండి.",
        sec_desc: "మీ ఖాతా భద్రతను మెరుగుపరచండి.",
        par_desc: "తల్లిదండ్రుల నియంత్రణలను సెటప్ చేయండి.",
        acc_desc: "మీ ఖాతా సెట్టింగ్‌లను నిర్వహించండి.",
        search_chats_place: "చాట్‌లను వెతకండి...",
        chat_input_place: "సందేశాన్ని టైప్ చేయండి లేదా '/'..."
    },
    kn: {
        new_chat: "ಹೊಸ ಚಾಟ್",
        history: "ಇತಿಹಾಸ",
        search_history: "ಇತಿಹಾಸ ಹುಡುಕಿ",
        adding_persons: "ವ್ಯಕ್ತಿಗಳನ್ನು ಸೇರಿಸುವುದು",
        subscription: "ಚಂದಾದಾರಿಕೆ",
        settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
        logout: "ಲಾಗ್ ಔಟ್",
        app_name: "OPULUXE AI",
        welcome_desc: "AI-ಚಾಲಿತ ವರ್ಚುವಲ್ ಶಾಪಿಂಗ್ ಸಹಾಯಕರಿಗೆ ಸುಸ್ವಾಗತ. ಶಾಪಿಂಗ್‌ಗೆ ಸಿದ್ಧರಿದ್ದೀರಾ?",
        general: "ಸಾಮಾನ್ಯ",
        notifications: "ಅಧಿಸೂಚನೆಗಳು",
        personalization: "ವೈಯಕ್ತೀಕರಣ",
        apps_tab: "ಅಪ್ಲಿಕೇಶನ್‌ಗಳು",
        data_controls: "ಡೇಟಾ ನಿಯಂತ್ರಣಗಳು",
        security: "ಭದ್ರತೆ",
        parental_controls: "ಪೋಷಕರ ನಿಯಂತ್ರಣಗಳು",
        account: "ಖಾತೆ",
        theme_cust: "ಥೀಮ್ ಕಸ್ಟಮೈಸೇಶನ್",
        theme_cust_desc: "ಪ್ಲಾಟ್‌ಫಾರ್ಮ್‌ಗಾಗಿ ಆಪ್ಟಿಮೈಸ್ ಮಾಡಿದ ದೃಶ್ಯ ನೋಟಗಳ ನಡುವೆ ಬದಲಿಸಿ.",
        change_look: "ನೋಟ ಬದಲಿಸಿ",
        language: "ಭಾಷೆ",
        language_desc: "ಇಂಟರ್ಫೇಸ್‌ಗಾಗಿ ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾರತೀಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
        responses: "ಪ್ರತಿಕ್ರಿಯೆಗಳು",
        responses_desc: "ಸಂಶೋಧನೆ ಅಥವಾ ಚಿತ್ರ ರಚನೆಯಂತಹ ಸಮಯ ತೆಗೆದುಕೊಳ್ಳುವ ವಿನಂತಿಗಳಿಗೆ ChatGPT ಪ್ರತಿಕ್ರಿಯಿಸಿದಾಗ ಅಧಿಸೂಚನೆ ಪಡೆಯಿರಿ.",
        group_chats: "ಗುಂಪು ಚಾಟ್‌ಗಳು",
        group_chats_desc: "ಗುಂಪು ಚಾಟ್‌ಗಳಿಂದ ಹೊಸ ಸಂದೇಶಗಳಿಗಾಗಿ ನೀವು ಅಧಿಸೂಚನೆಗಳನ್ನು ಸ್ವೀಕರಿಸುತ್ತೀರಿ.",
        recommendations: "ಶಿಫಾರಸುಗಳು",
        recommendations_desc: "Opuluxe AI ನಿಂದ ಹೊಸ ಪರಿಕರಗಳು, ಸಲಹೆಗಳು ಮತ್ತು ವೈಶಿಷ್ಟ್ಯಗಳ ಕುರಿತು ಲೂಪ್‌ನಲ್ಲಿರಿ.",

        notif_desc: "ನಿಮ್ಮ ಅಧಿಸೂಚನೆ ಪ್ರಾಧಾನ್ಯತೆಗಳನ್ನು ಇಲ್ಲಿ ನಿರ್ವಹಿಸಿ.",
        pers_desc: "ನಿಮ್ಮ ಅನುಭವವನ್ನು ಕಸ್ಟಮೈಸ್ ಮಾಡಿ.",
        apps_desc: "ಸಂಪರ್ಕಿತ ಅಪ್ಲಿಕೇಶನ್‌ಗಳನ್ನು ನಿರ್ವಹಿಸಿ.",
        data_desc: "ನಿಮ್ಮ ಡೇಟಾ ಮತ್ತು ಗೌಪ್ಯತೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳನ್ನು ನಿರ್ವಹಿಸಿ.",
        sec_desc: "ನಿಮ್ಮ ಖಾತೆಯ ಭದ್ರತೆಯನ್ನು ಹೆಚ್ಚಿಸಿ.",
        par_desc: "ಪೋಷಕರ ನಿಯಂತ್ರಣಗಳನ್ನು ಹೊಂದಿಸಿ.",
        acc_desc: "ನಿಮ್ಮ ಖಾತೆಯ ಸೆಟ್ಟಿಂಗ್‌ಗಳನ್ನು ನಿರ್ವಹಿಸಿ.",
        search_chats_place: "ಚಾಟ್‌ಗಳನ್ನು ಹುಡುಕಿ...",
        chat_input_place: "ಸಂದೇಶ ಟೈಪ್ ಮಾಡಿ ಅಥವಾ '/'..."
    },
    ml: {
        new_chat: "പുതിയ ചാറ്റ്",
        history: "ചരിത്രം",
        search_history: "ചരിത്രം തിരയുക",
        adding_persons: "വ്യക്തികളെ ചേർക്കുക",
        subscription: "സബ്സ്ക്രിപ്ഷൻ",
        settings: "ക്രമീകരണങ്ങൾ",
        logout: "ലോഗ് ഔട്ട്",
        app_name: "OPULUXE AI",
        welcome_desc: "AI-അധിഷ്ഠിത ഷോപ്പിംഗ് അസിസ്റ്റന്റുമാരുടെ ലോകത്തേക്ക് സ്വാഗതം. ഷോപ്പിംഗിന് തയ്യാറാണോ?",
        general: "പൊതുവായവ",
        notifications: "അറിയിപ്പുകൾ",
        personalization: "വ്യക്തിഗതമാക്കൽ",
        apps_tab: "ആപ്പുകൾ",
        data_controls: "ഡാറ്റ നിയന്ത്രണങ്ങൾ",
        security: "സുരക്ഷ",
        parental_controls: "രക്ഷാകർതൃ നിയന്ത്രണങ്ങൾ",
        account: "അക്കൗണ്ട്",
        theme_cust: "തീം ഇഷ്ടാനുസൃതമാക്കൽ",
        theme_cust_desc: "പ്ലാറ്റ്‌ഫോമിനായുള്ള ഒപ്റ്റിമൈസ് ചെയ്ത വിഷ്വലുകൾക്കിടയിൽ മാറുക.",
        change_look: "ലുക്ക് മാറ്റുക",
        language: "ഭാഷ",
        language_desc: "ഇന്റർഫേസിനായി നിങ്ങളുടെ ഇഷ്ടപ്പെട്ട ഇന്ത്യൻ ഭാഷ തിരഞ്ഞെടുക്കുക.",
        responses: "പ്രതികരണങ്ങൾ",
        responses_desc: "ഗവേഷണം അല്ലെങ്കിൽ ഇമേജ് ജനറേഷൻ പോലുള്ള സമയം എടുക്കുന്ന അഭ്യർത്ഥനകളോട് ChatGPT പ്രതികരിക്കുമ്പോൾ അറിയിപ്പ് നേടുക.",
        group_chats: "ഗ്രൂപ്പ് ചാറ്റുകൾ",
        group_chats_desc: "ഗ്രൂപ്പ് ചാറ്റുകളിൽ നിന്നുള്ള പുതിയ സന്ദേശങ്ങൾക്കായി നിങ്ങൾക്ക് അറിയിപ്പുകൾ ലഭിക്കും.",
        recommendations: "ശുപാർശകൾ",
        recommendations_desc: "Opuluxe AI-ൽ നിന്നുള്ള പുതിയ ടൂളുകൾ, നുറുങ്ങുകൾ, ഫീച്ചറുകൾ എന്നിവയെക്കുറിച്ച് അറിഞ്ഞിരിക്കുക.",


        notif_desc: "നിങ്ങളുടെ അറിയിപ്പ് മുൻഗണനകൾ ഇവിടെ മാനേജ് ചെയ്യുക.",
        pers_desc: "നിങ്ങളുടെ അനുഭവം ഇഷ്ടാനുസൃതമാക്കുക.",
        apps_desc: "കണക്റ്റുചെയ്‌ത ആപ്പുകൾ മാനേജ് ചെയ്യുക.",
        data_desc: "നിങ്ങളുടെ ഡാറ്റയും സ്വകാര്യതാ ക്രമീകരണങ്ങളും മാനേജ് ചെയ്യുക.",
        sec_desc: "നിങ്ങളുടെ അക്കൗണ്ട് സുരക്ഷ മെച്ചപ്പെടുത്തുക.",
        par_desc: "രക്ഷാകർതൃ നിയന്ത്രണങ്ങൾ സജ്ജമാക്കുക.",
        acc_desc: "നിങ്ങളുടെ അക്കൗണ്ട് ക്രമീകരണങ്ങൾ മാനേജ് ചെയ്യുക.",
        search_chats_place: "ചാറ്റുകൾ തിരയുക...",
        chat_input_place: "സന്ദേശം ടൈപ്പ് ചെയ്യുക അല്ലെങ്കിൽ '/'..."
    }
};

function changeLanguage(lang) {
    localStorage.setItem('preferredLang', lang);
    applyTranslations(lang);
    showToast(`Language switched to ${lang.toUpperCase()}`, "ri-translate-2");
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
            showToast("Chat deleted", "ri-delete-bin-line");
        }
    });
}

function shareChat(id) {
    const url = window.location.origin + '/share/' + id;
    navigator.clipboard.writeText(url).then(() => {
        showToast("Share link copied to clipboard!", "ri-share-line");
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

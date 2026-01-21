import re
import os

filepath = r"d:\Opuluxe AI\core\static\core\js\dashboard.js"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update streamReply
new_stream_reply = """function streamReply(text) {
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

    const div = document.createElement('div');
    div.className = 'message-row';
    div.style.maxWidth = '100%';
    div.style.marginBottom = '24px';
    div.style.animation = 'fadeIn 0.5s ease-out';

    div.innerHTML = `<div class="avatar ai" style="overflow: hidden;"><img src="/static/core/images/company_icon.png" style="width:100%; height:100%; object-fit:cover;"></div><div class="msg-content" style="flex:1; background:rgba(255,255,255,0.04); padding:24px; border-radius:16px; line-height:1.7; font-size:16px; border:1px solid rgba(255,255,255,0.08);"></div>`;
    chatRoot.appendChild(div); const contentDiv = div.querySelector('.msg-content');
    let i = 0;
    const interval = setInterval(() => {
        if (i < cleanText.length) {
            const chunk = cleanText.slice(0, i += 2);
            if (window.marked && typeof window.marked.parse === 'function') {
                contentDiv.innerHTML = window.marked.parse(chunk);
            } else {
                contentDiv.textContent = chunk;
            }
            renderCodeBlocks(contentDiv); scrollToBottom();
        } else {
            clearInterval(interval);
            addSuggestions(["Tell me more"]);
            if (needsProfile) injectProfileSelector();
            if (needsShoppingDetails) injectShoppingWidget();
        }
    }, 20);
}"""

content = re.sub(r"function streamReply\(text\) \{[\s\S]*?\}", new_stream_reply, content)

# 2. Fix the mess at the end of the file
final_functions = """
function injectShoppingWidget() {
    const div = document.createElement('div');
    div.className = 'message-row';
    div.innerHTML = `
        <div class="avatar ai" style="overflow: hidden;"><img src="/static/core/images/company_icon.png" style="width:100%; height:100%; object-fit:cover;"></div>
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

    const message = `Budget: ₹${budget} INR. Platforms: ${platforms.join(', ')}. Brands: ${brands.length > 0 ? brands.join(', ') : 'any'}. Suggestions for my fashion request?`;
    setInput(message);
}

window.injectShoppingWidget = injectShoppingWidget;
window.toggleChoice = toggleChoice;
window.confirmShoppingPreferences = confirmShoppingPreferences;
"""

# Delete the bad lines from the end (everything after window.useProfile = useProfile;)
marker = "window.useProfile = useProfile;"
if marker in content:
    content = content[:content.find(marker) + len(marker)]
    content += final_functions

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Success")

// Wait until page assets and plugins load
document.addEventListener("DOMContentLoaded", () => {
  
  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // --- NAVBAR SCROLL TRACKING ---
  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll(".nav-links a");
  
  window.addEventListener("scroll", () => {
    let current = "";
    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      if (window.scrollY >= sectionTop - 120) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href").includes(current)) {
        link.classList.add("active");
      }
    });
  });

  // Parallax Scroll Effect for Spline Robot Container
  const splineContainer = document.getElementById("spline-container");
  if (splineContainer) {
    window.addEventListener("scroll", () => {
      const scrollY = window.scrollY;
      if (window.innerWidth > 992) {
        splineContainer.style.transform = `translateY(${scrollY * 0.18}px)`;
      } else {
        splineContainer.style.transform = "none";
      }
    });
  }

  // --- RIOT AI CHAT INTERFACE LOGIC ---
  const chatMessagesContainer = document.getElementById("chat-messages-container");
  const chatMessagesWrapper = document.querySelector(".chat-messages-wrapper");
  const chatInputForm = document.getElementById("chat-input-form");
  const chatUserInput = document.getElementById("chat-user-input");
  const btnChatReset = document.getElementById("btn-chat-reset");
  const quickPromptsContainer = document.getElementById("quick-prompts-container");
  const charCounter = document.getElementById("char-counter");
  const btnScrollBottom = document.getElementById("btn-scroll-bottom");
  const chatCategoryList = document.getElementById("chat-category-list");
  const btnMic = document.getElementById("btn-mic");
  const micStatus = document.getElementById("mic-status");
  const btnVoiceToggle = document.getElementById("btn-voice-toggle");

  const MAX_CHARS = 500;
  const CHAT_STORAGE_KEY = "gameriots_chat_log";

  const welcomeMessage = {
    sender: "bot",
    text: "Welcome to GameRiots AI! Ask me anything about mouse sensitivity calibration, in-game configurations, pro settings, or strategy. How can I help you today?",
    timestamp: Date.now()
  };

  // --- Lightweight markdown renderer (bold, inline code, code blocks, line breaks) ---
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderMarkdown(text) {
    let safe = escapeHtml(text);
    // Code blocks ```...```
    safe = safe.replace(/```([\s\S]*?)```/g, (m, code) => `<pre><code>${code.trim()}</code></pre>`);
    // Inline code `...`
    safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
    // Bold **...**
    safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // Line breaks
    safe = safe.replace(/\n/g, "<br>");
    return `<p>${safe}</p>`;
  }

  function loadChatLog() {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {
      console.warn("Could not load saved chat log", e);
    }
    return [ welcomeMessage ];
  }

  function saveChatLog() {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(activeChatLog));
    } catch (e) {
      console.warn("Could not save chat log", e);
    }
  }

  let activeChatLog = loadChatLog();

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (chatMessagesContainer) {
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        setTimeout(() => {
          chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }, 50);
      }
    });
  }

  function formatTimestamp(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function renderChat() {
    if (!chatMessagesContainer) return;
    chatMessagesContainer.innerHTML = "";
    activeChatLog.forEach(msg => {
      appendMessageUI(msg.sender, msg.text, msg.timestamp);
    });
    scrollToBottom();
  }

  function appendMessageUI(sender, text, timestamp) {
    if (!chatMessagesContainer) return;

    const msgDiv = document.createElement("div");
    msgDiv.classList.add("msg", sender === "user" ? "msg-user" : "msg-bot");
    
    const avatar = document.createElement("div");
    avatar.className = sender === "user" ? "bot-avatar user-avatar" : "bot-avatar";
    avatar.innerHTML = sender === "user" ? `<i data-lucide="user"></i>` : `<i data-lucide="bot"></i>`;

    const body = document.createElement("div");
    body.className = "msg-body";

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";
    bubble.innerHTML = sender === "bot" ? renderMarkdown(text) : `<p>${escapeHtml(text)}</p>`;

    const meta = document.createElement("div");
    meta.className = "msg-meta";

    const timeSpan = document.createElement("span");
    timeSpan.className = "msg-timestamp";
    timeSpan.textContent = formatTimestamp(timestamp || Date.now());
    meta.appendChild(timeSpan);

    if (sender === "bot") {
      const actions = document.createElement("div");
      actions.className = "msg-actions";

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "msg-action-btn";
      copyBtn.title = "Copy response";
      copyBtn.innerHTML = `<i data-lucide="copy"></i>`;
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.innerHTML = `<i data-lucide="check"></i>`;
          if (typeof lucide !== 'undefined') lucide.createIcons();
          setTimeout(() => {
            copyBtn.innerHTML = `<i data-lucide="copy"></i>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
          }, 1500);
        });
      });

      const upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.className = "msg-action-btn";
      upBtn.title = "Good response";
      upBtn.innerHTML = `<i data-lucide="thumbs-up"></i>`;

      const downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.className = "msg-action-btn";
      downBtn.title = "Bad response";
      downBtn.innerHTML = `<i data-lucide="thumbs-down"></i>`;

      upBtn.addEventListener("click", () => {
        upBtn.classList.toggle("active-thumb-up");
        downBtn.classList.remove("active-thumb-down");
      });
      downBtn.addEventListener("click", () => {
        downBtn.classList.toggle("active-thumb-down");
        upBtn.classList.remove("active-thumb-up");
      });

      actions.appendChild(copyBtn);
      actions.appendChild(upBtn);
      actions.appendChild(downBtn);
      meta.appendChild(actions);
    }

    body.appendChild(bubble);
    body.appendChild(meta);

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(body);
    chatMessagesContainer.appendChild(msgDiv);
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  function simulateBotResponse(userText) {
    const userTimestamp = Date.now();
    activeChatLog.push({ sender: "user", text: userText, timestamp: userTimestamp });
    appendMessageUI("user", userText, userTimestamp);
    saveChatLog();
    scrollToBottom();

    const typingIndicatorDiv = document.createElement("div");
    typingIndicatorDiv.classList.add("msg", "msg-bot", "typing-container");
    typingIndicatorDiv.innerHTML = `
      <div class="bot-avatar"><i data-lucide="bot"></i></div>
      <div class="msg-bubble">
        <div class="typing-indicator">
          <span class="thinking-label">Riot AI is thinking</span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>
    `;
    chatMessagesContainer.appendChild(typingIndicatorDiv);
    scrollToBottom();
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    setTimeout(() => {
      const typingEl = chatMessagesContainer.querySelector(".typing-container");
      if (typingEl) {
        typingEl.remove();
      }

      let responseText = "";
      const textLower = userText.toLowerCase();

      if (textLower.includes("shroud")) {
        responseText = "Shroud's settings utilize a standard **800 DPI** profile. While it works for standard tracking, his custom mouse pad and high-end refresh setups enable swift micro-adjustments. Start with 800 DPI and 1.2 in-game sens.";
      } else if (textLower.includes("jinx") || textLower.includes("counter")) {
        responseText = "Draft telemetry suggests matching Jinx against crowd-control assassins. Assassins like **Zed** or **Kayn** completely isolate her behind frontline champions. Focus on dragons to force her out of farming zones.";
      } else if (textLower.includes("eco") || textLower.includes("tactic") || textLower.includes("cs2")) {
        responseText = "CS2 / Valorant tactician analysis: Force-buys require synchronized utility setups. Always buy a smoke + flash combo and force close-range combat around corners (e.g. banana, shower lanes, hookahs) rather than long distance aim duels.";
      } else if (textLower.includes("sens") || textLower.includes("dpi") || textLower.includes("edpi") || textLower.includes("valorant")) {
        responseText = "Based on calibration variables, we calculate that a lower sensitivity (e.g. eDPI around **240**) improves micro-tracking precision by **18%**. Try reducing your in-game sens multiplier by `0.02` increments, then test in aiming software like Aimlab.";
      } else {
        responseText = `Calibration response completed for query: "${userText}". Riot AI recommends reviewing your settings to minimize latency and input delay. Custom strategies will update hourly.`;
      }

      const botTimestamp = Date.now();
      activeChatLog.push({ sender: "bot", text: responseText, timestamp: botTimestamp });
      appendMessageUI("bot", responseText, botTimestamp);
      saveChatLog();
      scrollToBottom();

      if (voiceRepliesEnabled) {
        speakText(responseText, chatMessagesContainer.lastElementChild);
      }
    }, 1200);
  }

  function autoGrowTextarea() {
    if (!chatUserInput) return;
    chatUserInput.style.height = "auto";
    chatUserInput.style.height = Math.min(chatUserInput.scrollHeight, 140) + "px";
  }

  function updateCharCounter() {
    if (!chatUserInput || !charCounter) return;
    const len = chatUserInput.value.length;
    charCounter.textContent = `${len} / ${MAX_CHARS}`;
    charCounter.classList.toggle("char-counter-warn", len > MAX_CHARS);
  }

  if (chatUserInput) {
    chatUserInput.setAttribute("maxlength", String(MAX_CHARS));
    chatUserInput.addEventListener("input", () => {
      autoGrowTextarea();
      updateCharCounter();
    });
    chatUserInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        chatInputForm.requestSubmit();
      }
    });
    updateCharCounter();
  }

  if (chatInputForm) {
    chatInputForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const queryText = chatUserInput.value.trim();
      if (!queryText) return;
      
      chatUserInput.value = "";
      autoGrowTextarea();
      updateCharCounter();
      simulateBotResponse(queryText);
    });
  }

  if (quickPromptsContainer) {
    quickPromptsContainer.addEventListener("click", (e) => {
      const chip = e.target.closest(".prompt-chip");
      if (!chip) return;
      const promptText = chip.getAttribute("data-query");
      simulateBotResponse(promptText);
    });
  }

  // Scroll-to-bottom floating button
  if (chatMessagesContainer && btnScrollBottom) {
    chatMessagesContainer.addEventListener("scroll", () => {
      const distanceFromBottom = chatMessagesContainer.scrollHeight - chatMessagesContainer.scrollTop - chatMessagesContainer.clientHeight;
      btnScrollBottom.classList.toggle("visible", distanceFromBottom > 150);
    });
    btnScrollBottom.addEventListener("click", () => {
      scrollToBottom();
    });
  }

  // Sidebar category switching -> swaps quick prompt chips
  const categoryPrompts = {
    sensitivity: [
      { label: "Optimal Valorant eDPI", query: "Calculate optimal eDPI for 800 DPI and 0.35 Valorant sens." },
      { label: "CS2 Sens Conversion", query: "Convert my Valorant sensitivity to CS2." },
      { label: "Low Sens vs High Sens", query: "Should I play low sensitivity or high sensitivity for tracking?" }
    ],
    strategy: [
      { label: "CS2 Inferno B Eco", query: "Provide a full eco tactic for CS2 Inferno B-site." },
      { label: "Countering Jinx", query: "What is the current League of Legends counter play for Jinx?" },
      { label: "Apex Ring Positioning", query: "How should I position for the final rings in Apex Legends?" }
    ],
    meta: [
      { label: "Valorant Patch Shifts", query: "What changed in the latest Valorant patch meta?" },
      { label: "CS2 Map Pool Meta", query: "What is the current CS2 competitive map pool meta?" },
      { label: "LoL Jungle Meta", query: "What junglers are strongest in the current League of Legends meta?" }
    ],
    settings: [
      { label: "Shroud's Apex Setup", query: "Recommend custom Apex Legends settings for shroud's performance setup." },
      { label: "TenZ Valorant Config", query: "What are TenZ's Valorant crosshair and video settings?" },
      { label: "Pro CS2 Video Settings", query: "What video settings do pro CS2 players commonly use?" }
    ]
  };

  if (chatCategoryList && quickPromptsContainer) {
    chatCategoryList.addEventListener("click", (e) => {
      const btn = e.target.closest(".chat-category");
      if (!btn) return;
      chatCategoryList.querySelectorAll(".chat-category").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");

      const cat = btn.getAttribute("data-category");
      const prompts = categoryPrompts[cat] || [];
      quickPromptsContainer.innerHTML = "";
      prompts.forEach(p => {
        const chip = document.createElement("button");
        chip.className = "prompt-chip";
        chip.setAttribute("data-query", p.query);
        chip.textContent = p.label;
        quickPromptsContainer.appendChild(chip);
      });
    });
  }

  if (btnChatReset) {
    btnChatReset.addEventListener("click", () => {
      if (confirm("Are you sure you want to reset the conversation?")) {
        activeChatLog = [ welcomeMessage ];
        saveChatLog();
        renderChat();
      }
      window.speechSynthesis && window.speechSynthesis.cancel();
    });
  }

  // --- VOICE INPUT (Speech-to-Text via Web Speech API) ---
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isRecording = false;

  if (SpeechRecognitionAPI && btnMic) {
    recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.addEventListener("start", () => {
      isRecording = true;
      btnMic.classList.add("recording");
      if (micStatus) micStatus.classList.add("active");
    });

    recognition.addEventListener("result", (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      if (chatUserInput) {
        chatUserInput.value = transcript.slice(0, MAX_CHARS);
        autoGrowTextarea();
        updateCharCounter();
      }
    });

    recognition.addEventListener("end", () => {
      isRecording = false;
      btnMic.classList.remove("recording");
      if (micStatus) micStatus.classList.remove("active");
    });

    recognition.addEventListener("error", () => {
      isRecording = false;
      btnMic.classList.remove("recording");
      if (micStatus) micStatus.classList.remove("active");
    });

    btnMic.addEventListener("click", () => {
      if (isRecording) {
        recognition.stop();
      } else {
        window.speechSynthesis && window.speechSynthesis.cancel();
        try {
          recognition.start();
        } catch (e) {
          // recognition already active, ignore
        }
      }
    });
  } else if (btnMic) {
    // Browser doesn't support Speech Recognition (e.g. Firefox)
    btnMic.classList.add("unsupported");
    btnMic.title = "Voice input isn't supported in this browser (try Chrome or Edge)";
  }

  // --- VOICE REPLIES (Text-to-Speech via Web Speech API) ---
  const VOICE_PREF_KEY = "gameriots_voice_replies_enabled";
  let voiceRepliesEnabled = localStorage.getItem(VOICE_PREF_KEY) === "true";

  function stripMarkdownForSpeech(text) {
    return text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1");
  }

  function speakText(text, msgElement) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(stripMarkdownForSpeech(text));
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    if (msgElement) {
      utterance.onstart = () => msgElement.classList.add("speaking");
      utterance.onend = () => msgElement.classList.remove("speaking");
      utterance.onerror = () => msgElement.classList.remove("speaking");
    }
    window.speechSynthesis.speak(utterance);
  }

  function updateVoiceToggleUI() {
    if (!btnVoiceToggle) return;
    btnVoiceToggle.classList.toggle("active", voiceRepliesEnabled);
    btnVoiceToggle.innerHTML = voiceRepliesEnabled
      ? `<i data-lucide="volume-2"></i>`
      : `<i data-lucide="volume-x"></i>`;
    btnVoiceToggle.title = voiceRepliesEnabled ? "Voice replies: On (click to mute)" : "Voice replies: Off (click to enable)";
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  if (btnVoiceToggle) {
    if (!window.speechSynthesis) {
      btnVoiceToggle.classList.add("unsupported");
      btnVoiceToggle.style.opacity = "0.35";
      btnVoiceToggle.style.pointerEvents = "none";
      btnVoiceToggle.title = "Voice replies aren't supported in this browser";
    } else {
      updateVoiceToggleUI();
      btnVoiceToggle.addEventListener("click", () => {
        voiceRepliesEnabled = !voiceRepliesEnabled;
        localStorage.setItem(VOICE_PREF_KEY, String(voiceRepliesEnabled));
        updateVoiceToggleUI();
        if (!voiceRepliesEnabled) {
          window.speechSynthesis.cancel();
        }
      });
    }
  }

  renderChat();



  // Bento game coverage tab selector
  const gameTabs = document.querySelectorAll(".game-tab");
  const gameName = document.getElementById("game-name");
  const gameStats = document.getElementById("game-stats");

  const gameProfileDetails = {
    val: {
      name: "Valorant Profile",
      desc: "Precision recoil settings, active lineup maps, agent cooldown charts, and counter-strats updated 10 minutes ago."
    },
    cs2: {
      name: "CS2 Profile",
      desc: "Instant tickrate analytics, grenade path alignments, economy schedules, and spray calibration guides."
    },
    apex: {
      name: "Apex Legends Profile",
      desc: "Sensitivity configurations, tracking indexes, recoil smoothing drills, and active champion meta details."
    },
    lol: {
      name: "League of Legends Profile",
      desc: "Lanes wave state tracking, creep score efficiency rates, draft recommendation arrays, and build optimization guidelines."
    }
  };

  gameTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      gameTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const gameKey = tab.getAttribute("data-game");
      
      if (gameProfileDetails[gameKey]) {
        gameName.textContent = gameProfileDetails[gameKey].name;
        gameStats.textContent = gameProfileDetails[gameKey].desc;
      }
    });
  });


  // --- YOUTUBE HUB MEDIA GRID ---
  const videosList = [
    {
      title: "TenZ Valorant Aim Routine: 2026 Edition Guide",
      duration: "12:45",
      category: "sensitivity",
      recom: "Matches Aim accuracy data"
    },
    {
      title: "CS2 Inferno Utility Lineups: Full Site Smokes",
      duration: "08:12",
      category: "tutorials",
      recom: "Calibrated to Inferno Eco round logs"
    },
    {
      title: "Faker LoL Midlane Control Walkthrough Analysis",
      duration: "22:10",
      category: "analysis",
      recom: "Recommended for Midlane lane control"
    },
    {
      title: "Apex Legends Movement Guide: Tap-Strafe & Superglide",
      duration: "15:30",
      category: "tutorials",
      recom: "Recommended for Apex Movement builds"
    },
    {
      title: "Valorant Patch 10.04 Tier List & Meta Shift Review",
      duration: "19:05",
      category: "patches",
      recom: "Calibrated to active agents updates"
    },
    {
      title: "S1mple AWP Positioning Guide (CS2 Mirage)",
      duration: "14:18",
      category: "analysis",
      recom: "Recommended for Sniper stats profiles"
    }
  ];

  const videoGrid = document.getElementById("video-grid");
  const hubTabs = document.querySelectorAll(".hub-tab");

  function renderVideos(filterCat = "all") {
    if (!videoGrid) return;
    videoGrid.innerHTML = "";
    const filtered = filterCat === "all" ? videosList : videosList.filter(vid => vid.category === filterCat);
    
    filtered.forEach(vid => {
      const card = document.createElement("div");
      card.className = "video-card";
      card.innerHTML = `
        <div class="video-thumbnail-wrapper">
          <div class="play-overlay">
            <div class="play-button-circle"><i data-lucide="play" style="fill:#000000; width:16px;"></i></div>
          </div>
          <span class="video-duration">${vid.duration}</span>
          <i data-lucide="youtube" class="youtube-icon" style="width:40px; height:40px;"></i>
        </div>
        <div class="video-info">
          <div class="video-category">${vid.category}</div>
          <h4 class="video-title">${vid.title}</h4>
          <div class="ai-recommendation-tag">
            <i data-lucide="sparkles" style="width:12px; height:12px;"></i>
            <span>${vid.recom}</span>
          </div>
        </div>
      `;
      videoGrid.appendChild(card);
    });

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  hubTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      hubTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      renderVideos(tab.getAttribute("data-category"));
    });
  });

  renderVideos();


  

  // Bind Listeners
  if (calcGameSelect) calcGameSelect.addEventListener("change", updateCalibration);
  if (calcDpiRange) calcDpiRange.addEventListener("input", updateCalibration);
  if (calcSensInput) calcSensInput.addEventListener("input", updateCalibration);
  if (btnRecalibrate) {
    btnRecalibrate.addEventListener("click", () => {
      // Add a quick visual highlight animation effect
      const resultsContainer = document.querySelector(".calibration-results");
      if (resultsContainer) {
        resultsContainer.style.borderColor = "var(--accent)";
        resultsContainer.style.boxShadow = "var(--accent-glow)";
        setTimeout(() => {
          resultsContainer.style.borderColor = "var(--border-light)";
          resultsContainer.style.boxShadow = "none";
        }, 800);
      }
      updateCalibration();
    });
  }

  // Initial Calculation
  updateCalibration();


  // --- AUTH MODALS CONTROL ---
  const loginModal = document.getElementById("login-modal");
  const signupModal = document.getElementById("signup-modal");
  const btnLoginOpen = document.getElementById("btn-login-open");
  const btnSignupOpen = document.getElementById("btn-signup-open");
  const btnFooterLogin = document.getElementById("btn-footer-login");
  
  const loginClose = loginModal ? loginModal.querySelector(".modal-close") : null;
  const signupClose = signupModal ? signupModal.querySelector(".modal-close") : null;
  
  const switchToSignup = document.getElementById("link-switch-to-signup");
  const switchToLogin = document.getElementById("link-switch-to-login");

  if (btnLoginOpen && loginModal) {
    btnLoginOpen.addEventListener("click", () => {
      loginModal.classList.add("active");
    });
  }

  if (btnSignupOpen && signupModal) {
    btnSignupOpen.addEventListener("click", () => {
      signupModal.classList.add("active");
    });
  }

  if (btnFooterLogin && loginModal) {
    btnFooterLogin.addEventListener("click", (e) => {
      e.preventDefault();
      loginModal.classList.add("active");
    });
  }

  if (loginClose && loginModal) {
    loginClose.addEventListener("click", () => {
      loginModal.classList.remove("active");
    });
  }

  if (signupClose && signupModal) {
    signupClose.addEventListener("click", () => {
      signupModal.classList.remove("active");
    });
  }

  if (switchToSignup && loginModal && signupModal) {
    switchToSignup.addEventListener("click", (e) => {
      e.preventDefault();
      loginModal.classList.remove("active");
      signupModal.classList.add("active");
    });
  }

  if (switchToLogin && loginModal && signupModal) {
    switchToLogin.addEventListener("click", (e) => {
      e.preventDefault();
      signupModal.classList.remove("active");
      loginModal.classList.add("active");
    });
  }

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Authorization sequence validated. User profile loaded.");
      if (loginModal) loginModal.classList.remove("active");
    });
  }

  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Calibration completed. Neural profile registers: Success.");
      if (signupModal) signupModal.classList.remove("active");
    });
  }
  
  window.addEventListener("click", (e) => {
    if (e.target === loginModal && loginModal) {
      loginModal.classList.remove("active");
    }
    if (e.target === signupModal && signupModal) {
      signupModal.classList.remove("active");
    }
  });
});
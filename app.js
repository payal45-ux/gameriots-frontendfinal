const API_BASE_URL = "http://localhost:5000/api";   // ← new line, standalone, top of file

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

  async function getBotReply(userText) {
    const token = localStorage.getItem("gr_token");
    if (!token) return "Please sign in first so Riot AI can save your chat history.";
    const res = await fetch(`${API_BASE_URL}/chat/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ message: userText })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Chat failed");
    return data.reply;
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
  const voiceSelect = document.getElementById("voice-select");

  const btnNewChat = document.getElementById("btn-new-chat");
  const chatHistoryList = document.getElementById("chat-history-list");

  const MAX_CHARS = 500;
  const CHAT_STORAGE_KEY = "gameriots_chat_log";
  const CHAT_SESSIONS_KEY = "gameriots_chat_sessions";

  const welcomeMessage = {
    sender: "bot",
    text: "Welcome to GameRiots AI! Ask me anything about mouse sensitivity calibration, in-game configurations, pro settings, or strategy. How can I help you today?",
    timestamp: Date.now()
  };

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderMarkdown(text) {
    let safe = escapeHtml(text);
    safe = safe.replace(/```([\s\S]*?)```/g, (m, code) => `<pre><code>${code.trim()}</code></pre>`);
    safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
    safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
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
    return [welcomeMessage];
  }

  function saveChatLog() {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(activeChatLog));
    } catch (e) {
      console.warn("Could not save chat log", e);
    }
  }

  let activeChatLog = loadChatLog();

  // --- CHAT SESSIONS / HISTORY ---
  function loadSessions() {
    try {
      const saved = localStorage.getItem(CHAT_SESSIONS_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveSessions() {
    try {
      localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(chatSessions));
    } catch (e) {
      console.warn("Could not save chat sessions", e);
    }
  }

  let chatSessions = loadSessions();

  function deriveChatTitle(messages) {
    const firstUserMsg = messages.find(m => m.sender === "user");
    if (!firstUserMsg) return "New conversation";
    const text = firstUserMsg.text.trim();
    return text.length > 34 ? text.slice(0, 34) + "…" : text;
  }

  function hasRealContent(messages) {
    return messages.some(m => m.sender === "user");
  }

  // Archives the current conversation into history (only if it has real user messages)
  function archiveCurrentChat() {
    if (!hasRealContent(activeChatLog)) return;

    const existingIndex = chatSessions.findIndex(s => s.id === currentSessionId);
    const sessionData = {
      id: currentSessionId,
      title: deriveChatTitle(activeChatLog),
      messages: activeChatLog,
      timestamp: Date.now()
    };

    if (existingIndex !== -1) {
      chatSessions[existingIndex] = sessionData;
    } else {
      chatSessions.unshift(sessionData);
    }
    saveSessions();
  }

  let currentSessionId = "session_" + Date.now();

  function renderHistoryList() {
    if (!chatHistoryList) return;
    chatHistoryList.innerHTML = "";

    if (!chatSessions.length) {
      const empty = document.createElement("div");
      empty.className = "chat-history-empty";
      empty.style.cssText = "padding:12px; opacity:0.5; font-size:0.85rem;";
      empty.textContent = "No past conversations yet.";
      chatHistoryList.appendChild(empty);
      return;
    }

    const sorted = [...chatSessions].sort((a, b) => b.timestamp - a.timestamp);
    sorted.forEach(session => {
      const item = document.createElement("div");
      item.className = "history-item";
      if (session.id === currentSessionId) item.classList.add("active");
      item.innerHTML = `
        <div class="history-item-text">
          <span class="history-item-title">${escapeHtml(session.title)}</span>
          <span class="history-item-date">${formatTimestamp(session.timestamp)}</span>
        </div>
        <button type="button" class="history-item-delete" title="Delete conversation">
          <i data-lucide="trash-2"></i>
        </button>
      `;
      item.addEventListener("click", () => {
        archiveCurrentChat();
        currentSessionId = session.id;
        activeChatLog = session.messages;
        saveChatLog();
        renderChat();
        renderHistoryList();
      });
      const deleteBtn = item.querySelector(".history-item-delete");
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        chatSessions = chatSessions.filter(s => s.id !== session.id);
        saveSessions();
        if (session.id === currentSessionId) {
          currentSessionId = "session_" + Date.now();
          activeChatLog = [welcomeMessage];
          saveChatLog();
          renderChat();
        }
        renderHistoryList();
      });
      chatHistoryList.appendChild(item);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  if (btnNewChat) {
    btnNewChat.addEventListener("click", () => {
      archiveCurrentChat();
      currentSessionId = "session_" + Date.now();
      activeChatLog = [welcomeMessage];
      saveChatLog();
      renderChat();
      renderHistoryList();
      window.speechSynthesis && window.speechSynthesis.cancel();
    });
  }

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

  async function simulateBotResponse(userText) {
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

    let responseText;
    try {
      responseText = await getBotReply(userText);
    } catch (err) {
      responseText = "Sorry, I couldn't reach Riot AI right now.";
    }

    typingIndicatorDiv.remove();

    const botTimestamp = Date.now();
    activeChatLog.push({ sender: "bot", text: responseText, timestamp: botTimestamp });
    appendMessageUI("bot", responseText, botTimestamp);
    saveChatLog();
    archiveCurrentChat();
    renderHistoryList();
    scrollToBottom();

    if (voiceRepliesEnabled) {
      speakText(responseText, chatMessagesContainer.lastElementChild);
    }
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

  if (chatMessagesContainer && btnScrollBottom) {
    chatMessagesContainer.addEventListener("scroll", () => {
      const distanceFromBottom = chatMessagesContainer.scrollHeight - chatMessagesContainer.scrollTop - chatMessagesContainer.clientHeight;
      btnScrollBottom.classList.toggle("visible", distanceFromBottom > 150);
    });
    btnScrollBottom.addEventListener("click", () => {
      scrollToBottom();
    });
  }

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
        activeChatLog = [welcomeMessage];
        saveChatLog();
        renderChat();
      }
      window.speechSynthesis && window.speechSynthesis.cancel();
    });
  }

  // --- VOICE INPUT (Speech-to-Text) ---
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
    btnMic.classList.add("unsupported");
    btnMic.title = "Voice input isn't supported in this browser (try Chrome or Edge)";
  }

  // --- VOICE REPLIES (Text-to-Speech) ---
  const VOICE_PREF_KEY = "gameriots_voice_replies_enabled";
  const VOICE_NAME_PREF_KEY = "gameriots_selected_voice_name";
  let voiceRepliesEnabled = localStorage.getItem(VOICE_PREF_KEY) === "true";
  let availableVoices = [];

  function populateVoiceList() {
    if (!voiceSelect || !window.speechSynthesis) return;
    availableVoices = window.speechSynthesis.getVoices();
    if (!availableVoices.length) return;

    const savedVoiceName = localStorage.getItem(VOICE_NAME_PREF_KEY) || "";

    voiceSelect.innerHTML = `<option value="">Default voice</option>`;
    availableVoices.forEach(voice => {
      const opt = document.createElement("option");
      opt.value = voice.name;
      opt.textContent = `${voice.name} (${voice.lang})`;
      if (voice.name === savedVoiceName) opt.selected = true;
      voiceSelect.appendChild(opt);
    });
  }

  if (voiceSelect && window.speechSynthesis) {
    populateVoiceList();
    window.speechSynthesis.addEventListener("voiceschanged", populateVoiceList);

    voiceSelect.addEventListener("change", () => {
      localStorage.setItem(VOICE_NAME_PREF_KEY, voiceSelect.value);
      if (voiceRepliesEnabled) {
        speakText("This is how I'll sound from now on.", null);
      }
    });
  } else if (voiceSelect) {
    voiceSelect.disabled = true;
  }

  function getSelectedVoice() {
    const savedVoiceName = localStorage.getItem(VOICE_NAME_PREF_KEY) || "";
    if (!savedVoiceName) return null;
    return availableVoices.find(v => v.name === savedVoiceName) || null;
  }

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
    const chosenVoice = getSelectedVoice();
    if (chosenVoice) utterance.voice = chosenVoice;
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
  renderHistoryList();

  // --- BENTO GAME COVERAGE TAB SELECTOR ---
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
  const videoGrid = document.getElementById("video-grid");
  const hubTabs = document.querySelectorAll(".hub-tab");

  async function fetchVideosFromAPI(category) {
    const categoryToQuery = {
      all: "gaming",
      sensitivity: "sensitivity settings",
      analysis: "gameplay analysis",
      tutorials: "tutorial lineups",
      patches: "patch notes update"
    };
    const query = categoryToQuery[category] || "gaming";
    const res = await fetch(`${API_BASE_URL}/videos?game=${encodeURIComponent(query)}&max=8`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load videos");
    return data.videos;
  }

  async function renderVideos(filterCat = "all") {
    if (!videoGrid) return;
    videoGrid.innerHTML = "<p style='padding:20px;'>Loading videos...</p>";

    let videos;
    try {
      videos = await fetchVideosFromAPI(filterCat);
    } catch (err) {
      videoGrid.innerHTML = "<p style='padding:20px;'>Couldn't load videos right now.</p>";
      return;
    }

    videoGrid.innerHTML = "";
    videos.forEach(vid => {
      const card = document.createElement("div");
      card.className = "video-card";
      card.innerHTML = `
        <a href="${vid.url}" target="_blank" class="video-thumbnail-wrapper" style="background-image:url('${vid.thumbnail}'); background-size:cover; background-position:center; display:block;">
          <div class="play-overlay">
            <div class="play-button-circle"><i data-lucide="play" style="fill:#000000; width:16px;"></i></div>
          </div>
        </a>
        <div class="video-info">
          <div class="video-category">${filterCat}</div>
          <h4 class="video-title">${vid.title}</h4>
          <div class="ai-recommendation-tag">
            <i data-lucide="sparkles" style="width:12px; height:12px;"></i>
            <span>${vid.channel}</span>
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
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;
      try {
        const res = await fetch(`${API_BASE_URL}/users/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login failed");
        localStorage.setItem("gr_token", data.token);
        localStorage.setItem("gr_user", JSON.stringify(data.user));
        updateAuthUI();
        alert(`Welcome back, ${data.user.username}!`);
        loginModal.classList.remove("active");
      } catch (err) {
        alert(err.message);
      }
    });
  }

  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("signup-username").value;
      const email = document.getElementById("signup-email").value;
      const password = document.getElementById("signup-password").value;
      try {
        const res = await fetch(`${API_BASE_URL}/users/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Signup failed");
        localStorage.setItem("gr_token", data.token);
        localStorage.setItem("gr_user", JSON.stringify(data.user));
        updateAuthUI();
        alert(`Account created! Welcome, ${data.user.username}.`);
        signupModal.classList.remove("active");
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // --- USER PROFILE MENU / LOGOUT ---
  const navActionsGuest = document.getElementById("nav-actions-guest");
  const navActionsUser = document.getElementById("nav-actions-user");
  const btnProfileToggle = document.getElementById("btn-profile-toggle");
  const userProfileDropdown = document.getElementById("user-profile-dropdown");
  const userProfileName = document.getElementById("user-profile-name");
  const userAvatarInitial = document.getElementById("user-avatar-initial");
  const btnLogout = document.getElementById("btn-logout");

  function updateAuthUI() {
    const token = localStorage.getItem("gr_token");
    const userRaw = localStorage.getItem("gr_user");
    const user = userRaw ? JSON.parse(userRaw) : null;

    if (token && user) {
      if (navActionsGuest) navActionsGuest.style.display = "none";
      if (navActionsUser) navActionsUser.style.display = "flex";
      if (userProfileName) userProfileName.textContent = user.username || "Player";
      if (userAvatarInitial) userAvatarInitial.textContent = (user.username || "P").charAt(0).toUpperCase();
    } else {
      if (navActionsGuest) navActionsGuest.style.display = "flex";
      if (navActionsUser) navActionsUser.style.display = "none";
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  if (btnProfileToggle && userProfileDropdown) {
    btnProfileToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      userProfileDropdown.classList.toggle("open");
    });
    window.addEventListener("click", () => {
      userProfileDropdown.classList.remove("open");
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("gr_token");
      localStorage.removeItem("gr_user");
      updateAuthUI();
      if (userProfileDropdown) userProfileDropdown.classList.remove("open");
    });
  }

  updateAuthUI();

  window.addEventListener("click", (e) => {
    if (e.target === loginModal && loginModal) {
      loginModal.classList.remove("active");
    }
    if (e.target === signupModal && signupModal) {
      signupModal.classList.remove("active");
    }
  });

  // ============================================================
  // --- GOOGLE SIGN-IN ---
  // ============================================================
  const GOOGLE_CLIENT_ID = "826899927132-hh7a7n7o48g91cb6sh8cj28jt3qrsvas.apps.googleusercontent.com";

  async function handleGoogleCredential(response) {
    try {
      const res = await fetch(`${API_BASE_URL}/users/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Google sign-in failed");

      localStorage.setItem("gr_token", data.token);
      localStorage.setItem("gr_user", JSON.stringify(data.user));
      updateAuthUI();

      if (loginModal) loginModal.classList.remove("active");
      if (signupModal) signupModal.classList.remove("active");

      alert(`Signed in as ${data.user.username}!`);
    } catch (err) {
      alert(err.message);
    }
  }

  function initGoogleSignIn() {
    if (typeof google === "undefined" || !google.accounts || !google.accounts.id) {
      setTimeout(initGoogleSignIn, 300);
      return;
    }

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential
    });

    const loginContainer = document.getElementById("google-btn-container-login");
    const signupContainer = document.getElementById("google-btn-container-signup");

    if (loginContainer) {
      google.accounts.id.renderButton(loginContainer, {
        theme: "outline",
        size: "large",
        width: 300
      });
    }
    if (signupContainer) {
      google.accounts.id.renderButton(signupContainer, {
        theme: "outline",
        size: "large",
        width: 300
      });
    }
  }

  initGoogleSignIn();

  const btnGoogleLogin = document.getElementById("btn-google-login");
  if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener("click", () => {
      const realBtn = document.querySelector("#google-btn-container-login div[role=button]");
      if (realBtn) {
        realBtn.click();
      } else {
        alert("Google Sign-In is still loading — please try again in a moment.");
      }
    });
  }

  const btnGoogleSignup = document.getElementById("btn-google-signup");
  if (btnGoogleSignup) {
    btnGoogleSignup.addEventListener("click", () => {
      const realBtn = document.querySelector("#google-btn-container-signup div[role=button]");
      if (realBtn) {
        realBtn.click();
      } else {
        alert("Google Sign-In is still loading — please try again in a moment.");
      }
    });
  }

});
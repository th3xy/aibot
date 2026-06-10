// Neuron Background
const canvas = document.getElementById("neuron-bg");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const neurons = [];
const neuronCount = 50;

for (let i=0;i<neuronCount;i++){
  neurons.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random()-0.5)*0.5,
    vy: (Math.random()-0.5)*0.5
  });
}

function drawNeurons(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (let n of neurons){
    ctx.beginPath();
    ctx.arc(n.x,n.y,2,0,Math.PI*2);
    ctx.fillStyle="rgba(0,255,153,0.5)";
    ctx.fill();
    for (let o of neurons){
      const dx=o.x-n.x, dy=o.y-n.y, dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<100){
        ctx.beginPath();
        ctx.moveTo(n.x,n.y);
        ctx.lineTo(o.x,o.y);
        ctx.strokeStyle="rgba(0,255,153,"+(1-dist/100)*0.2+")";
        ctx.stroke();
      }
    }
  }
  for (let n of neurons){
    n.x += n.vx; n.y += n.vy;
    if(n.x<0||n.x>canvas.width) n.vx*=-1;
    if(n.y<0||n.y>canvas.height) n.vy*=-1;
  }
  requestAnimationFrame(drawNeurons);
}
drawNeurons();

// ================= Existing Chatbot Scripts =================

const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");
const suggestions = document.querySelector(".suggestions");

const GEMINI_API_KEY = "AQ.Ab8RN6IDCfCzlWBL66wl40g1nEtmfuLB-I3bFcAKudmTlpaPJg";
const NEWS_API_KEY = "baf4e2ba58c24910b913b53cdad4f5bb";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

let controller, typingInterval;
let chatHistory = [];
const userData = { message: "", file: {} };

document.body.classList.toggle("light-theme", localStorage.getItem("themeColor") === "light_mode");
themeToggleBtn.textContent = document.body.classList.contains("light-theme") ? "dark_mode" : "light_mode";

window.addEventListener("load", () => {
  const savedChats = localStorage.getItem("chatHistory");
  if (savedChats) {
    chatHistory = JSON.parse(savedChats);
    renderChatHistory();
  }
  suggestions.style.display = chatHistory.length === 0 ? "flex" : "none";
});

const saveChatHistory = () => localStorage.setItem("chatHistory", JSON.stringify(chatHistory));

const renderChatHistory = () => {
  chatsContainer.innerHTML = "";
  chatHistory.forEach(chat => {
    if (chat.role === "user") {
      const filePart = chat.parts[1]?.inline_data;
      const userMsg = `<p class="message-text">${chat.parts[0].text}</p>` +
        (filePart ? `<img src="data:${filePart.mime_type};base64,${filePart.data}" class="img-attachment" />` : "");
      chatsContainer.appendChild(createMessageElement(userMsg, "user-message"));
    } else if (chat.role === "model") {
      const botMsg = `<img class="avatar" src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png" />
        <p class="message-text">${chat.parts[0].text}</p>`;
      chatsContainer.appendChild(createMessageElement(botMsg, "bot-message"));
    }
  });
  scrollToBottom();
};

const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

const scrollToBottom = () => {
  container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
};

const typingEffect = (text, element, wrapper) => {
  element.textContent = "";
  const words = text.split(" ");
  let i = 0;
  typingInterval = setInterval(() => {
    if (i < words.length) {
      element.textContent += (i === 0 ? "" : " ") + words[i++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      wrapper.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 40);
};

const isNewsQuery = (text) => {
  const keywords = ["latest news", "breaking news", "today's news", "top headlines", "world news", "international news"];
  return keywords.some(k => text.toLowerCase().includes(k));
};

const fetchNews = async () => {
  const res = await fetch(`https://newsapi.org/v2/top-headlines?country=us&pageSize=3&apiKey=${NEWS_API_KEY}`);
  const data = await res.json();
  return data.articles?.map(i => `📰 ${i.title}\n🔗 ${i.url}\n${i.description}`).join("\n\n") || "No news found.";
};

const generateResponse = async (botDiv) => {
  const textEl = botDiv.querySelector(".message-text");
  controller = new AbortController();

  chatHistory.push({
    role: "user",
    parts: [
      { text: userData.message },
      ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])
    ]
  });

  try {
    let result;

    if (isNewsQuery(userData.message)) {
      result = await fetchNews();
    } else {
      const res = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: chatHistory }),
        signal: controller.signal
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error.message);
      result = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
    }

    typingEffect(result, textEl, botDiv);
    chatHistory.push({ role: "model", parts: [{ text: result }] });
    saveChatHistory();
  } catch (err) {
    textEl.textContent = err.name === "AbortError" ? "⛔ Response generation stopped." : err.message;
    textEl.style.color = "#d62939";
    botDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
    scrollToBottom();
  } finally {
    userData.file = {};
  }
};

const handleFormSubmit = (e) => {
  e.preventDefault();
  const msg = promptInput.value.trim();
  if (!msg || document.body.classList.contains("bot-responding")) return;

  const keywords = ["rohan", "safayed", "synaturix", "founder of synaturix", "রোহান", "ছাফায়েদ আহমেদ রোহান"];
  const isAbout = keywords.some(word => msg.toLowerCase().includes(word));

  if (isAbout) {
    const about = `👋 Safayed Ahmed Rohan —

🧠 Creator & Founder of SYNATURIX.
💻 Passionate about AI, Web Development, and learning new things.
📍 From: Bangladesh
🌐 Facebook: https://www.facebook.com/rohan.Oppenheimer
📸 Instagram: https://www.instagram.com/rohan.thex
📅 Created: 2025`;

    chatsContainer.appendChild(createMessageElement(`<p class="message-text">${msg}</p>`, "user-message"));

    const botHTML = `<img class="avatar" src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png" />
      <p class="message-text">Just a sec...</p>`;
    const botDiv = createMessageElement(botHTML, "bot-message", "loading");
    chatsContainer.appendChild(botDiv);
    scrollToBottom();

    setTimeout(() => {
      typingEffect(about, botDiv.querySelector(".message-text"), botDiv);
    }, 800);

    promptInput.value = "";
    return;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  userData.message = `Current date: ${dateStr}\nCurrent time: ${timeStr}\n\nUser input: ${msg}`;
  promptInput.value = "";

  document.body.classList.add("chats-active", "bot-responding");
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");

  const userHTML = `<p class="message-text">${msg}</p>` +
    (userData.file.data
      ? userData.file.isImage
        ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />`
        : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`
      : "");

  chatsContainer.appendChild(createMessageElement(userHTML, "user-message"));
  chatHistory.push({ role: "user", parts: [{ text: msg }] });
  suggestions.style.display = "none";

  setTimeout(() => {
    const botHTML = `<img class="avatar" src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png" />
      <p class="message-text">Just a sec...</p>`;
    const botDiv = createMessageElement(botHTML, "bot-message", "loading");
    chatsContainer.appendChild(botDiv);
    scrollToBottom();
    generateResponse(botDiv);
  }, 600);
};

promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.onload = (e) => {
    fileInput.value = "";
    const base64 = e.target.result.split(",")[1];
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");
    userData.file = { fileName: file.name, data: base64, mime_type: file.type, isImage };
  };
  reader.readAsDataURL(file);
});

document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
});

document.querySelector("#stop-response-btn").addEventListener("click", () => {
  controller?.abort();
  userData.file = {};
  clearInterval(typingInterval);
  document.querySelector(".bot-message.loading")?.classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

themeToggleBtn.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLight ? "light_mode" : "dark_mode");
  themeToggleBtn.textContent = isLight ? "dark_mode" : "light_mode";
});

document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatHistory = [];
  localStorage.removeItem("chatHistory");
  chatsContainer.innerHTML = "";
  document.body.classList.remove("chats-active", "bot-responding");
  suggestions.style.display = "flex";
});

document.querySelectorAll(".suggestions-item").forEach((item) => {
  item.addEventListener("click", () => {
    promptInput.value = item.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  });
});

document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  const inputClicked = target.classList.contains("prompt-input");
  const hiddenControls = wrapper.classList.contains("hide-controls");
  const isClickAllowed = target.id === "add-file-btn" || target.id === "stop-response-btn";
  wrapper.classList.toggle("hide-controls", inputClicked || (hiddenControls && isClickAllowed));
});
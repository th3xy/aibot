// SYNATURIX Chatbot Scripts.js with Custom About Info

const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");
const suggestions = document.querySelector(".suggestions");

const API_KEY = "AIzaSyAqOt4CDfr0lrkxSDl20HKgYWJ0uHHS7rE";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let controller, typingInterval;
let chatHistory = [];
const userData = { message: "", file: {} };

const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

const loadChatHistory = () => {
  const savedChats = localStorage.getItem("chatHistory");
  if (savedChats) {
    chatHistory = JSON.parse(savedChats);
    renderChatHistory();
  }
  toggleSuggestions();
};

const saveChatHistory = () => {
  localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
};

const toggleSuggestions = () => {
  suggestions.style.display = chatHistory.length === 0 ? "flex" : "none";
};

const renderChatHistory = () => {
  chatsContainer.innerHTML = "";
  chatHistory.forEach((chat) => {
    if (chat.role === "user") {
      const userMsgHTML = `<p class="message-text">${chat.parts[0].text}</p>
        ${chat.parts[1]?.inline_data ? `<img src="data:${chat.parts[1].inline_data.mime_type};base64,${chat.parts[1].inline_data.data}" class="img-attachment" />` : ""}`;
      const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
      chatsContainer.appendChild(userMsgDiv);
    } else if (chat.role === "model") {
      const botMsgHTML = `<img class="avatar" src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png" /> <p class="message-text">${chat.parts[0].text}</p>`;
      const botMsgDiv = createMessageElement(botMsgHTML, "bot-message");
      chatsContainer.appendChild(botMsgDiv);
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
  const isScrolledToBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
  if (isScrolledToBottom) {
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }
};

const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let wordIndex = 0;

  typingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 40);
};

const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();

  chatHistory.push({
    role: "user",
    parts: [
      { text: userData.message },
      ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])
    ],
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
    typingEffect(responseText, textElement, botMsgDiv);

    chatHistory.push({ role: "model", parts: [{ text: responseText }] });
    saveChatHistory();
  } catch (error) {
    textElement.textContent = error.name === "AbortError" ? "Response generation stopped." : error.message;
    textElement.style.color = "#d62939";
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
    scrollToBottom();
  } finally {
    userData.file = {};
  }
};

const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;

  const lowerCaseMessage = userMessage.toLowerCase();
  const isAboutMe = lowerCaseMessage.includes("rohan") || lowerCaseMessage.includes("safayed") || lowerCaseMessage.includes("synaturix") || lowerCaseMessage.includes("founder");

  if (isAboutMe) {
    const aboutMeText = `👋 I'm Safayed Ahmed Rohan —

🧠 Creator & Founder of SYNATURIX.
💻 Passionate about AI, Web Development, and learning new things.
📍 From: Bangladesh
🌐 Facebook: https://www.facebook.com/rohan.Oppenheimer
📸 Instagram: https://www.instagram.com/rohan.thex
📅 Created: 2025`;

    const userMsgDiv = createMessageElement(`<p class="message-text">${userMessage}</p>`, "user-message");
    chatsContainer.appendChild(userMsgDiv);

    const botMsgDiv = createMessageElement(
      `<img class="avatar" src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png" /> <p class="message-text">${aboutMeText}</p>`,
      "bot-message"
    );
    chatsContainer.appendChild(botMsgDiv);

    promptInput.value = "";
    scrollToBottom();
    return;
  }

  userData.message = userMessage;
  promptInput.value = "";
  document.body.classList.add("chats-active", "bot-responding");
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");

  const userMsgHTML = `<p class="message-text"></p>
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}`;

  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userData.message;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  chatHistory.push({ role: "user", parts: [{ text: userData.message }] });
  toggleSuggestions();

  setTimeout(() => {
    const botMsgHTML = `<img class="avatar" src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png" /> <p class="message-text">Just a sec...</p>`;
    const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600);
};

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1];
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");
    userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
  };
});

document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
});

document.querySelector("#stop-response-btn").addEventListener("click", () => {
  controller?.abort();
  userData.file = {};
  clearInterval(typingInterval);
  chatsContainer.querySelector(".bot-message.loading")?.classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

themeToggleBtn.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatHistory = [];
  localStorage.removeItem("chatHistory");
  chatsContainer.innerHTML = "";
  document.body.classList.remove("chats-active", "bot-responding");
  toggleSuggestions();
});

document.querySelectorAll(".suggestions-item").forEach((suggestion) => {
  suggestion.addEventListener("click", () => {
    promptInput.value = suggestion.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  });
});

document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  const shouldHide = target.classList.contains("prompt-input") ||
    (wrapper.classList.contains("hide-controls") &&
      (target.id === "add-file-btn" || target.id === "stop-response-btn"));
  wrapper.classList.toggle("hide-controls", shouldHide);
});

promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());

window.addEventListener("load", loadChatHistory);

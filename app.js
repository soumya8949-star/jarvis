const $ = (id) => document.getElementById(id);
const dialog = $("settingsDialog");
const messages = $("messages");
let listening = false;
let recognition = null;

function getSettings() {
  return {
    backendUrl: localStorage.getItem("jarvisBackendUrl") || "",
    voiceLang: localStorage.getItem("jarvisVoiceLang") || "en-IN",
    speakReplies: localStorage.getItem("jarvisSpeakReplies") !== "false"
  };
}
function setStatus(online, label) {
  const el = $("status");
  el.classList.toggle("online", Boolean(online));
  el.lastChild.textContent = " " + label;
}
function addMessage(text, who = "bot", isError = false) {
  const div = document.createElement("div");
  div.className = `bubble ${who}${isError ? " error" : ""}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}
function speak(text) {
  const s = getSettings();
  if (!s.speakReplies || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = s.voiceLang;
  window.speechSynthesis.speak(utterance);
}
function openSettings() {
  const s = getSettings();
  $("backendUrl").value = s.backendUrl;
  $("voiceLang").value = s.voiceLang;
  $("speakReplies").checked = s.speakReplies;
  $("settingsMessage").textContent = "";
  dialog.showModal();
}
$("settingsBtn").addEventListener("click", openSettings);
$("navSettings").addEventListener("click", openSettings);
$("closeSettings").addEventListener("click", () => dialog.close());
$("settingsForm").addEventListener("submit", (event) => {
  event.preventDefault();
  localStorage.setItem("jarvisBackendUrl", $("backendUrl").value.trim().replace(/\/+$/, ""));
  localStorage.setItem("jarvisVoiceLang", $("voiceLang").value);
  localStorage.setItem("jarvisSpeakReplies", String($("speakReplies").checked));
  $("settingsMessage").textContent = "Settings saved on this device.";
  dialog.close();
});
async function testBackend() {
  const url = $("backendUrl").value.trim().replace(/\/+$/, "");
  $("settingsMessage").textContent = "Testing connection…";
  if (!url) { $("settingsMessage").textContent = "Paste your deployed backend URL first."; return; }
  try {
    const response = await fetch(url + "/health");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    $("settingsMessage").textContent = data.configured
      ? "Backend is online and API key is configured."
      : "Backend is online, but GROQ_API_KEY is missing on the server.";
  } catch (err) {
    $("settingsMessage").textContent = `Connection failed: ${err.message}. Check URL, deployment, and CORS.`;
  }
}
$("testBackend").addEventListener("click", testBackend);

async function sendMessage(text) {
  const message = text.trim();
  if (!message) return;
  const settings = getSettings();
  if (!settings.backendUrl) {
    addMessage("Open Settings and enter your deployed JARVIS backend URL first.", "bot", true);
    openSettings();
    return;
  }
  addMessage(message, "user");
  $("messageInput").value = "";
  $("busy").textContent = " • THINKING";
  setStatus(true, "PROCESSING");
  try {
    const response = await fetch(settings.backendUrl + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, lang: settings.voiceLang })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    if (!data.reply) throw new Error("Backend response did not contain a reply.");
    addMessage(data.reply, "bot");
    speak(data.reply);
    setStatus(true, "ONLINE");
  } catch (err) {
    addMessage(`Connection error: ${err.message}\nCheck your backend URL and make sure the backend is deployed.`, "bot", true);
    setStatus(false, "CONNECTION ERROR");
  } finally {
    $("busy").textContent = "";
  }
}
$("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage($("messageInput").value);
});
document.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => sendMessage(button.dataset.prompt)));

function setupRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const r = new SpeechRecognition();
  r.continuous = false;
  r.interimResults = false;
  r.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript || "";
    if (text) sendMessage(text);
  };
  r.onerror = (event) => {
    addMessage(`Voice input error: ${event.error}. You can type your message instead.`, "bot", true);
    stopListening();
  };
  r.onend = stopListening;
  return r;
}
function stopListening() {
  listening = false;
  $("micBtn").classList.remove("listening");
}
$("micBtn").addEventListener("click", () => {
  if (listening) { recognition?.stop(); stopListening(); return; }
  recognition = setupRecognition();
  if (!recognition) {
    addMessage("Voice recognition is not supported in this browser. Try Chrome on Android or type your message.", "bot", true);
    return;
  }
  recognition.lang = getSettings().voiceLang;
  try {
    listening = true;
    $("micBtn").classList.add("listening");
    recognition.start();
    addMessage("Listening… speak now.", "bot");
  } catch {
    stopListening();
    addMessage("Could not start microphone. Check browser microphone permission.", "bot", true);
  }
});

fetch("/health").then(r => r.json()).then(() => setStatus(false, "BACKEND APP SERVER ONLY")).catch(() => setStatus(false, "BACKEND NOT CONNECTED"));

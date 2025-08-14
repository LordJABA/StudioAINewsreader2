
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// --- Gemini API Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Interfaces ---
interface Article {
  id: string;
  title: string;
  content: string;
  source: string; // URL for fetched, "Pasted Text" for manual
  summary?: string;
  isSummarizing?: boolean;
}

interface BackendSettings {
    url: string;
    key: string;
}

// --- State ---
let articles: Article[] = [];
let backendSettings: BackendSettings | null = null;

// --- DOM Elements ---
const addUrlForm = document.getElementById('add-url-form') as HTMLFormElement;
const sourceUrlInput = document.getElementById('source-url') as HTMLInputElement;
const addUrlBtn = document.getElementById('add-url-btn') as HTMLButtonElement;

const addTextForm = document.getElementById('add-text-form') as HTMLFormElement;
const articleTitleInput = document.getElementById('article-title') as HTMLInputElement;
const articleTextInput = document.getElementById('article-text') as HTMLTextAreaElement;

const articlesGrid = document.getElementById('articles-grid') as HTMLDivElement;

const tabUrl = document.getElementById('tab-url') as HTMLButtonElement;
const tabText = document.getElementById('tab-text') as HTMLButtonElement;
const panelUrl = document.getElementById('panel-url') as HTMLDivElement;
const panelText = document.getElementById('panel-text') as HTMLDivElement;

// Settings Modal Elements
const settingsModal = document.getElementById('settings-modal') as HTMLDivElement;
const openSettingsBtn = document.getElementById('open-settings-btn') as HTMLButtonElement;
const closeSettingsBtn = document.getElementById('close-settings-btn') as HTMLButtonElement;
const settingsForm = document.getElementById('settings-form') as HTMLFormElement;
const backendUrlInput = document.getElementById('backend-url') as HTMLInputElement;
const backendKeyInput = document.getElementById('backend-key') as HTMLInputElement;


// --- Functions ---

function render() {
  renderArticles();
}

function renderArticles() {
  articlesGrid.innerHTML = '';
  if (articles.length === 0) {
    articlesGrid.innerHTML = '<p>No articles to display. Add content using the forms above to get started.</p>';
    return;
  }
  articles.forEach(article => {
    const articleCard = document.createElement('div');
    articleCard.className = 'article-card';
    articleCard.setAttribute('data-id', article.id);

    let summaryHTML = '';
    if (article.summary) {
        summaryHTML = `
            <div class="article-summary">
                <h5>AI Summary</h5>
                <p>${article.summary.replace(/\n/g, '<br>')}</p>
            </div>
        `;
    }

    let actionsHTML = '';
    if (article.isSummarizing) {
        actionsHTML = `<div class="loader"></div> <span>Summarizing...</span>`;
    } else if (!article.summary) {
        actionsHTML = `<button class="summarize-btn" data-id="${article.id}">Summarize</button>`;
    }
    
    articleCard.innerHTML = `
      <h4>${article.title}</h4>
      <p>${article.content}</p>
      ${summaryHTML}
      <div class="article-actions">
        ${actionsHTML}
      </div>
      <div class="article-card-footer">
        <span>Source: ${article.source}</span>
        <button class="remove-article-btn" data-id="${article.id}" aria-label="Remove article">Remove</button>
      </div>
    `;
    articlesGrid.appendChild(articleCard);
  });
}

async function handleSummarize(articleId: string) {
    const article = articles.find(a => a.id === articleId);
    if (!article || article.isSummarizing) return;

    article.isSummarizing = true;
    renderArticles();

    try {
        const prompt = `Summarize the following article in a concise paragraph:\n\n---\n\nTitle: ${article.title}\n\n${article.content}`;
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        article.summary = response.text.trim();

    } catch (error) {
        console.error("Error summarizing article:", error);
        alert("Could not summarize the article. Please check the console for details.");
    } finally {
        article.isSummarizing = false;
        saveState();
        renderArticles();
    }
}

async function fetchArticleFromBackend(url: string) {
    if (!backendSettings?.url || !backendSettings?.key) {
        alert("Backend settings are not configured. Please configure them first.");
        openSettingsModal();
        return;
    }

    addUrlBtn.disabled = true;
    addUrlBtn.innerHTML = '<div class="loader"></div><span>Fetching...</span>';
    
    try {
        const fetchUrl = new URL(backendSettings.url);
        fetchUrl.pathname = '/fetch-url';
        fetchUrl.searchParams.set('url', url);

        const response = await fetch(fetchUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${backendSettings.key}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to fetch with status: ${response.status}`);
        }

        const data = await response.json();
        
        const newArticle: Article = {
            id: `url-${Date.now()}`,
            title: data.title,
            content: data.content,
            source: url,
        };
        addArticle(newArticle);
        sourceUrlInput.value = '';

    } catch (error) {
        console.error("Error fetching article from backend:", error);
        alert(`Could not fetch the article: ${error.message}`);
    } finally {
        addUrlBtn.disabled = false;
        addUrlBtn.innerHTML = 'Fetch Article';
    }
}


function addArticle(article: Article) {
    articles.unshift(article);
    saveState();
    render();
}

function removeArticle(articleId: string) {
    articles = articles.filter(a => a.id !== articleId);
    saveState();
    render();
}

function saveState() {
  localStorage.setItem('newsreader-articles', JSON.stringify(articles));
  if (backendSettings) {
    localStorage.setItem('newsreader-backend-settings', JSON.stringify(backendSettings));
  }
}

function loadState() {
  const savedArticles = localStorage.getItem('newsreader-articles');
  if(savedArticles) {
    articles = JSON.parse(savedArticles).map((a: Article) => ({...a, isSummarizing: false}));
  }

  const savedSettings = localStorage.getItem('newsreader-backend-settings');
  if (savedSettings) {
    backendSettings = JSON.parse(savedSettings);
    backendUrlInput.value = backendSettings.url;
    backendKeyInput.value = backendSettings.key;
  }
}

// --- Settings Modal Logic ---
function openSettingsModal() {
    settingsModal.style.display = 'flex';
}
function closeSettingsModal() {
    settingsModal.style.display = 'none';
}
function saveSettings(e: Event) {
    e.preventDefault();
    backendSettings = {
        url: backendUrlInput.value.trim(),
        key: backendKeyInput.value.trim(),
    };
    saveState();
    closeSettingsModal();
    alert("Settings saved successfully.");
}

// --- Event Listeners ---

// Tab switching
tabUrl.addEventListener('click', () => {
    tabUrl.classList.add('active');
    tabText.classList.remove('active');
    panelUrl.style.display = 'block';
    panelText.style.display = 'none';
});

tabText.addEventListener('click', () => {
    tabText.classList.add('active');
    tabUrl.classList.remove('active');
    panelText.style.display = 'block';
    panelUrl.style.display = 'none';
});

// Form Submissions
addUrlForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const url = sourceUrlInput.value.trim();
  if (url) {
    try {
      new URL(url);
      fetchArticleFromBackend(url);
    } catch (_) {
      alert("Please enter a valid URL.");
    }
  }
});

addTextForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = articleTitleInput.value.trim();
    const content = articleTextInput.value.trim();
    if (title && content) {
        const newArticle: Article = {
            id: `text-${Date.now()}`,
            title,
            content,
            source: "Pasted Text"
        };
        addArticle(newArticle);
        articleTitleInput.value = '';
        articleTextInput.value = '';
    } else {
        alert("Please provide both a title and content for the article.")
    }
});

// Delegated event listener for dynamic article content
articlesGrid.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    // Find the button itself, even if a child element (like text) was clicked
    const button = target.closest('button');
    if (!button) return;

    const articleId = button.dataset.id;
    if (!articleId) return;

    if (button.classList.contains('summarize-btn')) {
        handleSummarize(articleId);
    } else if(button.classList.contains('remove-article-btn')) {
        if(confirm('Are you sure you want to remove this article?')) {
            removeArticle(articleId);
        }
    }
});

// Settings modal events
openSettingsBtn.addEventListener('click', openSettingsModal);
closeSettingsBtn.addEventListener('click', closeSettingsModal);
settingsForm.addEventListener('submit', saveSettings);
// Close modal if clicking on the overlay
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        closeSettingsModal();
    }
});


// --- Initial Load ---
function main() {
  loadState();
  render();
  if (!backendSettings) {
    setTimeout(() => {
        openSettingsModal();
    }, 500);
  }
}

main();

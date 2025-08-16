
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
  source: string; // URL for fetched article
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

const articlesGrid = document.getElementById('articles-grid') as HTMLDivElement;

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
    articlesGrid.innerHTML = '<p>No articles to display. Add a news source using the form above to get started.</p>';
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
        <span><a href="${article.source}" target="_blank" rel="noopener noreferrer">Source</a></span>
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
        const prompt = `Summarize the following web article in a concise paragraph:\n\n---\n\nTitle: ${article.title}\n\n${article.content}`;
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

async function fetchArticlesFromSource(url: string) {
    if (!backendSettings?.url || !backendSettings?.key) {
        alert("Backend settings are not configured. Please configure them first.");
        openSettingsModal();
        return;
    }

    addUrlBtn.disabled = true;
    addUrlBtn.innerHTML = '<div class="loader"></div><span>Fetching...</span>';
    
    try {
        const fetchUrl = new URL(backendSettings.url);
        fetchUrl.pathname = '/fetch-source';
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

        const data: Omit<Article, 'id'>[] = await response.json();

        const newArticles: Article[] = data.map((art, index) => ({
            ...art,
            id: `art-${Date.now()}-${index}`,
        }));
        
        addArticles(newArticles);
        sourceUrlInput.value = '';

    } catch (error) {
        console.error("Error fetching articles from source:", error);
        alert(`Could not fetch articles: ${error.message}`);
    } finally {
        addUrlBtn.disabled = false;
        addUrlBtn.textContent = 'Fetch Articles';
    }
}


function addArticles(newArticles: Article[]) {
    // Filter out articles that are already in the list based on their source URL
    const uniqueNewArticles = newArticles.filter(newArt => 
        !articles.some(existingArt => existingArt.source === newArt.source)
    );
    
    if (uniqueNewArticles.length === 0) {
        alert("No new articles found from this source.");
        return;
    }

    articles.unshift(...uniqueNewArticles);
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

// Form Submissions
addUrlForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const url = sourceUrlInput.value.trim();
  if (url) {
    try {
      new URL(url);
      fetchArticlesFromSource(url);
    } catch (_) {
      alert("Please enter a valid URL.");
    }
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

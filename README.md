
# AI-Powered Newsreader

This document outlines the vision and features for an AI-powered newsreader application. The application now uses a client-server architecture, where the frontend UI communicates with a backend Python service to fetch and parse articles from the web.

## Core Architecture

-   **Frontend:** A pure HTML/CSS/TypeScript single-page application that runs entirely in the browser. It handles the user interface, state management, and communication with the Gemini API for AI tasks.
-   **Backend:** A lightweight Python Flask server responsible for fetching article content from user-provided URLs. This is necessary to bypass browser CORS security restrictions. It is secured by a secret key.

## Core Features

-   **Add by URL:** Allows users to add articles by providing a URL. A backend service fetches and parses the article content.
-   **Add by Text:** Allows users to paste article title and text directly into the application.
-   **AI Summarization:** Integrates with the Google Gemini API to generate concise summaries of the article content.
-   **Local Persistence:** All articles and settings are saved in the browser's local storage for a persistent experience.

## Future Feature Ideas

-   **Date Filtering:** Provides options to filter news by publication date, with a default view for "Today".
-   **Automatic Categorization:** The AI will automatically sort news into relevant categories based on topics and countries.
-   **Article Quality Score:** Each article will be analyzed and given a quality score.
-   **Fact-Only Mode:** A mode to strip away filler content, opinions, and commentary, leaving only factual statements.
-   **Bias Detection:** The AI will analyze articles for political leaning, sensationalism, or promotional language and display a simple bias indicator.
-   **"Explain Like I'm a Beginner" Mode:** A feature to rewrite complex topics in simple, easy-to-understand language.
-   **Read-Aloud Feature:** Generate a natural-sounding audio version of any article or summary.

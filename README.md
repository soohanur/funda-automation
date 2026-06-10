# Data Info - Automation Platform

## Overview
Professional automation platform featuring the **Funda Property Scraper** — automated property data extraction from funda.nl with Google Sheets integration.

### Tools
- **Funda Scraper** — Collects property listings, extracts agency contacts, auto-saves to Google Sheets

### Tech Stack
- **Frontend**: Svelte 5 + TypeScript + Tailwind CSS 4
- **Backend**: FastAPI + PostgreSQL + Redis + Celery
- **Scraping**: DrissionPage (CDP) with anti-detection
- **Deployment**: Hostinger VPS, Nginx + SSL (sons.business)

### Project Structure
```
├── frontend/          # Svelte SPA
├── backend/           # FastAPI backend
├── funda/             # Funda scraper tool
├── chrome_profiles/   # Shared browser profiles
└── requirements.txt
```

### Deployment
The app runs on a Hostinger VPS at `sons.business` with:
- Nginx reverse proxy + Let's Encrypt SSL
- systemd services (datainfo-backend, datainfo-celery)
- PostgreSQL + Redis

---

## ⭐ Star this repo

If you find this project helpful, please give it a star on GitHub — it helps others discover it and motivates further development.

[![Star on GitHub](https://img.shields.io/github/stars/soohanur/real-estate-automation?style=social)](https://github.com/soohanur/real-estate-automation)

👉 [**Star this repository**](https://github.com/soohanur/real-estate-automation)

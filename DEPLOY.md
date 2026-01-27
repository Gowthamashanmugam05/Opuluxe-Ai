# 🚀 How to Deploy Opuluxe AI

## 🌟 Quickest Option: Render.com (Using Blueprint)

1.  **Push your code to GitHub** (make sure `render.yaml` is included).
2.  Go to [Render.com](https://render.com) and create an account.
3.  Click **"New +"** -> **"Blueprint"**.
4.  Connect your **GitHub repository**.
5.  Render will automatically detect the `render.yaml` configuration.
6.  Click **"Apply"**.
7.  **IMPORTANT:** Go to the dashboard for your new service, click **"Environment"**, and ensure you add your secrets:
    *   `GEMINI_API_KEY`: `AIzaSyC8eV4kZZ29OvOKkHvyHzipolS-iMAa_zs` (or your latest)
    *   `MONGODB_URI`: Your MongoDB connection string

Render will now automatically deploy your Python app, install dependencies, run migrations, and serve it live!

---

## ☁️ Alternative: Railway.app

1.  Login to [Railway.app](https://railway.app/).
2.  Click **"New Project"** -> **"Deploy from GitHub repo"**.
3.  Select your repo.
4.  Railway detects the `Procfile` automatically.
5.  Go to **Settings** -> **Variables** to add your secrets (`GEMINI_API_KEY`, etc.).
6.  It deploys automatically!

---

## 🎨 Local Development (Testing Production Setup)

To test if the production setup works locally:

1.  Set `DEBUG = False` in `config/settings.py` (temporarily).
2.  Run: `python manage.py collectstatic`
3.  Run: `gunicorn config.wsgi:application` (Linux/Mac) or `waitress-serve --port=8000 config.wsgi:application` (Windows - requires `pip install waitress`).

---

## ✅ Deployment Checklist

- [x] `whitenoise` installed & configured
- [x] `Procfile` created
- [x] `build.sh` created
- [x] `requirements.txt` up-to-date
- [x] `ALLOWED_HOSTS = ['*']`
- [ ] **GitHub Repo Public** (Start this now!)
- [ ] **Demo Video Recorded** (Do this while waiting for deploy!)

Good luck! 🚀

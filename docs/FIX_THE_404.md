# 🚑 How to Fix the "Not Found" Error on Render

The "Not Found" error usually happens because **Debug Mode is OFF** and Render is hiding the actual error (like a missing API key).

## 🛠️ Step 1: Force Render to Show the Real Error

1. Go to your **Render Dashboard**.
2. Click on your service (`opuluxe-ai`).
3. Click **Environment** on the left menu.
4. Add a new variable:
   - **Key**: `DEBUG`
   - **Value**: `True`
5. Click **Save Changes**.

Render will automatically redeploy. **Wait 2-3 minutes**, then refresh your site.

--> **You will now see a Yellow Error Page instead of "Not Found".** <--

---

## 🛠️ Step 2: Fix the Specific Error

### If you see `KeyError: 'GEMINI_API_KEY'` or `MONGODB_URI`
- You forgot to add your secrets to Render!
- Go back to **Environment** and add:
  - `GEMINI_API_KEY`: `AIzaSyC8...` (Get from your `.env` file)
  - `MONGODB_URI`: `mongodb+srv://...`
  - `MONGODB_DB_NAME`: `OpuluxeAi`

### If you see `TemplateDoesNotExist`
- The build failed to collect static files. In Render, click **Manual Deploy** -> **Clear Build Cache & Deploy**.

---

## ℹ️ About `render-mcp-server`

The [render-mcp-server](https://github.com/render-oss/render-mcp-server) repo you found is a **Go-based tool** to control Render using AI (like Claude). It is **NOT** related to your Django app's 404 error.

**(I have removed the cloned folder to avoid confusion.)**

**Focus on completing Step 1 above to fix your website!** 🚀

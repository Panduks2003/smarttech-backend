# Smart Technologies Deployment Guide

This folder contains the complete Backend + Frontend application, ready for deployment to Render.com.

## 🚀 Deployment Steps

1.  **Push to GitHub**:
    *   Initialize a git repository in this folder.
    *   Commit all files.
    *   Push to a new GitHub repository.

2.  **Create Service on Render**:
    *   Go to [Render Dashboard](https://dashboard.render.com/).
    *   Click **New +** -> **Web Service**.
    *   Connect your new GitHub repository.

3.  **Configure Settings**:
    *   **Runtime**: Node
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
    *   **Instance Type**: Free (or Starter for better performance).

## 🔑 Environment Variables

You MUST set these in the Render Dashboard (Environment tab) for the app to work:

| Variable | Value Description |
|----------|-------------------|
| `NODE_ENV` | `production` |
| `EMAIL_USER` | Your email address (e.g., info@smarttechay.com) |
| `EMAIL_PASS` | Your email password |
| `EMAIL_HOST` | SMTP Host (e.g., smtp.hostinger.com) |
| `EMAIL_PORT` | 587 |
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_ANON_KEY` | Your Supabase Anon Key |
| `GST_API_KEY` | Your GST API Key (if used) |

## 📂 Folder Structure

- `src/`: Backend API Source Code
- `build/`: Pre-built Frontend Application (Served automatically)
- `package.json`: Dependencies and Scripts

The application is configured to serve the Frontend from the `build` folder and the API from `/api`.

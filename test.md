# WhyCode — API & Database Test Data Reference

This file contains the credentials, default user accounts, mock data records, and endpoints to test the WhyCode (CodeMemory) application.

---

## 1. Local URLs
* **Frontend SPA:** `http://localhost:5173`
* **Backend API Server:** `http://localhost:5000`

---

## 2. Seeded Admin Credentials
Seeded automatically on startup via `server/utils/seedAdmin.js`:
* **Email:** `admin@codememory.com`
* **Password:** `Admin@123`
* **Role:** `admin`

---

## 3. Mock Developer Credentials (OAuth Bypass)
If you trigger the login flow using the bypass code `"mock_dev_code"`, the server creates/updates this mock developer:
* **Email:** `dev@whycode.local`
* **Password:** `Admin@123`
* **Role:** `employee`
* **GitHub Username:** `mock-12345`
* **Access Token:** `mock-token-xyz`
* **Company:** `Mock Organization` (Email: `org@whycode.local`)

---

## 4. Test User Data (Team Dashboard Tests)
Test database records used in `server/test_team.js`:
* **User ID:** `6a4493efd51e46017745c362` (Alex River)

---

## 5. Seeded Mock Commits
When a repository is simulated or connected, the system seeds the following sample commits:

| Commit Message | Author | Files Changed |
| :--- | :--- | :--- |
| `"SSO login callback refactored to check invite state"` | `alex` | `server/controllers/authController.js`, `server/routes/authRoutes.js` |
| `"Updated Redis connection pool configuration parameter"` | `sarah` | `server/config/db.js`, `server/app.js` |
| `"Checkout API payment logic modified with validation checks"` | `sk` | `server/controllers/repoController.js` |
| `"Initial app.js Express gateway setup binding"` | `alex` | `server/app.js` |

---

## 6. Essential Test API Endpoints
All protected endpoints require the header `Authorization: Bearer <JWT_TOKEN>`.

### A. Authentication
* **POST** `/api/auth/github`
  * *Body:*
    ```json
    {
      "code": "mock_dev_code"
    }
    ```
* **GET** `/api/auth/me` (Profile detail verification)

### B. Repositories & Scans
* **GET** `/api/repositories` (Fetch all connected repositories)
* **POST** `/api/scan/:repoId` (Triggers AI scanning pipeline)
* **GET** `/api/drift/:repoId` (Fetches detected documentation drift reports)

### C. Grounded AI Chat
* **POST** `/api/chat/:repoId`
  * *Body:*
    ```json
    {
      "question": "Why did we add the SSO login callback refactoring?"
    }
    ```

# CertifierFrontEnd — Certificate Generation & Verification

## 📝 Project Overview & Significance
The development of CertiFier provides significant benefits to the University of the Assumption by modernizing its administrative infrastructure and promoting environmental sustainability. By replacing traditional, resource-heavy paper processes with an automated web-based system, the institution can drastically reduce its carbon footprint and mitigate the greenhouse gas emissions associated with large-scale printing. This shift not only aligns the university with eco-friendly practices but also optimizes operational efficiency, allowing the College of Information Technology and Computer Learning Sciences faculty to bypass manual mailing and repetitive data entry through streamlined bulk generation and secure digital storage.


Furthermore, the study is highly significant for the students and the integrity of the academic credentials they receive. Through the integration of the EdDSA digital signature algorithm, the system establishes a robust security framework that ensures certificates are tamper-proof and easily verifiable, protecting the reputation of both the student and the university. Students gain the convenience of a centralized dashboard for instant access and verification of their credentials, while the institution benefits from a scalable, layered architecture that ensures data integrity. Ultimately, this research serves as a technological blueprint for other departments to transition into a more secure, efficient, and sustainable digital future.

## Tech Stack

### Frontend
- **Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Routing:** [React Router 7](https://reactrouter.com/)
- **UI Components:** [Material UI (MUI)](https://mui.com/)
- **Charts:** [MUI X Charts](https://mui.com/x/react-charts/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **HTTP Client:** [Axios](https://axios-http.com/)
- **CSV Parsing:** [PapaParse](https://www.papaparse.com/)
- **QR Code Scanning:** [jsQR](https://github.com/cozmo/jsQR)
- **Compression:** [JSZip](https://stuk.github.io/jszip/)
- **Styling:** Vanilla CSS & Emotion (via MUI)

## Quick Start

### Prerequisites
- Node.js (16+ recommended)
- npm

### Install and run locally

```bash
# from repo root
npm install
npm run dev
```

### Build for production

```bash
npm run build
# preview the production build locally
npm run preview
```

## Environment Variables

This project reads runtime configuration from Vite environment variables. Create a `.env` file in the project root for local development, or set the variables in your hosting provider.

- `VITE_API_BASE_URL` (required) — the public base URL for the backend API, e.g. `https://api.example.com`.

Example `.env` (local development):

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Deployment

### Render (Static Site)

1. Create a new **Static Site** on [Render](https://render.com/) and connect this repository.
2. **Build Command:** `npm run build`
3. **Publish Directory:** `dist`
4. **Environment Variables:** Add `VITE_API_BASE_URL` in the Render dashboard and set it to your backend URL.

Example:
```text
VITE_API_BASE_URL=https://your-backend-domain.onrender.com
```

### Important Notes

- **VITE_ prefix:** Vite only exposes env vars that start with `VITE_` to client-side code.
- **CORS:** The backend must enable CORS for the frontend origin (the Render site URL).
- **OAuth:** Ensure the backend's OAuth redirect URLs include your deployed frontend URL.

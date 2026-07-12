# CertifierFrontEnd — Certificate Generation & Verification

## 📝 Project Overview & Significance
The development of CertiFier provides significant benefits to the University of the Assumption by modernizing its administrative infrastructure and promoting environmental sustainability. By replacing traditional, resource-heavy paper processes with an automated web-based system, the institution can drastically reduce its carbon footprint and mitigate the greenhouse gas emissions associated with large-scale printing. This shift not only aligns the university with eco-friendly practices but also optimizes operational efficiency, allowing university secretaries and faculty to bypass manual mailing and repetitive data entry through streamlined bulk generation and secure digital storage.

Through the integration of the EdDSA digital signature algorithm, the system establishes a robust security framework that ensures certificates are tamper-proof and easily verifiable, protecting the reputation of both the student and the university. Students gain the convenience of a centralized dashboard for instant access and verification of their credentials, while the institution benefits from a scalable, layered architecture that ensures data integrity. Ultimately, this research serves as a technological blueprint for other departments to transition into a more secure, efficient, and sustainable digital future.

---

## 🎨 Latest Frontend Enhancements

### 1. Scoped Sub-Admin Dashboards & Layouts
- **Navigation Controls**: Permissions checking hides the User Management and Department lists for `sub_admin` users, exposing only the CSV uploads and template designer.
- **Auto-Inheritance**: The template creation page automatically detects the sub-admin's logged-in department (stored in localStorage) and hides selection controls, setting the department context read-only to CIT, SAS, etc.
- **Department Badges**: Lists of templates and certificates rendered in dashboards feature distinct visual abbreviation badges representing the academic departments (e.g. `[CIT]`, `[SAS]`, `[COA]`).

### 2. Advanced CSV Upload Guide & Helper
- **In-Memory Template Downloader**: A styled template button allows users to download a correct mock CSV file (`certificate_template.csv`) with the required columns prefilled.
- **Data Validation Notices**: The page renders an inline warning panel specifying the required headers (`title, full_name, course, issued_by, date_issued, email`) and reminding users to double check credentials before committing.
- **Friendly Filenames**: The Bulk Uploads log displays clean CSV filenames instead of raw UUID IDs by parsing the storage URL client-side.

---

## 🚀 Tech Stack

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

---

## 💻 Quick Start

### Prerequisites
- Node.js (16+ recommended)
- npm

### Install and run locally
```bash
# Install packages
npm install

# Run Vite dev server
npm run dev
```

### Build for production
```bash
# Build the production bundle into /dist
npm run build

# Preview the built production assets locally
npm run preview
```

---

## ⚙️ Environment Variables

This project reads configuration from Vite environment variables. Create a `.env` file in the project root for local development.

- `VITE_API_BASE_URL` (required) — the public base URL for your backend API.

Example `.env` (local development):
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## 🌐 Deployment on Render (Static Site)

1. Create a new **Static Site** on [Render](https://render.com/) and connect this repository.
2. **Build Command:** `npm run build`
3. **Publish Directory:** `dist`
4. **Environment Variables:** Add `VITE_API_BASE_URL` in the Render dashboard and set it to your deployed Django backend URL.

Example:
```text
VITE_API_BASE_URL=https://your-backend-domain.onrender.com
```

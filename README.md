# 🌙 NightChat - Real-Time E2E Encrypted Chat

[![Django](https://img.shields.io/badge/Django-4.2-092E20?logo=django)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![libsodium](https://img.shields.io/badge/Security-libsodium-blueviolet)](https://libsodium.gitbook.io/doc/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

NightChat is a production-grade, real-time chat application designed for privacy and scale. Built with **Django Channels** and **React**, it features end-to-end encryption (E2E) where the server only stores ciphertext.

## 🚀 Key Features

-   **Real-Time Messaging**: Instant delivery via WebSockets (Django Channels + Daphne).
-   **End-to-End Encryption**: Zero-knowledge architecture using `libsodium` (X25519 + XSalsa20-Poly1305).
-   **Private & Group Chats**: Support for 1-on-1 and group chats with up to 1,000 members.
-   **Media Sharing**: Secure file sharing with a 100MB limit per attachment.
-   **Google Integration**: OAuth2 authentication and contact syncing.
-   **High Performance**: Designed to handle ~10,000 concurrent connections with <100ms latency.
-   **Responsive Design**: A sleek, glassmorphic UI built with React and Tailwind CSS.

## 🛠️ Tech Stack

### Backend (Python/Django)
-   **Framework**: Django 4.2 LTS
-   **Real-time**: Django Channels 4.1+ (ASGI)
-   **Server**: Daphne (High-performance ASGI server)
-   **API**: Django REST Framework (DRF) + SimpleJWT
-   **Task Queue**: Celery + Redis (for background tasks like transcription)

### Frontend (React/Vite)
-   **Framework**: React 18
-   **Build Tool**: Vite
-   **State Management**: Zustand (Lightweight chat state)
-   **Crypto**: `libsodium.js` (Client-side encryption/decryption)
-   **Styling**: Tailwind CSS

### Infrastructure
-   **Database**: PostgreSQL 16 (Required for `bytea` ciphertext storage)
-   **Cache/Bus**: Redis 7.2 (Channel layers & presence management)
-   **Containerization**: Docker + Docker Compose

## 🏗️ Architecture

NightChat uses a decoupled architecture:
1.  **Client-Side**: Generates encryption keys. Plaintext never leaves the browser.
2.  **WebSocket Layer**: Daphne handles full-duplex communication.
3.  **Persistence Layer**: Django ORM stores encrypted blobs in PostgreSQL.
4.  **Task Layer**: Celery processes asynchronous jobs (e.g., media processing).

## 🚦 Getting Started

### Prerequisites
-   [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
-   [Node.js](https://nodejs.org/) (for local frontend development)
-   [Python 3.10+](https://www.python.org/) (for local backend development)

### Quick Start with Docker
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/J0KEEER/Django-Project-NightChat.git
    cd Django-Project-NightChat
    ```

2.  **Configure Environment**:
    Create a `.env` file in the root based on `.env.example`:
    ```bash
    cp .env.example .env
    ```

3.  **Run the application**:
    ```bash
    docker-compose up --build
    ```
    The backend will be available at `http://localhost:8000` and the frontend at `http://localhost:5173` (if configured).

### Manual Setup

#### Backend
```bash
cd server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

#### Frontend
```bash
cd client
npm install
npm run dev
```

## 🔒 Security Architecture

NightChat follows the **Zero Trust** principle for message content:
-   **Key Exchange**: Uses X25519 Diffie-Hellman for secure key agreement.
-   **Symmetric Encryption**: Messages are encrypted with XSalsa20-Poly1305.
-   **No Plaintext**: The Django database only sees `bytea` (binary) ciphertext and metadata.
-   **Passwords**: Hashed using **Argon2**, the strongest available hashing algorithm.

## 📁 Project Structure

```text
├── client/             # React application (Vite)
├── server/             # Django application
│   ├── apps/           # Django apps (accounts, chat, contacts)
│   ├── config/         # ASGI/WSGI/URL configurations
│   └── settings/       # Split settings (base, dev, prod)
├── docker-compose.yml  # Docker orchestration
└── GEMINI.md           # Internal project documentation
```

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
Built with ❤️ by [J0KEEER](https://github.com/J0KEEER)

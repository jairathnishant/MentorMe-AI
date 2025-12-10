# MentorMe AI

MentorMe AI is an intelligent, edge-first personal coaching application designed to analyze your workflow, posture, and environment in real-time. Whether you are working, exercising, or presenting, MentorMe provides actionable, human-like audio and visual feedback to help you improve.

## 🚀 Key Features

### 🧠 Intelligent Mentorship
- **Camera Mode**: Analyzes your posture, environment, and physical presentation.
  - *Personas*: Yoga Teacher, Debating Coach, Fashion Designer.
- **Screen Share Mode**: Acts as a "Co-Creator" to review code, designs, or gaming strategy.
  - *Personas*: Assess Media, Co-Worker, Tag-Team Player.
- **Custom Mentors**: Create your own AI persona by defining specific contexts and goals (e.g., "Strict Code Reviewer" or "Meditation Guide").

### ⚡ Real-Time Feedback
- **Edge-Simulated Analysis**: powered by Google Gemini 2.5 Flash for low-latency insights.
- **Text-to-Speech (TTS)**: The mentor "speaks" to you in real-time, allowing you to focus on your task without looking at the screen (crucial for Yoga or VR).
- **Scrolling Ticker**: A live news-ticker style feed for screen sharing sessions.
- **Structured Insights**: Distinct feedback on "What's Going Well" vs. "Needs Focus".

### 📊 Analytics & Reporting
- **Session Reports**: Detailed breakdown of every session with performance timelines (Focus, Posture, Lighting).
- **Video Playback**: Review your recorded session alongside the AI's detection log.
- **Shareable**: Export reports or share via WhatsApp/Email.
- **Local Storage**: Video data is stored locally in your browser (IndexedDB) for privacy, with metadata persisted for 15 days.

### 🔐 Privacy & Safety
- **Gmail-based Auth**: Secure onboarding with simulated OTP verification.
- **Content Moderation**: Automatically flags and blocks toxic, unsafe, or violent content in real-time.
- **Local Processing**: Data is processed statelessly; video feeds are not sent to a backend server for permanent storage by default.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **AI Model**: Google Gemini 2.5 Flash (Multimodal capabilities)
- **State/Storage**: IndexedDB (for video blobs), LocalStorage (for user profiles/metadata)
- **Charts**: Recharts
- **Icons**: Lucide React

## 🚦 Getting Started

### Prerequisites
- A valid **Google Gemini API Key**.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/mentorme-ai.git
   cd mentorme-ai
   ```

2. **Install dependencies**
   *(If running in a local Node environment)*
   ```bash
   npm install
   ```

3. **Environment Setup**
   The application requires an API Key to function. Ensure `process.env.API_KEY` is available in your build environment.

4. **Run the Application**
   ```bash
   npm start
   ```

## 📖 Usage Guide

### 1. Onboarding
- Sign up using a valid `@gmail.com` address.
- Enter the demo OTP: `123456`.
- Create your profile (First Name and Preferred Language).
  - *Supported Languages*: English, Spanish, French.

### 2. Choosing a Session
- **Camera Session**: Best for physical tasks (Yoga, Speaking).
- **Screen Share**: Best for digital tasks (Coding, Gaming, Designing).

### 3. During a Session
- **HUD**: View the recording status and live text feedback.
- **Voice Control**: Toggle the audio feedback on/off using the speaker icon.
- **Stop & Analyze**: End the session early to generate a report (Auto-stops after 15 mins).

### 4. Custom Mentors
- Click "Add Custom Mentor" on the dashboard.
- Define the **Context** (System Instruction) within 200 words.
- Define the **Goals** (What the AI should look for).
- Select supported modes (Camera/Screen).

## 🛡️ Safety Disclaimers
This application uses AI to analyze video feeds. While it is designed to be helpful:
- It is not a substitute for professional medical advice (e.g., for posture or yoga).
- Safety filters are in place to detect unsafe content, but edge cases may exist.

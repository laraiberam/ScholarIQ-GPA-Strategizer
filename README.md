# ScholarIQ - GPA Strategizer

ScholarIQ is a premium, strategic GPA planner and academic goal strategizer. It is designed to help students track their past semesters, calculate their current SGPA and cumulative CGPA, analyze their progress, and mathematically map out the future grades needed to hit their graduation GPA goals.

## Features

- **Strategic Goal Planner**: Enter your target graduation GPA and remaining credits to see the required average GPA you need to maintain from now on.
- **Feasibility Engine**: Evaluates how realistic your goals are mathematically, providing smart indicators (e.g. *Very Feasible*, *Challenging but Realistic*, *Mathematically Impossible*).
- **Academic Dashboard**: Real-time stats on your Cumulative GPA, Total Credits earned, Courses taken, and your Best Semester.
- **Performance Trend Chart**: Responsive visualization of your academic history and progress trend over time.
- **Resilient Offline Fallback**: Automatically saves and loads your semester data locally in LocalStorage if Firebase goes offline or experiences high latency, synchronizing automatically when connection is restored.
- **Semester Log**: A reverse-chronological ledger listing all courses, credits, and SGPA calculations per semester.

## Technology Stack

- **Core Structure**: HTML5 Semantic Markup
- **Styling System**: Tailwind CSS (loaded via CDN) & Vanilla CSS for animations and custom scrollbars
- **Charts & Graphics**: Chart.js for data visualization
- **Cloud Database & Auth**: Firebase Firestore & Firebase Anonymous Auth
- **Client Storage**: HTML5 LocalStorage API for offline resilience

## Project Structure

```
ScholarIQ/
│
├── index.html                  # Main application structure
│
├── css/
│   └── style.css               # Scrollbar adjustments & custom style systems
│
├── js/
│   └── app.js                  # Calculations, state, rendering & events logic
│
├── firebase/
│   └── firebase-config.js      # Firebase App, DB, and Auth initialization
│
├── assets/                     # Graphic resources
│   ├── images/
│   ├── icons/
│   └── logos/
│
├── .gitignore                  # Git ignore files configuration
└── README.md                   # Project documentation
```

## Getting Started

### Prerequisites

You need a web browser that supports HTML5, CSS3, and ES6 JavaScript Modules.

### Installation & Run

1. Clone or download this repository to your local machine:
   ```bash
   git clone https://github.com/yourusername/ScholarIQ.git
   ```
2. Open `index.html` directly in your browser or run it using a local static file server:
   ```bash
   # If you use python
   python -m http.server 8000
   ```
3. Open `http://localhost:8000` in your web browser.

## Author

- **ScholarIQ Development Team**
- GPA Strategizer & Strategic Academic Planner

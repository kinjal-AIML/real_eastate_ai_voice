# ConstructProcure

An AI-powered Real Estate Procurement & Inventory Automation Platform designed for construction companies. This platform automates procurement processes using AI voice agents, WhatsApp bots, ERP integration, vendor intelligence, and automated purchase order workflows.

## Overview

ConstructProcure streamlines the procurement lifecycle for construction sites by enabling site engineers to submit material requests via voice calls, WhatsApp, or mobile app inputs in multiple languages (English, Hindi, Gujarati). The AI system extracts key information, validates requests, and manages the entire workflow from approval to delivery tracking.

## Features

- **AI-Powered Voice Intake**: Speech-to-text transcription and entity extraction from voice messages
- **Multilingual Support**: Handles English, Hindi, and Gujarati inputs
- **WhatsApp Integration**: Simulated WhatsApp bot for request submission and responses
- **Procurement Workflow**: Complete lifecycle management from request to delivery
- **Vendor Management**: Directory with ratings, lead times, and performance tracking
- **Inventory Management**: Site-level inventory tracking with reorder alerts
- **Analytics Dashboard**: KPIs, monthly spend analysis, top materials/vendors reports
- **User Roles**: Site Engineers, Procurement Managers, and Admins
- **JWT Authentication**: Secure login with bcrypt password hashing

## Tech Stack

### Frontend
- React 19 (Create React App)
- TailwindCSS for styling
- shadcn/ui component library
- React Router for navigation
- Axios for API calls
- React Hook Form for form handling
- Lucide React for icons
- Recharts for data visualization

### Backend
- FastAPI (Python async web framework)
- Motor (async MongoDB driver)
- PyJWT for authentication
- bcrypt for password hashing
- OpenAI GPT-4o-mini for entity extraction
- OpenAI Whisper for speech-to-text
- emergentintegrations library for AI services

### Database
- MongoDB with collections for users, sites, vendors, materials, requests, purchase orders, inventory, and WhatsApp messages

### Development Tools
- pytest for backend testing
- Black, isort, flake8, mypy for code quality
- npm for frontend dependency management

## Prerequisites

- Node.js (v16 or higher)
- Python (v3.8 or higher)
- MongoDB (local installation or cloud instance)
- OpenAI API key (for AI features)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd constructprocure
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Configure environment variables**

   Create a `.env` file in the backend directory with:
   ```
   MONGODB_URL=mongodb://localhost:27017/constructprocure
   SECRET_KEY=your-secret-key-here
   OPENAI_API_KEY=your-openai-api-key
   ```

5. **Start MongoDB**
   Ensure MongoDB is running on your system.

## Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start the frontend development server**
   ```bash
   cd frontend
   npm start
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API docs: http://localhost:8000/docs

## Testing

### Backend Tests
```bash
cd backend
source venv/bin/activate
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## API Documentation

The backend provides interactive API documentation at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc` (ReDoc).

## Design Guidelines

The application follows a high-contrast industrial design theme:
- **Colors**: Black/white base with safety orange (#FF4500) accents
- **Typography**: Chivo for headings, IBM Plex Sans for body text
- **Layout**: Grid-based with generous padding and sharp borders

## Project Structure

```
constructprocure/
├── backend/                 # FastAPI backend
│   ├── server.py           # Main application
│   ├── requirements.txt    # Python dependencies
│   └── tests/              # Backend tests
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── lib/            # Utilities and API client
│   │   └── hooks/          # Custom React hooks
│   └── package.json        # Node dependencies
├── memory/                 # Project documentation
├── test_reports/           # Test results
└── README.md              # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Contact

For questions or support, please contact the development team.
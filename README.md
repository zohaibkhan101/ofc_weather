# ofc_weather

## Overview

**ofc_weather** is a full-stack weather dashboard and forecasting application built with Node.js (backend), React/React Native (frontend), and database support for both MySQL and PostgreSQL. The application provides weather data management and visualization through a mobile or web interface.

This README provides detailed setup instructions, architecture explanation, and usage guidance to help developers install, run, and contribute to this repository.

---

## Table of Contents

1. [Features](#features)  
2. [Tech Stack](#tech-stack)  
3. [Prerequisites](#prerequisites)  
4. [Installation](#installation)  
5. [Configuration](#configuration)  
6. [Running the Application](#running-the-application)  
7. [Project Structure](#project-structure)  
8. [API Endpoints](#api-endpoints)  
9. [Database Initialization](#database-initialization)  
10. [Testing](#testing)  
11. [Contributing](#contributing)  
12. [License](#license)

---

## Features

- Backend service to fetch, store, and serve weather data  
- Support for both **MySQL** and **PostgreSQL**  
- Mobile or web interface powered by React / Expo  
- RESTful API to interact with weather data

---

## Tech Stack

- **Backend**: Node.js, Express  
- **Frontend**: JavaScript (React / Expo)  
- **Databases**: MySQL and PostgreSQL  
- **Package Management**: npm

---

## Prerequisites

Before installing, ensure the following are available:

- **Node.js** and **npm** installed  
- **MySQL** running (can use XAMPP)  
- **PostgreSQL** running (can use pgAdmin4 or local install)  
- **Expo CLI** (if using the React Native / mobile frontend)

---

## Installation

### 1) Clone the Repository

```bash
git clone https://github.com/zohaibkhan101/ofc_weather.git
cd ofc_weather
2) Backend Setup
cd backend
npm install

3) Initialize Databases

Run the database setup scripts:

node db_init.js        # creates tables in MySQL
node pg_init.js        # creates tables in PostgreSQL


Make sure database credentials are updated in the backend config before running.

Configuration
Environment Variables

Create a .env file (or similar) to store database connection details:

MYSQL_HOST=localhost
MYSQL_USER=<your_mysql_user>
MYSQL_PASSWORD=<your_mysql_password>
MYSQL_DB=<your_mysql_db>

PG_HOST=localhost
PG_USER=<your_pg_user>
PG_PASSWORD=<your_pg_password>
PG_DB=<your_pg_db>

PORT=5000


Ensure the credentials match your local MySQL and PostgreSQL installations.

Running the Application
Start Backend Server

From the backend directory:

npm start


You should see logs indicating the backend is running on the configured port (e.g., http://localhost:5000).

Start Frontend

Return to the root folder and run the Expo / React Native app:

cd ..
npm install
npx expo start


Use the Expo DevTools to launch your app in a simulator or on a physical device.

Project Structure
ofc_weather/
├── assets/
├── backend/
│   ├── db_init.js          # MySQL schema setup
│   ├── pg_init.js          # PostgreSQL schema setup
│   ├── server.js           # Express server
│   └── ...                 # Backend routes and logic
├── App.js                  # Frontend entry point
├── index.js                # Expo index
├── package.json
├── README.md
└── .gitignore

API Endpoints

The backend exposes RESTful endpoints. Example routes might include:

Method	Endpoint	Description
GET	/api/weather	Fetch weather records
POST	/api/weather	Create a new weather entry
GET	/api/weather/:id	Fetch single weather record
PUT	/api/weather/:id	Update weather entry
DELETE	/api/weather/:id	Delete a weather entry

Adjust based on the actual implemented routes in server.js.

Database Initialization

Both db_init.js and pg_init.js are scripts that:

Create required tables

Define schema for storing weather data

Connect to respective database engines

Run these only once during setup.

Testing

This project currently does not include automated test suites. Manual testing can be done with tools like:

Postman for API endpoints

Expo / React Native debugger for UI flows

Contributing

Contributions are welcome. To contribute:

Fork the repository

Create a feature branch (git checkout -b feature/xyz)

Commit changes (git commit -m "Add xyz")

Push to your fork (git push origin feature/xyz)

Open a Pull Request

Please follow code style conventions and include descriptive commit messages.

License

This project uses the standard open source license specified in LICENSE.md (if present). If none, default to MIT License.

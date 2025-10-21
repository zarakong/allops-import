# Allops PM UI

This project is a web application designed for managing customer data and PM (Preventive Maintenance) tasks. It features a user-friendly interface that connects to a PostgreSQL 15.6 database, allowing administrators to manage customer information and PM plans efficiently.

## Project Structure

The project is organized into two main parts: the frontend and the backend.

### Frontend

The frontend is built using React and TypeScript. It includes the following key components:

- **public/index.html**: The main HTML file that serves as the entry point for the frontend application.
- **src/App.tsx**: The root component that sets up routing and includes the main layout.
- **src/pages**: Contains the various pages of the application:
  - **Report.tsx**: Displays reports fetched from the database.
  - **Customer.tsx**: Shows a table of customers with options to edit and view PM plans.
  - **TaskPM.tsx**: Manages PM tasks.
  - **UploadPM.tsx**: Allows users to upload PM data.
- **src/components**: Contains reusable components:
  - **Sidebar.tsx**: The sidebar with expandable/collapsible menu options.
  - **CustomerTable.tsx**: Renders the customer table with action buttons.
  - **CustomerEditModal.tsx**: Displays a modal for editing customer details.
- **src/types/index.ts**: Exports TypeScript types and interfaces used throughout the application.

### Backend

The backend is built using Node.js and TypeScript. It includes the following key components:

- **src/index.ts**: The entry point for the backend application, setting up the server and middleware.
- **src/routes**: Defines the routes for handling requests:
  - **customers.ts**: Routes related to customer management.
  - **pm.ts**: Routes related to PM tasks.
- **src/controllers**: Contains the logic for handling requests:
  - **customersController.ts**: Handles customer-related requests.
- **src/db/index.ts**: Manages the connection to the PostgreSQL database and exports database-related functions.

### Database

- **db/allops-db.sql**: Contains the SQL schema and data for the PostgreSQL database.

### Development

- **docker-compose.yml**: Defines the services and configurations for running the application using Docker.
- **.devcontainer/devcontainer.json**: Configuration settings for the development container environment.

## Setup Instructions

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd allops-pm-ui
   ```

2. **Install dependencies**:
   - For the frontend:
     ```
     cd frontend
     npm install
     ```
   - For the backend:
     ```
     cd backend
     npm install
     ```

3. **Set up the database**:
   - Ensure PostgreSQL 15.6 is installed and running.
   - Execute the SQL script in `db/allops-db.sql` to set up the database schema.

4. **Run the application**:
   - Start the backend server:
     ```
     cd backend
     npm start
     ```
   - Start the frontend application:
     ```
     cd frontend
     npm start
     ```

5. **Access the application**:
   Open your browser and navigate to `http://localhost:3000` to access the web application.

## Usage

- Use the sidebar to navigate between different sections: Report, Customer, Task PM, and Upload PM data.
- In the Customer section, you can view, edit, and manage customer information and PM plans.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.
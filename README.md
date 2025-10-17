# Arohan School Management System

A comprehensive, production-ready School Management System built with the PERN stack (PostgreSQL, Express.js, React, Node.js) featuring modern UI with shadcn/ui components and Tailwind CSS.

## Features

### 🎯 Core Functionality
- **Dashboard**: Comprehensive overview with statistics, charts, and recent activity
- **Student Management**: Complete student records with fee structure customization
- **Staff Management**: Staff records with role-based access control
- **Class Management**: Class organization with teacher assignments
- **User Management**: Role-based user accounts with granular permissions
- **Fee Management**: Complex fee structures, payment tracking, and receipt generation

### 🔐 Advanced Security & RBAC
- **JWT-based Authentication**: Secure token-based authentication system
- **Role-based Access Control (RBAC)**: Comprehensive permission system with predefined roles
- **Granular Permissions**: Fine-grained control over user actions and resource access
- **Real-time Session Tracking**: Monitor active users and their activities
- **Activity Logging**: Complete audit trail with Google Sheets integration
- **Custom Role Creation**: Create custom roles with specific permission sets
- **Secure Password Management**: bcrypt hashing with configurable complexity
- **Rate Limiting**: Protection against brute force attacks

### 📊 Activity Monitoring & Audit
- **Google Sheets Integration**: Real-time activity logging to Google Sheets
- **Comprehensive Audit Trail**: Track all user actions with timestamps and details
- **Active User Monitoring**: Real-time view of currently logged-in users
- **Session Management**: Track login times, last activity, and IP addresses
- **Permission-based UI**: Dynamic interface based on user permissions

### 🎨 Modern UI/UX
- Built with shadcn/ui components
- Responsive design with Tailwind CSS
- Dark/Light theme support
- Professional and intuitive interface
- Data tables with search, filtering, and pagination

### 📊 Advanced Features
- Interactive charts and analytics
- Fee structure customization per student
- Payment history and receipt generation
- Outstanding fees tracking
- Audit trails for all changes
- Comprehensive reporting

## Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** with Prisma ORM
- **JWT** for authentication
- **Joi** for validation
- **bcryptjs** for password hashing

### Frontend
- **React 19** with React Router
- **shadcn/ui** component library
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Axios** for API communication

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd arohan
   ```

2. **Setup Backend**
   ```bash
   cd server
   npm install
   
   # Copy environment file
   cp .env.example .env
   # Edit .env with your database credentials
   
   # Setup database
   npx prisma generate
   npx prisma db push
   npm run db:seed
   
   # Start server
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd ../client
   npm install
   
   # Start development server
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

### Default Login Credentials
- **Username**: admin
- **Password**: admin123

## Database Schema

The system uses a comprehensive PostgreSQL schema with the following main entities:

- **Staff**: Teachers, administrators, and support staff
- **Classes**: Academic classes with assigned teachers
- **Students**: Student records with guardian information
- **Users**: System users with role-based permissions
- **Fee Types**: Different types of fees (tuition, transport, etc.)
- **Fee Structures**: Class-specific fee configurations
- **Fee Records**: Individual payment tracking
- **Audit Logs**: Complete change history

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/fee-collection-chart` - Fee collection data
- `GET /api/dashboard/class-distribution` - Class-wise student distribution

### Students
- `GET /api/students` - List students with pagination
- `POST /api/students` - Create new student
- `GET /api/students/:id` - Get student details
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `GET /api/students/:id/fee-structure` - Get student fee structure
- `PUT /api/students/:id/fee-structure` - Update student fee structure

### Staff
- `GET /api/staff` - List staff members
- `POST /api/staff` - Create new staff member
- `GET /api/staff/:id` - Get staff details
- `PUT /api/staff/:id` - Update staff member
- `DELETE /api/staff/:id` - Delete staff member

### Classes
- `GET /api/classes` - List all classes
- `POST /api/classes` - Create new class
- `GET /api/classes/:id` - Get class details
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class

### Users
- `GET /api/users` - List users (Admin only)
- `POST /api/users` - Create new user (Admin only)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Fees
- `GET /api/fees/types` - List fee types
- `POST /api/fees/types` - Create fee type
- `GET /api/fees/records` - List fee records
- `POST /api/fees/payment` - Record payment
- `POST /api/fees/generate` - Generate monthly fees
- `GET /api/fees/due-summary` - Get outstanding fees

## Role-Based Access Control (RBAC)

### Predefined Roles

#### Administrator (admin)
- **Full System Access**: Complete control over all features and data
- **User Management**: Create, modify, and delete user accounts
- **System Configuration**: Access to all configuration settings
- **All Permissions**: Unrestricted access to all resources and actions

#### Principal (principal)
- **Academic Management**: Full access to classes, students, and staff
- **Financial Operations**: Complete fee management and collection
- **Staff Management**: Hire, manage, and process staff transactions
- **Restricted Access**: No access to user management, dashboard, or system configuration
- **Limited Finance**: Cannot view monthly income statistics

#### Staff (staff)
- **Student Operations**: Full CRUD access to student records
- **Class Information**: Read-only access to class data
- **Fee Collection**: Can collect fees and process payments
- **Limited Access**: No access to staff management, users, or financial reports

#### Custom Roles
- **Flexible Permissions**: Create custom roles with specific permission combinations
- **Granular Control**: Select individual permissions from available resources
- **Role Templates**: Save and reuse custom permission sets

### Permission System

The system implements granular permissions across these resources:

- **dashboard**: System overview and statistics
- **users**: User account management
- **students**: Student record management
- **staff**: Staff member management
- **classes**: Class organization and management
- **fees**: Fee structure and payment management
- **finance**: Financial records and transactions
- **configuration**: System settings and configuration

Each resource supports these actions:
- **create**: Add new records
- **read**: View existing records
- **update**: Modify existing records
- **delete**: Remove records

### Activity Logging

All user activities are automatically logged with:
- **User Information**: Username, alias, and role
- **Action Details**: What action was performed
- **Resource Information**: Which resource was affected
- **Timestamp**: When the action occurred
- **IP Address**: Where the action originated
- **Additional Context**: Relevant details about the action

### Google Sheets Integration

Activity logs are automatically synchronized to Google Sheets for:
- **External Audit**: Independent record keeping
- **Data Analysis**: Easy filtering and reporting
- **Backup**: Redundant activity tracking
- **Compliance**: Meet audit and compliance requirements

### Session Management

- **Real-time Tracking**: Monitor currently active users
- **Session Details**: Login time, last activity, IP address
- **Automatic Cleanup**: Sessions expire after 24 hours of inactivity
- **Security Monitoring**: Track suspicious login patterns

## Development

### Project Structure
```
arohan/
├── server/                 # Backend application
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Authentication & validation
│   │   ├── utils/         # Utilities and helpers
│   │   └── index.js       # Server entry point
│   ├── prisma/            # Database schema and migrations
│   └── package.json
├── client/                # Frontend application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── lib/           # Utilities and API client
│   │   └── App.jsx        # App entry point
│   └── package.json
└── README.md
```

### Adding New Features

1. **Backend**: Add routes in `server/src/routes/`
2. **Frontend**: Add pages in `client/src/pages/`
3. **Database**: Update MongoDB models in `server/src/models/`
4. **Permissions**: Update permission system in `server/src/utils/permissions.js`
5. **Activity Logging**: Add activity logging to new routes using `activityLogger` middleware
6. **RBAC**: Update role definitions and permission checks as needed

### RBAC Setup

1. **Initialize RBAC System**
   ```bash
   cd server
   npm run init:rbac
   ```

2. **Configure Google Sheets** (Optional)
   - Follow the guide in `GOOGLE_SHEETS_SETUP.md`
   - Set up service account and environment variables
   - Enable real-time activity logging

3. **Create Users**
   - Use the admin interface to create new users
   - Assign predefined roles or create custom permissions
   - Monitor user activities through the active users panel

## Deployment

### Production Setup

1. **Environment Variables**
   ```bash
   NODE_ENV=production
   DATABASE_URL=your_production_database_url
   JWT_SECRET=your_secure_jwt_secret
   CORS_ORIGIN=your_frontend_domain
   ```

2. **Database Setup**
   ```bash
   npm run db:seed
   npm run init:rbac
   ```

3. **Build Frontend**
   ```bash
   cd client
   npm run build
   ```

4. **Start Production Server**
   ```bash
   cd server
   npm start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.

---

**Arohan School Management System** - Empowering education through technology.
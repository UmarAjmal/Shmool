# Expense Module - Setup Guide

## New Features Added ✅

1. **Expense Categories Management**
   - Create and manage expense categories
   - Mark categories as active/inactive
   - Prevents deletion of categories with expenses

2. **Expense Tracking**
   - Add new expenses with detailed information
   - Link expenses to categories
   - Track payment methods (Cash, Bank Transfer, Cheque, Credit Card, Online)
   - Add reference numbers and vendor details

3. **Advanced Filtering**
   - Filter by category, status, payment method
   - Date range filtering
   - Search by title, paid to, or reference number
   - Real-time summary totals

4. **Status Management**
   - Pending, Approved, Rejected status tracking
   - Quick status updates from list view
   - Summary by status

5. **Financial Summary**
   - Total expenses overview
   - Approved vs pending amounts
   - Category-wise breakdown

## Setup Instructions 🚀

### Step 1: Initialize Database Tables
```bash
cd server
node init-expenses.js
```

This will create:
- `expense_categories` table
- `expenses` table
- 7 default categories (Salaries, Utilities, Office Supplies, Maintenance, Transportation, Marketing, Miscellaneous)

### Step 2: Start the Application
```bash
# From root directory
RUN_APP.bat
# Select Option 1: START
```

### Step 3: Access Expense Module
Navigate to: **Expenses** in the sidebar

Sub-menu items:
- **Add Expense** - Create new expense entries
- **Expense List** - View and manage all expenses
- **Categories** - Manage expense categories

## Features Overview 📋

### Expense Categories
- **Path**: `/expenses/categories`
- **Features**:
  - List all categories
  - Add new category
  - Edit existing category
  - Delete category (only if no expenses exist)
  - Toggle active/inactive status

### Add Expense
- **Path**: `/expenses/add`
- **Required Fields**:
  - Category (dropdown of active categories)
  - Expense Title
  - Amount
- **Optional Fields**:
  - Date (defaults to today)
  - Payment Method
  - Reference No
  - Paid To
  - Description

### Expense List
- **Path**: `/expenses/list`
- **Features**:
  - Summary cards showing totals
  - Filter by category, status, date range, payment method
  - Search functionality
  - Paginated results
  - Quick status updates
  - Delete expenses
  - Export functionality

## Database Schema 🗄️

### expense_categories
```sql
- category_id (SERIAL PRIMARY KEY)
- category_name (VARCHAR UNIQUE)
- description (TEXT)
- is_active (BOOLEAN DEFAULT TRUE)
- created_at, updated_at (TIMESTAMPS)
```

### expenses
```sql
- expense_id (SERIAL PRIMARY KEY)
- category_id (FOREIGN KEY)
- expense_title (VARCHAR)
- amount (NUMERIC(10,2))
- expense_date (DATE)
- payment_method (VARCHAR)
- reference_no (VARCHAR)
- paid_to (VARCHAR)
- description (TEXT)
- attachment (VARCHAR)
- created_by, approved_by (INTEGER)
- status (VARCHAR: pending/approved/rejected)
- created_at, updated_at (TIMESTAMPS)
```

## API Endpoints 🔌

### Categories
- `GET /expense-categories` - All categories
- `GET /expense-categories/active` - Active only
- `GET /expense-categories/:id` - Single category
- `POST /expense-categories` - Create category
- `PUT /expense-categories/:id` - Update category
- `DELETE /expense-categories/:id` - Delete category

### Expenses
- `GET /expenses` - List with filters
- `GET /expenses/stats/summary` - Summary totals
- `GET /expenses/stats/by-category` - Category breakdown
- `GET /expenses/:id` - Single expense
- `POST /expenses` - Create expense
- `PUT /expenses/:id` - Update expense
- `PATCH /expenses/:id/status` - Update status only
- `DELETE /expenses/:id` - Delete expense

## Filters Available 🔍

1. **Category** - Filter by specific category
2. **Status** - pending/approved/rejected
3. **Date Range** - From date to date
4. **Payment Method** - cash/bank_transfer/cheque/credit_card/online
5. **Search** - Search in title, paid to, reference number

## Usage Tips 💡

1. **Set up categories first** - Go to Categories and ensure you have all needed categories active
2. **Use reference numbers** - Always add receipt/transaction numbers for tracking
3. **Add descriptions** - Keep detailed notes for future reference
4. **Regular approval workflow** - Review and approve/reject pending expenses
5. **Use filters for reporting** - Filter by date range and category for monthly reports

## Troubleshooting ❗

### Database tables not created
```bash
cd server
node init-expenses.js
```

### Categories not showing in dropdown
- Check if categories are marked as **Active**
- Go to Categories page and toggle status

### Cannot delete category
- Category has expenses linked to it
- Mark as **Inactive** instead

### Backend errors
- Restart using `RUN_APP.bat` Option 3: RESTART
- Check database connection in `server/db.js`

## Next Steps 🎯

Future enhancements planned:
- [ ] File attachment upload for receipts
- [ ] Expense approval workflow with multiple approvers
- [ ] Monthly/yearly expense reports
- [ ] Budget tracking per category
- [ ] Email notifications for approvals
- [ ] Export to Excel/PDF
- [ ] Expense analytics dashboard

---

**Created by**: SMS_Pern Development Team  
**Last Updated**: 2026-02-04  
**Version**: 1.0.0

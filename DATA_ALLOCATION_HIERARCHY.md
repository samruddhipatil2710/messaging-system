# Data Allocation Hierarchy System

## Overview

The data allocation system now works with the hierarchical user structure, allowing different user roles to allocate data to users under their hierarchy.

## User Role Permissions

### 1. Main Admin
**Can allocate data to:**
- Super Admins
- Admins (created by Main Admin)
- Users (created by Main Admin)

**Can view allocations for:**
- All users in the system
- Allocations they made personally
- All allocations in the system

### 2. Super Admin
**Can allocate data to:**
- Admins they created
- Users they created directly
- Users created by their admins

**Can view allocations for:**
- Users they created directly
- Users created by admins under them
- Allocations they made personally

### 3. Admin
**Can allocate data to:**
- Users they created

**Can view allocations for:**
- Only users they created
- Allocations they made personally

### 4. User
**Can view:**
- Only their own allocated data
- Cannot allocate data to anyone

## Data Allocation Structure

```
Data Allocation Flow:
Main Admin
├── Can allocate to Super Admins, Admins, Users
├── Super Admin
│   ├── Can allocate to their Admins and Users
│   ├── Admin
│   │   └── Can allocate to their Users
│   └── User (receives allocations)
└── User (receives allocations)
```

## Firebase Structure

### User Allocations Collection
```
userAllocations (collection)
├── {userId} (document)
│   └── allocations (subcollection)
│       └── {allocationId} (document)
│           ├── district: "SANGLI"
│           ├── taluka: "SANGLI"
│           ├── city: "SANGLI"
│           ├── count: 1000
│           ├── allocatedBy: "admin@example.com"
│           ├── allocatedAt: Timestamp
│           └── status: "active"
```

## Key Functions Updated

### 1. `loadUsers()` in DataAllocationNew.jsx
- **Main Admin**: Shows all Super Admins, Admins, and Users
- **Super Admin**: Shows Admins they created + Users in their hierarchy
- **Admin**: Shows only Users they created

### 2. `getAllocationsByCreator()` in dataAllocation.js
- **Main Admin**: Gets allocations for all users
- **Super Admin**: Gets allocations for users they created + users created by their admins
- **Admin**: Gets allocations only for users they created

## Usage Examples

### Super Admin Scenario
1. **Aditya Patil (Super Admin)** creates **Samruddhi Patil (Admin)**
2. **Samruddhi Patil (Admin)** creates **Moin Fakir (User)**
3. **Aditya Patil** can now:
   - Allocate data to **Samruddhi Patil**
   - Allocate data to **Moin Fakir** (even though created by Samruddhi)
   - View allocations for both **Samruddhi** and **Moin**

### Admin Scenario
1. **Samruddhi Patil (Admin)** can:
   - Allocate data to **Moin Fakir** (user she created)
   - View allocations for **Moin Fakir**
   - Cannot allocate to users created by other admins

## Components Involved

1. **DataAllocationNew.jsx** - Main data allocation interface
2. **ViewAllocatedData.jsx** - View and manage allocated data
3. **AllocatedLocationSelector.jsx** - Location selector for allocated data
4. **dataAllocation.js** - Backend functions for data allocation

## Benefits

1. **Hierarchical Control**: Each user level can manage users under their hierarchy
2. **Data Security**: Users can only see and manage data they're authorized for
3. **Scalability**: System works with unlimited levels of hierarchy
4. **Flexibility**: Main Admin has full control, while lower levels have appropriate restrictions

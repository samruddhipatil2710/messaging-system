// Initialize dummy data for testing hierarchical view
// DISABLED: Using Firebase instead of localStorage
export const initializeDummyData = () => {
  console.log('ℹ️ Dummy data initialization disabled - using Firebase database');
  return;

  const dummyUsers = [
    // Main Admin (ID: 1)
    { 
      id: 1, 
      role: 'main_admin', 
      name: 'Main Admin', 
      email: 'mainadmin@demo.com', 
      mobile: '9991100001', 
      phone: '9991100001', 
      password: 'password', 
      status: 'Active', 
      createdAt: new Date('2024-01-01').toISOString() 
    },

    // Bob Wilson - Super Admin (ID: 2)
    { 
      id: 2, 
      role: 'super_admin', 
      name: 'Bob Wilson', 
      email: 'bob@demo.com', 
      mobile: '9123456789', 
      phone: '9123456789', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'mainadmin@demo.com',
      createdAt: new Date('2024-01-15').toISOString() 
    },

    // Super Admin A (ID: 3)
    { 
      id: 3, 
      role: 'super_admin', 
      name: 'Bharat Patil', 
      email: 'bharat.patil@demo.com', 
      mobile: '9876543210', 
      phone: '9876543210', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'mainadmin@demo.com',
      createdAt: new Date('2024-02-01').toISOString() 
    },

    // Super Admin B (ID: 4)
    { 
      id: 4, 
      role: 'super_admin', 
      name: 'Vishal Patil', 
      email: 'vishal.patil@demo.com', 
      mobile: '9876543211', 
      phone: '9876543211', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'mainadmin@demo.com',
      createdAt: new Date('2024-02-02').toISOString() 
    },

    // Super Admin C (ID: 5)
    { 
      id: 5, 
      role: 'super_admin', 
      name: 'Draupadi Gurav', 
      email: 'draupadi.gurav@demo.com', 
      mobile: '9876543212', 
      phone: '9876543212', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'mainadmin@demo.com',
      createdAt: new Date('2024-02-03').toISOString() 
    },

    // Generic Super Admin (ID: 44) - For testing with superadmin@demo.com
    { 
      id: 44, 
      role: 'super_admin', 
      name: 'Super Admin', 
      email: 'superadmin@demo.com', 
      mobile: '9999999999', 
      phone: '9999999999', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'mainadmin@demo.com',
      createdAt: new Date('2024-02-04').toISOString() 
    },

    // Admins under Bob Wilson (ID: 6-8)
    { 
      id: 6, 
      role: 'admin', 
      name: 'Michael Johnson', 
      email: 'michael.johnson@demo.com', 
      mobile: '9111111101', 
      phone: '9111111101', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'bob@demo.com',
      createdAt: new Date('2024-02-15').toISOString() 
    },
    { 
      id: 7, 
      role: 'admin', 
      name: 'Sarah Williams', 
      email: 'sarah.williams@demo.com', 
      mobile: '9111111102', 
      phone: '9111111102', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'bob@demo.com',
      createdAt: new Date('2024-02-16').toISOString() 
    },
    { 
      id: 8, 
      role: 'admin', 
      name: 'David Brown', 
      email: 'david.brown@demo.com', 
      mobile: '9111111103', 
      phone: '9111111103', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'bob@demo.com',
      createdAt: new Date('2024-02-17').toISOString() 
    },

    // Admins under Super Admin A (Bharat Patil) (ID: 9-11)
    { 
      id: 9, 
      role: 'admin', 
      name: 'Om Virl', 
      email: 'om.virl@demo.com', 
      mobile: '9876543220', 
      phone: '9876543220', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'bharat.patil@demo.com',
      createdAt: new Date('2024-03-01').toISOString() 
    },
    { 
      id: 10, 
      role: 'admin', 
      name: 'Anay Shetty', 
      email: 'anay.shetty@demo.com', 
      mobile: '9876543221', 
      phone: '9876543221', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'bharat.patil@demo.com',
      createdAt: new Date('2024-03-02').toISOString() 
    },
    { 
      id: 11, 
      role: 'admin', 
      name: 'Santosh Kumar', 
      email: 'santosh.kumar@demo.com', 
      mobile: '9876543222', 
      phone: '9876543222', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'bharat.patil@demo.com',
      createdAt: new Date('2024-03-03').toISOString() 
    },

    // Admins under Super Admin B (Vishal Patil) (ID: 12-14)
    { 
      id: 12, 
      role: 'admin', 
      name: 'Rajesh Sharma', 
      email: 'rajesh.sharma@demo.com', 
      mobile: '9876543230', 
      phone: '9876543230', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'vishal.patil@demo.com',
      createdAt: new Date('2024-03-04').toISOString() 
    },
    { 
      id: 13, 
      role: 'admin', 
      name: 'Priya Deshmukh', 
      email: 'priya.deshmukh@demo.com', 
      mobile: '9876543231', 
      phone: '9876543231', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'vishal.patil@demo.com',
      createdAt: new Date('2024-03-05').toISOString() 
    },
    { 
      id: 14, 
      role: 'admin', 
      name: 'Amit Joshi', 
      email: 'amit.joshi@demo.com', 
      mobile: '9876543232', 
      phone: '9876543232', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'vishal.patil@demo.com',
      createdAt: new Date('2024-03-06').toISOString() 
    },

    // Admins under Super Admin C (Draupadi Gurav) (ID: 15)
    { 
      id: 15, 
      role: 'admin', 
      name: 'Sunil Pawar', 
      email: 'sunil.pawar@demo.com', 
      mobile: '9876543240', 
      phone: '9876543240', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'draupadi.gurav@demo.com',
      createdAt: new Date('2024-03-07').toISOString() 
    },

    // Users under Bob Wilson's Admins
    // Users under Admin: Michael Johnson (ID: 16-18)
    { 
      id: 16, 
      role: 'user', 
      name: 'Jennifer Lee', 
      email: 'jennifer.lee@demo.com', 
      mobile: '9111111201', 
      phone: '9111111201', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'michael.johnson@demo.com',
      createdAt: new Date('2024-03-01').toISOString() 
    },
    { 
      id: 17, 
      role: 'user', 
      name: 'Robert Garcia', 
      email: 'robert.garcia@demo.com', 
      mobile: '9111111202', 
      phone: '9111111202', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'michael.johnson@demo.com',
      createdAt: new Date('2024-03-02').toISOString() 
    },
    { 
      id: 18, 
      role: 'user', 
      name: 'Lisa Martinez', 
      email: 'lisa.martinez@demo.com', 
      mobile: '9111111203', 
      phone: '9111111203', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'michael.johnson@demo.com',
      createdAt: new Date('2024-03-03').toISOString() 
    },

    // Users under Admin: Sarah Williams (ID: 19-21)
    { 
      id: 19, 
      role: 'user', 
      name: 'Thomas Anderson', 
      email: 'thomas.anderson@demo.com', 
      mobile: '9111111211', 
      phone: '9111111211', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'sarah.williams@demo.com',
      createdAt: new Date('2024-03-04').toISOString() 
    },
    { 
      id: 20, 
      role: 'user', 
      name: 'Emily Taylor', 
      email: 'emily.taylor@demo.com', 
      mobile: '9111111212', 
      phone: '9111111212', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'sarah.williams@demo.com',
      createdAt: new Date('2024-03-05').toISOString() 
    },
    { 
      id: 21, 
      role: 'user', 
      name: 'James Wilson', 
      email: 'james.wilson@demo.com', 
      mobile: '9111111213', 
      phone: '9111111213', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'sarah.williams@demo.com',
      createdAt: new Date('2024-03-06').toISOString() 
    },

    // Users under Admin: David Brown (ID: 22-24)
    { 
      id: 22, 
      role: 'user', 
      name: 'Patricia Moore', 
      email: 'patricia.moore@demo.com', 
      mobile: '9111111221', 
      phone: '9111111221', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'david.brown@demo.com',
      createdAt: new Date('2024-03-07').toISOString() 
    },
    { 
      id: 23, 
      role: 'user', 
      name: 'Christopher Davis', 
      email: 'christopher.davis@demo.com', 
      mobile: '9111111222', 
      phone: '9111111222', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'david.brown@demo.com',
      createdAt: new Date('2024-03-08').toISOString() 
    },
    { 
      id: 24, 
      role: 'user', 
      name: 'Nancy White', 
      email: 'nancy.white@demo.com', 
      mobile: '9111111223', 
      phone: '9111111223', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'david.brown@demo.com',
      createdAt: new Date('2024-03-09').toISOString() 
    },

    // Users under Admin: Om Virl (ID: 25-27)
    { 
      id: 25, 
      role: 'user', 
      name: 'Ramesh Kulkarni', 
      email: 'ramesh.kulkarni@demo.com', 
      mobile: '9876543300', 
      phone: '9876543300', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'om.virl@demo.com',
      createdAt: new Date('2024-04-01').toISOString() 
    },
    { 
      id: 26, 
      role: 'user', 
      name: 'Suresh More', 
      email: 'suresh.more@demo.com', 
      mobile: '9876543301', 
      phone: '9876543301', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'om.virl@demo.com',
      createdAt: new Date('2024-04-02').toISOString() 
    },
    { 
      id: 27, 
      role: 'user', 
      name: 'Kiran Desai', 
      email: 'kiran.desai@demo.com', 
      mobile: '9876543302', 
      phone: '9876543302', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'om.virl@demo.com',
      createdAt: new Date('2024-04-11').toISOString() 
    },

    // Users under Admin: Anay Shetty (ID: 28-30)
    { 
      id: 28, 
      role: 'user', 
      name: 'Mahesh Jadhav', 
      email: 'mahesh.jadhav@demo.com', 
      mobile: '9876543310', 
      phone: '9876543310', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'anay.shetty@demo.com',
      createdAt: new Date('2024-04-03').toISOString() 
    },
    { 
      id: 29, 
      role: 'user', 
      name: 'Neha Rane', 
      email: 'neha.rane@demo.com', 
      mobile: '9876543311', 
      phone: '9876543311', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'anay.shetty@demo.com',
      createdAt: new Date('2024-04-12').toISOString() 
    },
    { 
      id: 30, 
      role: 'user', 
      name: 'Pooja Kamble', 
      email: 'pooja.kamble@demo.com', 
      mobile: '9876543312', 
      phone: '9876543312', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'anay.shetty@demo.com',
      createdAt: new Date('2024-04-13').toISOString() 
    },

    // Users under Admin: Santosh Kumar (ID: 31-32)
    { 
      id: 31, 
      role: 'user', 
      name: 'Vijay Patil', 
      email: 'vijay.patil@demo.com', 
      mobile: '9876543320', 
      phone: '9876543320', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'santosh.kumar@demo.com',
      createdAt: new Date('2024-04-04').toISOString() 
    },
    { 
      id: 32, 
      role: 'user', 
      name: 'Anil Shinde', 
      email: 'anil.shinde@demo.com', 
      mobile: '9876543321', 
      phone: '9876543321', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'santosh.kumar@demo.com',
      createdAt: new Date('2024-04-05').toISOString() 
    },

    // Users under Admin: Rajesh Sharma (ID: 33-35)
    { 
      id: 33, 
      role: 'user', 
      name: 'Sanjay Deshpande', 
      email: 'sanjay.deshpande@demo.com', 
      mobile: '9876543330', 
      phone: '9876543330', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'rajesh.sharma@demo.com',
      createdAt: new Date('2024-04-06').toISOString() 
    },
    { 
      id: 34, 
      role: 'user', 
      name: 'Prakash Naik', 
      email: 'prakash.naik@demo.com', 
      mobile: '9876543331', 
      phone: '9876543331', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'rajesh.sharma@demo.com',
      createdAt: new Date('2024-04-07').toISOString() 
    },
    { 
      id: 35, 
      role: 'user', 
      name: 'Ganesh Pawar', 
      email: 'ganesh.pawar@demo.com', 
      mobile: '9876543332', 
      phone: '9876543332', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'rajesh.sharma@demo.com',
      createdAt: new Date('2024-04-14').toISOString() 
    },

    // Users under Admin: Priya Deshmukh (ID: 36-38)
    { 
      id: 36, 
      role: 'user', 
      name: 'Deepak Chavhan', 
      email: 'deepak.chavhan@demo.com', 
      mobile: '9876543340', 
      phone: '9876543340', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'priya.deshmukh@demo.com',
      createdAt: new Date('2024-04-08').toISOString() 
    },
    { 
      id: 37, 
      role: 'user', 
      name: 'Swati Joshi', 
      email: 'swati.joshi@demo.com', 
      mobile: '9876543341', 
      phone: '9876543341', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'priya.deshmukh@demo.com',
      createdAt: new Date('2024-04-15').toISOString() 
    },
    { 
      id: 38, 
      role: 'user', 
      name: 'Rohit Sawant', 
      email: 'rohit.sawant@demo.com', 
      mobile: '9876543342', 
      phone: '9876543342', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'priya.deshmukh@demo.com',
      createdAt: new Date('2024-04-16').toISOString() 
    },

    // Users under Admin: Amit Joshi (ID: 39-41)
    { 
      id: 39, 
      role: 'user', 
      name: 'Rahul Gaikwad', 
      email: 'rahul.gaikwad@demo.com', 
      mobile: '9876543350', 
      phone: '9876543350', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'amit.joshi@demo.com',
      createdAt: new Date('2024-04-09').toISOString() 
    },
    { 
      id: 40, 
      role: 'user', 
      name: 'Sachin Mane', 
      email: 'sachin.mane@demo.com', 
      mobile: '9876543351', 
      phone: '9876543351', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'amit.joshi@demo.com',
      createdAt: new Date('2024-04-17').toISOString() 
    },
    { 
      id: 41, 
      role: 'user', 
      name: 'Kavita Bhosale', 
      email: 'kavita.bhosale@demo.com', 
      mobile: '9876543352', 
      phone: '9876543352', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'amit.joshi@demo.com',
      createdAt: new Date('2024-04-18').toISOString() 
    },

    // Users under Admin: Sunil Pawar (ID: 42-43)
    { 
      id: 42, 
      role: 'user', 
      name: 'Ajay Bhosale', 
      email: 'ajay.bhosale@demo.com', 
      mobile: '9876543360', 
      phone: '9876543360', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'sunil.pawar@demo.com',
      createdAt: new Date('2024-04-10').toISOString() 
    },
    { 
      id: 43, 
      role: 'user', 
      name: 'Manish Patil', 
      email: 'manish.patil@demo.com', 
      mobile: '9876543361', 
      phone: '9876543361', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'sunil.pawar@demo.com',
      createdAt: new Date('2024-04-19').toISOString() 
    },

    // Generic Admin (ID: 44) - For testing with admin@demo.com
    { 
      id: 44, 
      role: 'admin', 
      name: 'Admin User', 
      email: 'admin@demo.com', 
      mobile: '9666666666', 
      phone: '9666666666', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'superadmin@demo.com',
      createdAt: new Date('2024-02-20').toISOString() 
    },

    // Admins under Super Admin (superadmin@demo.com) - ID: 45-46
    { 
      id: 45, 
      role: 'admin', 
      name: 'Rajesh Sharma', 
      email: 'rajesh.sharma@demo.com', 
      mobile: '9888888801', 
      phone: '9888888801', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'superadmin@demo.com',
      createdAt: new Date('2024-03-01').toISOString() 
    },
    { 
      id: 46, 
      role: 'admin', 
      name: 'Anita Singh', 
      email: 'anita.singh@demo.com', 
      mobile: '9888888802', 
      phone: '9888888802', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'superadmin@demo.com',
      createdAt: new Date('2024-03-02').toISOString() 
    },

    // Users under Rajesh Sharma (ID: 47-48)
    { 
      id: 47, 
      role: 'user', 
      name: 'Vaishali Joshi', 
      email: 'vaishali.joshi@demo.com', 
      mobile: '9777777701', 
      phone: '9777777701', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'rajesh.sharma@demo.com',
      createdAt: new Date('2024-03-15').toISOString() 
    },
    { 
      id: 48, 
      role: 'user', 
      name: 'Sanjay Deshpande', 
      email: 'sanjay.deshpande@demo.com', 
      mobile: '9777777702', 
      phone: '9777777702', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'rajesh.sharma@demo.com',
      createdAt: new Date('2024-03-16').toISOString() 
    },

    // Users under Anita Singh (ID: 49-50)
    { 
      id: 49, 
      role: 'user', 
      name: 'Deepak More', 
      email: 'deepak.more@demo.com', 
      mobile: '9777777703', 
      phone: '9777777703', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'anita.singh@demo.com',
      createdAt: new Date('2024-03-17').toISOString() 
    },
    { 
      id: 50, 
      role: 'user', 
      name: 'Meena Kulkarni', 
      email: 'meena.kulkarni@demo.com', 
      mobile: '9777777704', 
      phone: '9777777704', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'anita.singh@demo.com',
      createdAt: new Date('2024-03-18').toISOString() 
    },

    // Users under Admin User (admin@demo.com) - ID: 51-55
    { 
      id: 51, 
      role: 'user', 
      name: 'Ganesh Rane', 
      email: 'ganesh.rane@demo.com', 
      mobile: '9555555501', 
      phone: '9555555501', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'admin@demo.com',
      createdAt: new Date('2024-03-05').toISOString() 
    },
    { 
      id: 52, 
      role: 'user', 
      name: 'Pallavi Shinde', 
      email: 'pallavi.shinde@demo.com', 
      mobile: '9555555502', 
      phone: '9555555502', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'admin@demo.com',
      createdAt: new Date('2024-03-06').toISOString() 
    },
    { 
      id: 53, 
      role: 'user', 
      name: 'Sachin Jagtap', 
      email: 'sachin.jagtap@demo.com', 
      mobile: '9555555503', 
      phone: '9555555503', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'admin@demo.com',
      createdAt: new Date('2024-03-07').toISOString() 
    },
    { 
      id: 54, 
      role: 'user', 
      name: 'Snehal Patil', 
      email: 'snehal.patil@demo.com', 
      mobile: '9555555504', 
      phone: '9555555504', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'admin@demo.com',
      createdAt: new Date('2024-03-08').toISOString() 
    },
    { 
      id: 55, 
      role: 'user', 
      name: 'Tushar Naik', 
      email: 'tushar.naik@demo.com', 
      mobile: '9555555505', 
      phone: '9555555505', 
      password: 'password', 
      status: 'Active', 
      createdBy: 'admin@demo.com',
      createdAt: new Date('2024-03-09').toISOString() 
    },
  ];

  // Dummy Activity Logs
  const dummyLogs = [
    {
      action: 'user_created',
      performedBy: 'om.virl@demo.com',
      details: 'Created new user: Ramesh Kulkarni (ramesh.kulkarni@demo.com)',
      timestamp: new Date('2024-04-01T10:30:00').toISOString()
    },
    {
      action: 'message_sent',
      performedBy: 'om.virl@demo.com',
      details: 'Sent message to 5 users in Mumbai district',
      timestamp: new Date('2024-04-02T14:20:00').toISOString()
    },
    {
      action: 'user_created',
      performedBy: 'anay.shetty@demo.com',
      details: 'Created new user: Mahesh Jadhav (mahesh.jadhav@demo.com)',
      timestamp: new Date('2024-04-03T09:15:00').toISOString()
    },
    {
      action: 'data_allocated',
      performedBy: 'santosh.kumar@demo.com',
      details: 'Allocated Pune district data to Vijay Patil',
      timestamp: new Date('2024-04-04T11:45:00').toISOString()
    },
    {
      action: 'user_created',
      performedBy: 'rajesh.sharma@demo.com',
      details: 'Created new user: Sanjay Deshpande (sanjay.deshpande@demo.com)',
      timestamp: new Date('2024-04-06T16:30:00').toISOString()
    },
    {
      action: 'message_sent',
      performedBy: 'priya.deshmukh@demo.com',
      details: 'Sent voice message to 3 users',
      timestamp: new Date('2024-04-08T13:00:00').toISOString()
    },
  ];

  // Message History - Messages sent by users
  const dummyMessages = [
    // Messages from users under Bob Wilson's hierarchy
    {
      id: 1,
      sentBy: 'amit.patil@demo.com',
      sentByName: 'Amit Patil',
      type: 'whatsapp',
      area: 'Mumbai - Andheri',
      recipientCount: 150,
      message: 'Important update: New policy guidelines will be effective from next week. Please review the attached document.',
      timestamp: new Date('2024-04-10T09:30:00').toISOString(),
      status: 'Delivered'
    },
    {
      id: 2,
      sentBy: 'neha.gupta@demo.com',
      sentByName: 'Neha Gupta',
      type: 'text',
      area: 'Mumbai - Borivali',
      recipientCount: 200,
      message: 'Reminder: Community meeting scheduled for tomorrow at 5 PM. Your presence is important.',
      timestamp: new Date('2024-04-10T14:20:00').toISOString(),
      status: 'Delivered'
    },
    {
      id: 3,
      sentBy: 'rohit.desai@demo.com',
      sentByName: 'Rohit Desai',
      type: 'voice',
      area: 'Mumbai - Malad',
      recipientCount: 180,
      message: 'Voice announcement about upcoming festival celebrations and safety guidelines.',
      timestamp: new Date('2024-04-11T10:15:00').toISOString(),
      status: 'Delivered'
    },
    {
      id: 4,
      sentBy: 'priya.deshmukh@demo.com',
      sentByName: 'Priya Deshmukh',
      type: 'whatsapp',
      area: 'Pune - Kothrud',
      recipientCount: 220,
      message: 'Health camp organized next Sunday. Free check-ups for all residents. Please spread the word.',
      timestamp: new Date('2024-04-11T16:45:00').toISOString(),
      status: 'Delivered'
    },
    {
      id: 5,
      sentBy: 'vijay.kulkarni@demo.com',
      sentByName: 'Vijay Kulkarni',
      type: 'text',
      area: 'Pune - Aundh',
      recipientCount: 175,
      message: 'Water supply will be interrupted tomorrow from 10 AM to 2 PM for maintenance work.',
      timestamp: new Date('2024-04-12T08:30:00').toISOString(),
      status: 'Delivered'
    },
    {
      id: 6,
      sentBy: 'anita.joshi@demo.com',
      sentByName: 'Anita Joshi',
      type: 'whatsapp',
      area: 'Pune - Deccan',
      recipientCount: 160,
      message: 'Registration open for skill development workshop. Limited seats available. Register now!',
      timestamp: new Date('2024-04-12T11:00:00').toISOString(),
      status: 'Delivered'
    },
    {
      id: 7,
      sentBy: 'kiran.rathod@demo.com',
      sentByName: 'Kiran Rathod',
      type: 'voice',
      area: 'Nashik - Panchavati',
      recipientCount: 140,
      message: 'Important announcement regarding traffic diversion due to ongoing construction work.',
      timestamp: new Date('2024-04-13T09:00:00').toISOString(),
      status: 'Delivered'
    },
    {
      id: 8,
      sentBy: 'manish.pawar@demo.com',
      sentByName: 'Manish Pawar',
      type: 'text',
      area: 'Nashik - College Road',
      recipientCount: 130,
      message: 'Vaccination drive for children tomorrow at primary health center. Bring Aadhar card.',
      timestamp: new Date('2024-04-13T15:30:00').toISOString(),
      status: 'Delivered'
    },
    {
      id: 9,
      sentBy: 'sneha.thakur@demo.com',
      sentByName: 'Sneha Thakur',
      type: 'whatsapp',
      area: 'Nashik - Satpur',
      recipientCount: 190,
      message: 'Job fair being organized next week. Opportunities in IT, Manufacturing, and Services sector.',
      timestamp: new Date('2024-04-14T10:45:00').toISOString(),
      status: 'Delivered'
    },
    {
      id: 10,
      sentBy: 'suresh.bhosale@demo.com',
      sentByName: 'Suresh Bhosale',
      type: 'text',
      area: 'Nagpur - Sitabuldi',
      recipientCount: 210,
      message: 'Electric meter reading staff will visit your area on 18th April. Please keep your meters accessible.',
      timestamp: new Date('2024-04-14T13:20:00').toISOString(),
      status: 'Delivered'
    },
    {
      id: 11,
      sentBy: 'pooja.jadhav@demo.com',
      sentByName: 'Pooja Jadhav',
      type: 'whatsapp',
      area: 'Nagpur - Dharampeth',
      recipientCount: 170,
      message: 'Online classes schedule for computer literacy program. Registration link: https://demo.com/register',
      timestamp: new Date('2024-04-15T09:15:00').toISOString(),
      status: 'Delivered'
    },
    {
      id: 12,
      sentBy: 'rahul.ghuge@demo.com',
      sentByName: 'Rahul Ghuge',
      type: 'voice',
      area: 'Nagpur - Civil Lines',
      recipientCount: 155,
      message: 'Awareness message about preventing dengue and malaria during monsoon season.',
      timestamp: new Date('2024-04-15T14:00:00').toISOString(),
      status: 'Delivered'
    },
    {
      id: 13,
      sentBy: 'kavita.sawant@demo.com',
      sentByName: 'Kavita Sawant',
      type: 'text',
      area: 'Thane - Kopri',
      recipientCount: 195,
      message: 'Property tax payment deadline extended to 30th April. Pay online to avoid penalty.',
      timestamp: new Date('2024-04-16T10:30:00').toISOString(),
      status: 'Delivered'
    },
    {
      id: 14,
      sentBy: 'anil.kamble@demo.com',
      sentByName: 'Anil Kamble',
      type: 'whatsapp',
      area: 'Thane - Kolshet',
      recipientCount: 185,
      message: 'New bus routes starting from May 1st. Check the schedule at nearest bus stop.',
      timestamp: new Date('2024-04-16T16:15:00').toISOString(),
      status: 'Delivered'
    },
    {
      id: 15,
      sentBy: 'sunita.mane@demo.com',
      sentByName: 'Sunita Mane',
      type: 'voice',
      area: 'Thane - Bhayander',
      recipientCount: 165,
      message: 'Emergency contact numbers for monsoon-related issues and complaints.',
      timestamp: new Date('2024-04-17T09:45:00').toISOString(),
      status: 'Delivered'
    }
  ];

  // Data Allocations - Assign districts/talukas/cities to users
  const dummyAllocations = {
    // Amit Patil (ID: 3)
    3: [
      { district: 'Mumbai', taluka: 'Mumbai Suburban', city: 'Andheri', startDate: '2024-01-01', endDate: '2024-12-31' },
      { district: 'Mumbai', taluka: 'Mumbai Suburban', city: 'Borivali', startDate: '2024-01-01', endDate: '2024-12-31' }
    ],
    // Neha Gupta (ID: 4)
    4: [
      { district: 'Mumbai', taluka: 'Mumbai Suburban', city: 'Malad', startDate: '2024-01-01', endDate: '2024-12-31' },
      { district: 'Mumbai', taluka: 'Mumbai City', city: 'Dadar', startDate: '2024-01-01', endDate: '2024-12-31' }
    ],
    // Rohit Desai (ID: 5)
    5: [
      { district: 'Mumbai', taluka: 'Mumbai City', city: 'Fort', startDate: '2024-01-01', endDate: '2024-12-31' },
      { district: 'Mumbai', taluka: 'Mumbai City', city: 'Colaba', startDate: '2024-01-01', endDate: '2024-12-31' }
    ],
    // Priya Deshmukh (ID: 6)
    6: [
      { district: 'Pune', taluka: 'Pune City', city: 'Kothrud', startDate: '2024-01-01', endDate: '2024-12-31' },
      { district: 'Pune', taluka: 'Pune City', city: 'Shivajinagar', startDate: '2024-01-01', endDate: '2024-12-31' }
    ],
    // Vijay Kulkarni (ID: 7)
    7: [
      { district: 'Pune', taluka: 'Pune City', city: 'Aundh', startDate: '2024-01-01', endDate: '2024-12-31' },
      { district: 'Pune', taluka: 'Pimpri-Chinchwad', city: 'Pimpri', startDate: '2024-01-01', endDate: '2024-12-31' }
    ],
    // Anita Joshi (ID: 8)
    8: [
      { district: 'Pune', taluka: 'Pune City', city: 'Deccan', startDate: '2024-01-01', endDate: '2024-12-31' },
      { district: 'Pune', taluka: 'Haveli', city: 'Kharadi', startDate: '2024-01-01', endDate: '2024-12-31' }
    ],
    // Kiran Rathod (ID: 9)
    9: [
      { district: 'Nashik', taluka: 'Nashik City', city: 'Panchavati', startDate: '2024-01-01', endDate: '2024-12-31' },
      { district: 'Nashik', taluka: 'Nashik City', city: 'Nasik Road', startDate: '2024-01-01', endDate: '2024-12-31' }
    ],
    // Manish Pawar (ID: 10)
    10: [
      { district: 'Nashik', taluka: 'Nashik City', city: 'College Road', startDate: '2024-01-01', endDate: '2024-12-31' },
      { district: 'Nashik', taluka: 'Igatpuri', city: 'Igatpuri', startDate: '2024-01-01', endDate: '2024-12-31' }
    ],
    // Sneha Thakur (ID: 11)
    11: [
      { district: 'Nashik', taluka: 'Nashik City', city: 'Satpur', startDate: '2024-01-01', endDate: '2024-12-31' },
      { district: 'Nashik', taluka: 'Dindori', city: 'Dindori', startDate: '2024-01-01', endDate: '2024-12-31' }
    ],
    // Users under admin@demo.com (ID: 51-55)
    51: [
      { district: 'Thane', taluka: 'Thane City', city: 'Kopri', startDate: '2024-01-01', endDate: '2024-12-31' },
      { district: 'Thane', taluka: 'Thane City', city: 'Kolshet', startDate: '2024-01-01', endDate: '2024-12-31' }
    ],
    52: [
      { district: 'Thane', taluka: 'Kalyan', city: 'Kalyan West', startDate: '2024-01-01', endDate: '2024-12-31' },
      { district: 'Thane', taluka: 'Kalyan', city: 'Dombivli', startDate: '2024-01-01', endDate: '2024-12-31' }
    ],
    53: [
      { district: 'Aurangabad', taluka: 'Aurangabad City', city: 'CIDCO', startDate: '2024-01-01', endDate: '2024-12-31' }
    ],
    54: [
      { district: 'Solapur', taluka: 'Solapur City', city: 'North Solapur', startDate: '2024-01-01', endDate: '2024-12-31' }
    ],
    55: [
      { district: 'Kolhapur', taluka: 'Kolhapur City', city: 'Shahupuri', startDate: '2024-01-01', endDate: '2024-12-31' }
    ]
  };

  // Save to localStorage
  localStorage.setItem('users', JSON.stringify(dummyUsers));
  localStorage.setItem('activityLogs', JSON.stringify(dummyLogs));
  localStorage.setItem('messageHistory', JSON.stringify(dummyMessages));
  localStorage.setItem('dataAllocations', JSON.stringify(dummyAllocations));
  localStorage.setItem('dummyDataInitialized', 'true');

  console.log('✅ Dummy data initialized successfully!');
  console.log('📊 Total Users:', dummyUsers.length);
  console.log('- Main Admin: 1');
  console.log('- Super Admins: 5');
  console.log('- Admins: 13 (including admin@demo.com)');
  console.log('- Regular Users: 37');
  console.log('');
  console.log('📧 Messages:', dummyMessages.length);
  console.log('📍 Data Allocations:', Object.keys(dummyAllocations).length, 'users (including admin@demo.com users)');
  console.log('📝 Activity Logs:', dummyLogs.length);
  console.log('');
  console.log('🏢 Hierarchy Summary:');
  console.log('  Bob Wilson (bob@demo.com): 12 members');
  console.log('  Bharat Patil: 11 members');
  console.log('  Vishal Patil: 12 members');
  console.log('  Draupadi Gurav: 3 members');
  console.log('  Super Admin (superadmin@demo.com): 6 members');
  console.log('  Admin User (admin@demo.com): 5 users ✨');
};

// Reset and reinitialize dummy data
// DISABLED: Using Firebase instead of localStorage
export const resetDummyData = () => {
  console.log('ℹ️ Reset dummy data disabled - using Firebase database');
};

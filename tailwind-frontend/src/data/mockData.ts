export type Task = {
  id: string;
  title: string;
  description: string;
  status: 'To Do' | 'In Progress' | 'Review' | 'Completed';
  priority: 'Low' | 'Mediaum' | 'High' | 'Critical';
  assignee?: User;
  dueDate: string;
  project: Project;
  createdAt: string;
  tags: string[];
  comments: number;
  attachments: number;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Completed' | 'On Hold';
  progress: number;
  dueDate: string;
  owner: User;
  members: User[];
  createdAt: string;
  tasksCount: {
    total: number;
    completed: number;
  };
};

export type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'Admin' | 'Project Manager' | 'Developer' | 'Designer' | 'Tester';
  department: string;
};

export type Activity = {
  id: string;
  user: User;
  action: string;
  target: string;
  timestamp: string;
};

export const users: User[] = [
  {
    id: '1',
    name: 'Alex Morgan',
    email: 'alex@taskflow.com',
    role: 'Admin',
    department: 'Engineering',
  },
  {
    id: '2',
    name: 'Jordan Lee',
    email: 'jordan@taskflow.com',
    role: 'Project Manager',
    department: 'Product',
  },
  {
    id: '3',
    name: 'Taylor Swift',
    email: 'taylor@taskflow.com',
    role: 'Developer',
    department: 'Engineering',
  },
  {
    id: '4',
    name: 'Morgan Freeman',
    email: 'morgan@taskflow.com',
    role: 'Designer',
    department: 'Design',
  },
  {
    id: '5',
    name: 'Casey Jones',
    email: 'casey@taskflow.com',
    role: 'Tester',
    department: 'QA',
  },
];

export const projects: Project[] = [
  {
    id: '1',
    name: 'Website Redesign',
    description: 'Redesigning the company website for better UX and performance',
    status: 'Active',
    progress: 65,
    dueDate: '2025-06-15',
    owner: users[1],
    members: [users[0], users[2], users[3]],
    createdAt: '2025-01-10',
    tasksCount: {
      total: 24,
      completed: 16,
    },
  },
  {
    id: '2',
    name: 'Mobile App Development',
    description: 'Building a native mobile app for iOS and Android',
    status: 'Active',
    progress: 42,
    dueDate: '2025-08-30',
    owner: users[0],
    members: [users[1], users[2], users[4]],
    createdAt: '2025-02-05',
    tasksCount: {
      total: 36,
      completed: 15,
    },
  },
  {
    id: '3',
    name: 'Database Migration',
    description: 'Moving from SQL to NoSQL database architecture',
    status: 'On Hold',
    progress: 20,
    dueDate: '2025-07-22',
    owner: users[2],
    members: [users[0], users[4]],
    createdAt: '2025-03-15',
    tasksCount: {
      total: 18,
      completed: 4,
    },
  },
  {
    id: '4',
    name: 'Marketing Campaign',
    description: 'Q3 digital marketing campaign for product launch',
    status: 'Completed',
    progress: 100,
    dueDate: '2025-04-10',
    owner: users[1],
    members: [users[3]],
    createdAt: '2025-01-25',
    tasksCount: {
      total: 12,
      completed: 12,
    },
  },
];

export const tasks: Task[] = [
  {
    id: '1',
    title: 'Design new homepage layout',
    description: 'Create a responsive design for the homepage with improved UX',
    status: 'Completed',
    priority: 'High',
    assignee: users[3],
    dueDate: '2025-05-10',
    project: projects[0],
    createdAt: '2025-04-25',
    tags: ['design', 'ui/ux'],
    comments: 5,
    attachments: 2,
  },
  {
    id: '2',
    title: 'Implement authentication flow',
    description: 'Add user login, registration, and password reset functionality',
    status: 'In Progress',
    priority: 'Critical',
    assignee: users[2],
    dueDate: '2025-05-18',
    project: projects[0],
    createdAt: '2025-04-28',
    tags: ['frontend', 'security'],
    comments: 3,
    attachments: 1,
  },
  {
    id: '3',
    title: 'Optimize database queries',
    description: 'Improve performance of main dashboard queries',
    status: 'To Do',
    priority: 'Medium',
    assignee: users[2],
    dueDate: '2025-05-25',
    project: projects[2],
    createdAt: '2025-05-01',
    tags: ['backend', 'performance'],
    comments: 2,
    attachments: 0,
  },
  {
    id: '4',
    title: 'Setup CI/CD pipeline',
    description: 'Configure automated testing and deployment',
    status: 'Review',
    priority: 'High',
    assignee: users[0],
    dueDate: '2025-05-12',
    project: projects[0],
    createdAt: '2025-04-22',
    tags: ['devops', 'automation'],
    comments: 4,
    attachments: 3,
  },
  {
    id: '5',
    title: 'Create onboarding screens',
    description: 'Design and implement user onboarding for the mobile app',
    status: 'In Progress',
    priority: 'Medium',
    assignee: users[3],
    dueDate: '2025-06-05',
    project: projects[1],
    createdAt: '2025-05-03',
    tags: ['mobile', 'ui/ux'],
    comments: 1,
    attachments: 4,
  },
  {
    id: '6',
    title: 'Implement push notifications',
    description: 'Add push notification capability to the mobile app',
    status: 'To Do',
    priority: 'Low',
    assignee: users[2],
    dueDate: '2025-06-15',
    project: projects[1],
    createdAt: '2025-05-05',
    tags: ['mobile', 'backend'],
    comments: 0,
    attachments: 1,
  },
  {
    id: '7',
    title: 'Write API documentation',
    description: 'Create comprehensive documentation for REST API endpoints',
    status: 'In Progress',
    priority: 'Medium',
    assignee: users[4],
    dueDate: '2025-05-20',
    project: projects[2],
    createdAt: '2025-04-30',
    tags: ['documentation', 'api'],
    comments: 3,
    attachments: 2,
  },
  {
    id: '8',
    title: 'Conduct user testing',
    description: 'Organize and conduct user testing sessions for new features',
    status: 'To Do',
    priority: 'High',
    assignee: users[4],
    dueDate: '2025-06-02',
    project: projects[1],
    createdAt: '2025-05-06',
    tags: ['testing', 'user research'],
    comments: 2,
    attachments: 0,
  },
];

export const recentActivities: Activity[] = [
  {
    id: '1',
    user: users[2],
    action: 'completed task',
    target: 'Homepage redesign mockups',
    timestamp: '2025-05-07T10:32:00Z',
  },
  {
    id: '2',
    user: users[0],
    action: 'created project',
    target: 'API Integration',
    timestamp: '2025-05-07T09:45:00Z',
  },
  {
    id: '3',
    user: users[1],
    action: 'added comment on',
    target: 'Authentication flow implementation',
    timestamp: '2025-05-07T08:20:00Z',
  },
  {
    id: '4',
    user: users[3],
    action: 'uploaded attachment to',
    target: 'Mobile app wireframes',
    timestamp: '2025-05-06T16:55:00Z',
  },
  {
    id: '5',
    user: users[4],
    action: 'changed status of',
    target: 'User feedback collection',
    timestamp: '2025-05-06T14:30:00Z',
  },
];

export const dashboardStats = {
  tasksCompleted: 28,
  tasksInProgress: 17,
  projectsActive: 3,
  teamMembers: 5,
  upcomingDeadlines: 4,
  overdueItems: 2,
};

export const kanbanColumns = [
  {
    id: 'todo',
    title: 'To Do',
    tasks: tasks.filter(task => task.status === 'To Do'),
  },
  {
    id: 'inprogress',
    title: 'In Progress',
    tasks: tasks.filter(task => task.status === 'In Progress'),
  },
  {
    id: 'review',
    title: 'Review',
    tasks: tasks.filter(task => task.status === 'Review'),
  },
  {
    id: 'completed',
    title: 'Completed',
    tasks: tasks.filter(task => task.status === 'Completed'),
  },
];
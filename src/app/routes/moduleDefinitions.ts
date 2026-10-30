import type { ModuleDefinition } from '../../shared/types/module';

// Report 3: Actors (pp. 11–12) and detailed use cases (pp. 19–29).
export const moduleDefinitions: ModuleDefinition[] = [
  {
    "key": "farm-registration",
    "path": "farm-registration",
    "title": "Farm Registration",
    "ucRange": "UC-09",
    "group": "farm",
    "access": "user",
    "icon": "plus",
    "description": "Submit farm registration request; view details, track status, update or cancel pending request."
  },
  {
    "key": "knowledge",
    "path": "knowledge",
    "title": "Agricultural Knowledge",
    "ucRange": "UC-01–03",
    "group": "public",
    "access": "account",
    "icon": "book",
    "description": "Search, filter, and read public VietGAP farming articles and cultivation guides."
  },
  {
    "key": "ai",
    "path": "ai",
    "title": "AI Assistant",
    "ucRange": "UC-10",
    "group": "ai",
    "access": "user",
    "icon": "bot",
    "description": "Ask questions and receive farming guidance based on approved agricultural standards."
  },
  {
    "key": "ai-history",
    "path": "ai-history",
    "title": "Chat History",
    "ucRange": "UC-11",
    "group": "ai",
    "access": "user",
    "icon": "history",
    "description": "View, search, read details, and manage your AI conversations."
  },
  {
    "key": "ai-feedback",
    "path": "ai-feedback",
    "title": "My Feedback",
    "ucRange": "UC-12",
    "group": "ai",
    "access": "user",
    "icon": "message",
    "description": "Submit, edit, and review feedback; report inaccurate or unsuitable AI responses."
  },
  {
    "key": "profile",
    "path": "profile",
    "title": "User Profile",
    "ucRange": "UC-07",
    "group": "account",
    "access": "account",
    "icon": "user",
    "description": "View and update your personal account information."
  },
  {
    "key": "password",
    "path": "change-password",
    "title": "Change Password",
    "ucRange": "UC-08",
    "group": "account",
    "access": "account",
    "icon": "lock",
    "description": "Verify current password and set a new password for your account."
  },
  {
    "key": "farm",
    "path": "farm",
    "title": "Farm Information",
    "ucRange": "UC-13",
    "group": "farm",
    "access": "farm",
    "icon": "home",
    "description": "View active farm information. Farm owners can update farm details."
  },
  {
    "key": "workers",
    "path": "workers",
    "title": "Labor & Staff",
    "ucRange": "UC-14–15",
    "group": "farm",
    "access": "farm",
    "icon": "user",
    "description": "Manage worker profiles and role assignments within the farm."
  },
  {
    "key": "production",
    "path": "production-areas",
    "title": "Zones & Blocks",
    "ucRange": "UC-16–17",
    "group": "production",
    "access": "farm",
    "icon": "plots",
    "description": "View zones and manage blocks. Farm owners can create and delete zones."
  },
  {
    "key": "environment",
    "path": "environment",
    "title": "Conditions & Environment",
    "ucRange": "UC-18–21",
    "group": "production",
    "access": "farm",
    "icon": "drop",
    "description": "Record block conditions; manage soil, water assessments, and environmental risks."
  },
  {
    "key": "seasons",
    "path": "crop-seasons",
    "title": "Crop Seasons",
    "ucRange": "UC-22",
    "group": "operations",
    "access": "farm",
    "icon": "calendar",
    "description": "Manage crop seasons and planting schedules across farm blocks."
  },
  {
    "key": "tasks",
    "path": "tasks",
    "title": "Tasks & Assignments",
    "ucRange": "UC-23",
    "group": "operations",
    "access": "farm",
    "icon": "check",
    "description": "View and update assigned tasks. Farm owners assign and approve task completion."
  },
  {
    "key": "activities",
    "path": "activities",
    "title": "Farming Diary",
    "ucRange": "UC-24",
    "group": "operations",
    "access": "farm",
    "icon": "book",
    "description": "Record and monitor daily farming activities within assigned areas."
  },
  {
    "key": "materials",
    "path": "materials",
    "title": "Material Usage",
    "ucRange": "UC-25",
    "group": "operations",
    "access": "farm",
    "icon": "box",
    "description": "Record and monitor fertilizer, pesticide, and seed usage for farming activities."
  },
  {
    "key": "harvests",
    "path": "harvests",
    "title": "Harvest & Traceability",
    "ucRange": "UC-26, 30",
    "group": "operations",
    "access": "farm",
    "icon": "leaf",
    "description": "Record harvest batches and view origin traceability reports."
  },
  {
    "key": "training",
    "path": "training",
    "title": "Training",
    "ucRange": "UC-27",
    "group": "compliance",
    "access": "farm",
    "icon": "book",
    "description": "Record and update internal training sessions and worker certifications."
  },
  {
    "key": "checklists",
    "path": "checklists",
    "title": "VietGAP Checklists",
    "ucRange": "UC-28",
    "group": "compliance",
    "access": "farm",
    "icon": "check",
    "description": "Verify production compliance criteria according to VietGAP standards."
  },
  {
    "key": "assessments",
    "path": "assessments",
    "title": "Internal Assessments",
    "ucRange": "UC-29",
    "group": "compliance",
    "access": "farm",
    "icon": "check",
    "description": "Create and review internal farm inspection and audit reports."
  },
  {
    "key": "reports",
    "path": "reports",
    "title": "Production Reports",
    "ucRange": "UC-31",
    "group": "reports",
    "access": "farm",
    "icon": "report",
    "description": "View production analytics and seasonal summaries. Export reports."
  },
  {
    "key": "ai-drafts",
    "path": "ai-drafts",
    "title": "AI Farming Drafts",
    "ucRange": "UC-32",
    "group": "ai",
    "access": "farm",
    "icon": "bot",
    "description": "Generate, review, confirm, or discard AI-assisted cultivation drafts."
  },
  {
    "key": "members",
    "path": "members",
    "title": "Staff & Assignments",
    "ucRange": "UC-33–34",
    "group": "farm",
    "access": "owner",
    "icon": "user",
    "description": "Manage farm members and technical staff assigned to production areas."
  },
  {
    "key": "suppliers",
    "path": "suppliers",
    "title": "Suppliers",
    "ucRange": "UC-35",
    "group": "operations",
    "access": "owner",
    "icon": "box",
    "description": "Manage agricultural material and equipment suppliers."
  },
  {
    "key": "purchases",
    "path": "purchases",
    "title": "Material Purchases",
    "ucRange": "UC-36",
    "group": "operations",
    "access": "owner",
    "icon": "box",
    "description": "Record, search, and update procurement logs for agricultural inputs."
  },
  {
    "key": "expenses",
    "path": "expenses",
    "title": "Costs & Expenses",
    "ucRange": "UC-37",
    "group": "reports",
    "access": "owner",
    "icon": "money",
    "description": "Track production expenditures and view season cost summaries."
  },
  {
    "key": "admin",
    "path": "admin",
    "title": "System Administration",
    "ucRange": "UC-38–44",
    "group": "admin",
    "access": "admin",
    "icon": "report",
    "description": "Review farm registrations; manage users, content, AI feedback, and system analytics."
  },
  {
    "key": "admin-registrations",
    "path": "admin/registrations",
    "title": "Farm Registrations",
    "ucRange": "UC-38",
    "icon": "plots",
    "description": "Review, approve, or reject pending farm registrations.",
    "group": "admin",
    "access": "admin"
  },
  {
    "key": "admin-users",
    "path": "admin/users",
    "title": "User Accounts",
    "ucRange": "UC-39",
    "icon": "user",
    "description": "Search, view details, and lock or unlock user accounts.",
    "group": "admin",
    "access": "admin"
  },
  {
    "key": "admin-crops",
    "path": "admin/crops",
    "title": "Crop Categories",
    "ucRange": "UC-40",
    "icon": "leaf",
    "description": "Create, edit, and manage crop category catalog.",
    "group": "admin",
    "access": "admin"
  },
  {
    "key": "admin-rules",
    "path": "admin/rules",
    "title": "Checklist Rules",
    "ucRange": "UC-41",
    "icon": "check",
    "description": "Manage inspection criteria, scopes, and compliance thresholds.",
    "group": "admin",
    "access": "admin"
  },
  {
    "key": "admin-articles",
    "path": "admin/articles",
    "title": "Knowledge Articles",
    "ucRange": "UC-42",
    "icon": "book",
    "description": "Draft, review, publish, and archive farming knowledge articles.",
    "group": "admin",
    "access": "admin"
  },
  {
    "key": "admin-feedback",
    "path": "admin/feedback",
    "title": "AI Feedback Review",
    "ucRange": "UC-43",
    "icon": "message",
    "description": "Review, respond to, and manage user feedback on AI responses.",
    "group": "admin",
    "access": "admin"
  },
  {
    "key": "admin-statistics",
    "path": "admin/statistics",
    "title": "System Analytics",
    "ucRange": "UC-44",
    "icon": "report",
    "description": "View system analytics for users, seasons, costs, and compliance.",
    "group": "admin",
    "access": "admin"
  },
  {
    "key": "admin-audit",
    "path": "admin/audit",
    "title": "Audit Logs",
    "ucRange": "§3.9.5",
    "icon": "history",
    "description": "Look up administrative activity and audit history.",
    "group": "admin",
    "access": "admin"
  }
];

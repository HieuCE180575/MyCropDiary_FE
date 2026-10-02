# Frontend roles — Report 3 v1.0

Reference: Actors, PDF pages 11–12; User diagram, page 14; detailed use cases,
pages 19–29. The three-role screen matrix on page 122 conflicts with these
sections; this implementation follows the detailed User / Farm Staff / Farm
Owner / Administrator model requested by the user.

- A User starts in a personal workspace: profile, password, farm registration,
  public knowledge, AI questions, their conversation history and AI feedback.
- Selecting an active farm enables its operational screens according to that
  farm's `currentUserRole`. Permissions are not combined across farms.
- Staff can access operational screens. Expenses, suppliers, purchases and
  staff membership/area assignment administration require Owner.
- Worker records (UC-14–15) are separate from staff accounts (UC-33–34).
- General AI questions (UC-10) are separate from farming record drafts (UC-32).
- Administrator alone does not gain operational farm permissions.
- The menu and route guard use the same policy. Unknown roles fail closed.
- The farm list is paginated; all pages are read when loading workspace choices.
  The existing backend returns `currentUserRole` from active memberships. Only
  ACTIVE farms with OWNER/STAFF roles become available workspaces.
- A farm load failure offers retry without blocking personal functions or
  assuming the user has no farms. Workspace state clears with the login session.

The dashboard contains navigation and an explanation of registration steps,
not fabricated application counts, submitted registrations or AI history.
Profile displays the identity returned by login; farm details display the
selected farm returned by the existing API. Unimplemented workflows retain an
explicit development state. This change does not implement all report CRUD
workflows or change backend authorization. Backend endpoints must continue to
validate ownership, active membership and staff area assignments independently.

Validation: `npm test`, `npm run build`.

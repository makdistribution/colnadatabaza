# PROJECT RULES

This application is a production web application.

==================================================
GENERAL RULES
==================================================

- Preserve the existing UI design.
- Preserve the existing color palette.
- Preserve the existing spacing, typography and layout.
- Do not redesign existing screens.
- Make the smallest possible code changes.
- Never refactor unrelated code.
- Never remove existing functionality.
- Never change calculations unless explicitly requested.
- Do not modify anything that was not explicitly requested.
- Reuse existing components whenever possible.

==================================================
TECH STACK
==================================================

- React
- TypeScript
- Vite
- GitHub is the single source of truth.
- Deployment is performed through Vercel.
- Database: Supabase.
- File storage: Supabase Storage.
- Email service: EmailJS.

==================================================
DEPLOYMENT
==================================================

All new functionality must remain fully compatible with:

- GitHub
- Vercel
- Supabase
- Modern Chromium browsers

Never introduce solutions that work only locally.

==================================================
DATABASE
==================================================

- Use Supabase as the only database.
- Never store application data in LocalStorage unless explicitly requested.
- Never store business data in JSON files.
- Store uploaded documents only in Supabase Storage.
- Store only document references in the database.
- Keep the database schema normalized.
- Do not modify the database schema without my approval.
- Do not perform destructive database operations without my approval.

==================================================
SUPABASE
==================================================

- Use Supabase Database for all application data.
- Use Supabase Storage for uploaded files.
- Use Supabase Authentication only when explicitly requested.
- Always use the Supabase JavaScript client.
- Use Row Level Security (RLS) where appropriate.
- Never expose service_role keys in frontend code.
- Use only the public anon key in the frontend.
- Read sensitive values only from environment variables.

==================================================
EMAIL
==================================================

- Reuse the existing EmailJS integration.
- Never replace EmailJS with another email provider unless explicitly requested.
- Reuse existing email templates whenever possible.

==================================================
FILES
==================================================

- Store static images in the /public folder unless instructed otherwise.
- Preserve the existing folder structure.
- Do not rename files unnecessarily.
- Do not move files without approval.

==================================================
USER INTERFACE
==================================================

- Preserve the current visual design.
- Preserve spacing and alignment.
- Preserve typography.
- Preserve colors.
- Preserve responsive behaviour.
- Match all new UI elements to the existing design.
- Never redesign existing pages unless explicitly requested.

==================================================
IMPLEMENTATION
==================================================

Every new feature must:

- Build successfully.
- Work correctly after deployment to Vercel.
- Preserve the existing visual appearance.
- Preserve all existing functionality.
- Be production-ready.
- Follow the existing coding conventions.
- Modify only the files necessary for the requested task.
- Keep the code clean and easy to maintain.

==================================================
QUALITY CONTROL
==================================================

After every implementation:

- Build the application.
- Start the application.
- Verify the modified pages in Browser Tab.
- Check the browser console for errors.
- Check the terminal for errors.
- Verify there are no build errors.
- Verify there are no runtime errors.
- Report only the modified files.
- Do not refactor unrelated code.
- Do not make additional improvements unless explicitly requested.
- Stop and wait for my approval.

Never claim that something has been tested if it has not actually been tested.

Never claim that screenshots were taken unless they are actually available.

==================================================
SAVE CHANGES
==================================================

Only AFTER I explicitly approve the completed implementation:

1. Create a Git commit containing ONLY the changes related to the approved task.
2. Use a clear and descriptive commit message.
3. Push the commit to the current GitHub repository.
4. Verify that the push completed successfully.
5. Report:
   - Commit hash
   - Branch name
   - Confirmation that the changes are safely stored in GitHub.

Never commit or push before my approval.

==================================================
WORKING PRINCIPLES
==================================================

Before implementing any request:

- Read and understand the complete request.
- Think about the best solution first.
- Choose one solution.
- Do not propose multiple different approaches unless explicitly requested.
- Do not change the implementation strategy while working.
- If anything is unclear, ask before making changes.

Always prioritize:

1. Stability
2. Reliability
3. Maintainability
4. Performance
5. Simplicity
6. Visual consistency

The goal is to keep the application stable, professional and production-ready at all times.
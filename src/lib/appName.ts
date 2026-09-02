import { env } from '$env/dynamic/public';

// Deployment branding: set PUBLIC_APP_NAME to rename the app everywhere it
// shows its own name (header, titles, reminder emails).
export const appName = env.PUBLIC_APP_NAME || 'billkeeper';

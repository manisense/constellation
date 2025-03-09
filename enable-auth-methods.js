/**
 * FIREBASE AUTHENTICATION SETUP GUIDE
 * 
 * To fix the "auth/operation-not-allowed" error, you need to enable Email/Password
 * authentication in your Firebase project.
 * 
 * Follow these steps:
 * 
 * 1. Go to the Firebase Console: https://console.firebase.google.com/
 * 2. Select your project: "constellation-couple"
 * 3. In the left sidebar, click on "Authentication"
 * 4. Click on the "Sign-in method" tab
 * 5. Find "Email/Password" in the list and click on it
 * 6. Toggle the "Enable" switch to ON
 * 7. Click "Save"
 * 
 * For Google Authentication:
 * 1. In the same "Sign-in method" tab, find "Google" in the list
 * 2. Toggle the "Enable" switch to ON
 * 3. Configure your OAuth consent screen if prompted
 * 4. Add your support email
 * 5. Click "Save"
 * 
 * After enabling these authentication methods, restart your app and try again.
 * The "auth/operation-not-allowed" error should be resolved.
 */

console.log("Please follow the instructions in this file to enable authentication methods in Firebase.");
console.log("After enabling the authentication methods, restart your app."); 
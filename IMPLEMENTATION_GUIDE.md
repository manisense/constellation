# Constellation App Implementation Guide

This guide provides step-by-step instructions for fixing issues in the Constellation app related to profile saving, message sending, image sharing, and sign-out functionality.

## Prerequisites

Before beginning the implementation, ensure you have:

1. Access to the Supabase project dashboard
2. Access to the codebase repository
3. A development environment set up for testing

## Step 1: Fix Database Structure

The first step is to fix the database structure to ensure all necessary columns and functions exist.

1. Navigate to the Supabase SQL Editor
2. Copy the contents of the `fix_database_structure.sql` file
3. Run the script in the SQL Editor
4. Verify that the script executes successfully without errors

This script will:
- Add missing columns to the profiles table (star_name, avatar_url, photo_url, star_type, about, interests)
- Migrate data from incorrectly named columns (e.g., starName to star_name)
- Ensure consistency between avatar_url and photo_url fields
- Create or replace necessary functions for profile management and messaging
- Set up real-time publication for messages

## Step 2: Fix Storage Bucket

Next, fix the storage bucket for chat images:

1. Navigate to the Supabase SQL Editor
2. Copy the contents of the `fix_storage_bucket.sql` file
3. Run the script in the SQL Editor
4. Verify that the script executes successfully without errors

This script will:
- Create the chat_images bucket if it doesn't exist
- Rename the bucket from chat-images to chat_images if needed
- Set appropriate bucket settings (private access)
- Create policies to allow authenticated users to view and upload images to constellations they belong to

## Step 3: Update Supabase Utility Functions

Update the Supabase utility functions to improve error handling and add fallback mechanisms:

1. Open the `src/utils/supabase.ts` file
2. Update the following functions:
   - `updateProfile`: Ensure it handles both avatar_url and photo_url fields
   - `getProfile`: Add proper error handling
   - `getConstellationMessages`: Fix ambiguous column references
   - `sendMessage`: Improve error handling
   - `getPartnerProfile`: Add proper error handling
   - `increaseBondingStrength`: Ensure it works correctly

## Step 4: Fix Profile Screen

Fix the profile screen to handle avatar/photo saving correctly:

1. Open the `src/screens/ProfileScreen.tsx` file
2. Update the profile update logic to handle both avatar_url and photo_url fields
3. Ensure proper error handling during image uploads
4. Add loading states during profile updates

## Step 5: Fix Chat Image Upload and Message Sending

Fix the image upload and message sending functionality:

1. Open the `src/utils/clientFixes.ts` file
2. Update the `uploadImage` function to:
   - Check if the bucket exists
   - Handle both iOS and Android image paths
   - Provide proper error handling
3. Update the `sendMessage` function to:
   - Handle image attachments correctly
   - Provide proper error handling
4. Ensure the `setupMessageSubscription` function works correctly

## Step 6: Fix Sign-Out Functionality

Fix the sign-out functionality:

1. Open the `src/screens/SettingsScreen.tsx` file
2. Update the sign-out button's onPress handler to:
   - Add a loading state during sign-out
   - Catch and handle errors
   - Provide user feedback through alerts

## Testing the Fixes

After implementing all fixes, test the following functionality:

### 1. Profile Photo Saving
- Navigate to the Profile screen
- Upload a new profile photo
- Save the profile
- Verify that the photo appears correctly after saving

### 2. Message Sending
- Navigate to a constellation chat
- Type a message and send it
- Verify that the message appears in the chat

### 3. Image Sharing in Chat
- Navigate to a constellation chat
- Select an image to share
- Send the image
- Verify that the image appears in the chat

### 4. Sign-Out Functionality
- Navigate to the Settings screen
- Tap the Sign Out button
- Verify that you are signed out and redirected to the login screen

## Troubleshooting

### Database Issues
- Check the Supabase logs for SQL errors
- Verify that all functions were created successfully
- Test functions directly in the SQL Editor

### Storage Issues
- Verify that the chat_images bucket exists
- Check that the policies are correctly applied
- Test uploading an image directly through the Supabase dashboard

### Client-Side Issues
- Check the console logs for errors
- Verify that the correct bucket name is being used (chat_images)
- Ensure that authentication is working correctly

## Notes

- These fixes maintain backward compatibility with existing data
- Error handling has been improved throughout the app
- Real-time message subscriptions should now work correctly

If you encounter any issues during implementation, please refer to the detailed comments in each file for additional guidance. 
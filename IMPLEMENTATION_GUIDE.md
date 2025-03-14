# Constellation App Implementation Guide

This guide provides step-by-step instructions for implementing fixes and new features in the Constellation app. Follow these steps to ensure proper functionality for profile saving, message sending, image sharing, sign-out, date plans, and memories.

## Prerequisites

Before beginning the implementation, ensure you have:

1. Access to the Supabase project dashboard
2. Access to the codebase repository
3. Development environment set up for testing

## Step 1: Fix Database Structure

1. Navigate to the Supabase SQL Editor
2. Copy the contents of `fix_database_structure.sql`
3. Run the script in the SQL Editor
4. Verify that the script executes successfully without errors

This script addresses:
- Missing columns in the profiles table
- Data migration from incorrectly named columns
- Creation of necessary database functions
- Implementation of Row Level Security (RLS) policies

## Step 2: Fix Storage Bucket

1. Navigate to the Supabase SQL Editor
2. Copy the contents of `fix_storage_bucket.sql`
3. Run the script in the SQL Editor
4. Verify that the script executes successfully without errors

This script:
- Creates the `chat_images` bucket if it doesn't exist
- Renames the bucket from `chat-images` to `chat_images` if necessary
- Sets up access policies for authenticated users

## Step 3: Add New Features

1. Navigate to the Supabase SQL Editor
2. Copy the contents of `fix_new_features.sql`
3. Run the script in the SQL Editor
4. Verify that the script executes successfully without errors

This script:
- Creates tables for date plans and memories
- Sets up RLS policies for the new tables
- Creates functions for managing date plans and memories
- Creates a storage bucket for memory images with appropriate policies

## Step 4: Add Memories Storage Bucket

1. Navigate to the Supabase SQL Editor
2. Copy the contents of `fix_memories_bucket.sql`
3. Run the script in the SQL Editor
4. Verify that the script executes successfully without errors

This script:
- Creates the `memories` bucket if it doesn't exist
- Sets up access policies for authenticated users to view and upload memory images
- Adds policies for users to update and delete their own uploads

## Step 5: Update Supabase Utility Functions

1. Open the file `src/utils/supabase.ts`
2. Update the file with improved error handling and fallback mechanisms
3. Ensure consistent handling of `avatar_url` and `photo_url` fields
4. Add comprehensive logging for debugging

Key functions to update:
- `updateProfile`
- `getProfile`
- `getConstellationMessages`
- `sendMessage`
- `getPartnerProfile`
- `increaseBondingStrength`

## Step 6: Fix Profile Screen

1. Open the file `src/screens/ProfileScreen.tsx`
2. Update the profile photo/avatar saving functionality
3. Correct field names and improve the image upload process
4. Enhance error handling and user feedback during uploads

## Step 7: Fix Chat Image Upload and Message Sending

1. Open the file `src/utils/clientFixes.ts`
2. Update image upload functionality for both iOS and Android
3. Improve error handling and bucket existence checks
4. Enhance message sending reliability

## Step 8: Fix Sign-Out Functionality

1. Open the file `src/screens/SettingsScreen.tsx`
2. Update the sign-out process with loading states and error handling
3. Improve user feedback during sign-out

## Step 9: Add New Screens

1. Add the DatePlansScreen component:
   - Copy the contents of `src/screens/DatePlansScreen.tsx` to your project
   - Ensure all imports are correctly resolved

2. Add the MemoriesScreen component:
   - Copy the contents of `src/screens/MemoriesScreen.tsx` to your project
   - Ensure all imports are correctly resolved

3. Update navigation types in `src/types/index.ts` to include the new screens

4. Update the HomeScreen to include navigation to the new features

## Testing the Fixes

After implementing all fixes, test the following functionality:

### Profile Photo Saving
1. Navigate to the Profile screen
2. Upload a new profile photo
3. Save the profile
4. Verify the photo appears correctly after reloading

### Message Sending
1. Navigate to the Chat screen
2. Send a text message
3. Verify the message appears in the chat
4. Verify real-time updates work correctly

### Image Sharing in Chat
1. Navigate to the Chat screen
2. Send an image
3. Verify the image appears in the chat
4. Verify the image can be viewed by both users

### Sign-Out Functionality
1. Navigate to the Settings screen
2. Tap the Sign Out button
3. Verify the app signs out correctly
4. Verify you can sign back in

### Date Plans
1. Navigate to the Date Plans screen
2. Create a new date plan
3. Verify the plan appears in the list
4. Update the status of a plan
5. Verify the status changes correctly

### Memories
1. Navigate to the Memories screen
2. Create a new memory with an image
3. Verify the memory appears in the list
4. Verify the image appears correctly

## Troubleshooting

### Database Issues
- Check the Supabase logs for SQL errors
- Verify that all tables have the correct columns
- Ensure RLS policies are correctly applied

### Storage Issues
- Verify that the storage buckets exist
- Check bucket policies for correct permissions
- Test file uploads directly through the Supabase dashboard

### Client-Side Issues
- Check console logs for errors
- Verify network requests in the developer tools
- Test with different devices and platforms

## Notes

- These fixes maintain backward compatibility with existing data
- Error handling has been improved throughout the app
- Real-time message subscriptions should work correctly
- The bonding strength feature is now more reliable

If you encounter any issues during implementation, please refer to the detailed comments in the code or contact the development team for assistance. 
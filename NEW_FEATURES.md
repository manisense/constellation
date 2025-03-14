# New Features in Constellation App

This document provides an overview of the new features added to the Constellation app to enhance the user experience and strengthen the bond between partners.

## Date Plans

The Date Plans feature allows couples to plan and track their dates, helping them spend quality time together.

### Key Functionality

- **Create Date Plans**: Users can create new date plans with details like title, description, date, and location.
- **Track Status**: Date plans can be marked as planned, completed, or cancelled.
- **Bonding Strength**: Completing date plans increases the constellation's bonding strength.
- **Shared View**: Both partners can see all date plans in their constellation.

### Technical Implementation

- New `date_plans` table in the database with appropriate RLS policies
- Database functions for adding and updating date plans
- DatePlansScreen component with form for adding new plans and list view of existing plans
- Integration with the bonding strength mechanism

## Memories

The Memories feature allows couples to save and revisit special moments they've shared together.

### Key Functionality

- **Create Memories**: Users can save memories with a title, description, date, and optional photo.
- **Photo Upload**: Support for uploading and displaying photos with memories.
- **Chronological View**: Memories are displayed in reverse chronological order.
- **Bonding Strength**: Adding memories increases the constellation's bonding strength.

### Technical Implementation

- New `memories` table in the database with appropriate RLS policies
- New `memories` storage bucket for storing photos
- Database functions for adding and retrieving memories
- MemoriesScreen component with form for adding new memories and card view of existing memories
- Image picker and upload functionality

## Home Screen Updates

The Home Screen has been updated to include navigation to the new features.

### Key Changes

- Added "Date Plans" and "Memories" options to the Daily Activities section
- Updated navigation to support the new screens
- Improved activity handling to direct users to the appropriate screens

## Database Changes

Several database changes were made to support the new features:

- New tables: `date_plans` and `memories`
- New storage bucket: `memories`
- New database functions:
  - `get_date_plans`
  - `add_date_plan`
  - `update_date_plan_status`
  - `get_memories`
  - `add_memory`
- Row Level Security (RLS) policies for the new tables and storage bucket

## Benefits for Users

These new features provide several benefits for users:

1. **Strengthened Relationship**: Planning dates and saving memories helps couples build a stronger bond.
2. **Better Organization**: Couples can keep track of their plans and memories in one place.
3. **Shared Experiences**: Both partners can contribute to and view the shared content.
4. **Visual History**: The ability to include photos with memories creates a visual history of the relationship.
5. **Increased Engagement**: More features give users more reasons to use the app regularly.

## Future Enhancements

Potential future enhancements for these features could include:

- Date suggestions based on interests
- Date reminders and notifications
- Memory collections or albums
- Memory sharing to social media
- Anniversary reminders based on saved memories
- Integration with calendar apps for date planning 
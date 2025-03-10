# Constellation App with Supabase Authentication

This is a React Native Expo app that uses Supabase for authentication and data storage. The app allows users to create and join "constellations" - a metaphor for connections between people.

## Features

- Email/Password Authentication
- User Profile Management
- Create and Join Constellations
- Real-time Chat
- Quiz and Star Type Assignment

## Setup Instructions

### 1. Supabase Setup

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your Supabase URL and anon key from the project settings
4. Update the `src/services/supabase.ts` file with your Supabase URL and anon key

### 2. Database Setup

Run the following SQL in your Supabase SQL editor to create the necessary tables:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  about TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  hasConstellation BOOLEAN DEFAULT FALSE,
  starType TEXT,
  interests TEXT[] DEFAULT '{}',
  PRIMARY KEY (id)
);

-- Create constellations table
CREATE TABLE constellations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invite_code TEXT UNIQUE NOT NULL
);

-- Create constellation members table
CREATE TABLE constellation_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  constellation_id UUID REFERENCES constellations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(constellation_id, user_id)
);

-- Create messages table
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  constellation_id UUID REFERENCES constellations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE constellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE constellation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone." ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile." ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Constellations are viewable by members." ON constellations
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM constellation_members WHERE constellation_id = id
    )
  );

CREATE POLICY "Users can create constellations." ON constellations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Constellation members are viewable by constellation members." ON constellation_members
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM constellation_members WHERE constellation_id = constellation_id
    )
  );

CREATE POLICY "Users can join constellations." ON constellation_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Messages are viewable by constellation members." ON messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM constellation_members WHERE constellation_id = constellation_id
    )
  );

CREATE POLICY "Users can insert messages in their constellations." ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT user_id FROM constellation_members WHERE constellation_id = constellation_id
    )
  );
```

### 3. Enable Email Authentication

1. In your Supabase project, go to Authentication > Providers
2. Enable Email provider
3. Configure according to your needs (e.g., enable/disable email confirmation)

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the App

```bash
npx expo start
```

## Development

### Building a Development Client

To build a development client for testing on a physical device:

```bash
# Make the script executable
chmod +x build-dev-client.sh

# Run the script
./build-dev-client.sh
```

### Project Structure

- `src/components`: Reusable UI components
- `src/constants`: App constants and theme
- `src/hooks`: Custom React hooks
- `src/navigation`: Navigation setup
- `src/provider`: Context providers
- `src/screens`: App screens
- `src/services`: API services (Supabase)
- `src/types`: TypeScript type definitions
- `src/utils`: Utility functions

## Troubleshooting

### Authentication Issues

- Make sure your Supabase URL and anon key are correct
- Check if email authentication is enabled in your Supabase project
- Verify that the database tables and policies are set up correctly

### Database Issues

- Check the Supabase logs for any errors
- Verify that the tables are created with the correct schema
- Make sure the Row Level Security policies are set up correctly

## License

MIT 
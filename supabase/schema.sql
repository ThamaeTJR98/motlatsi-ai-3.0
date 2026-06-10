-- 1. Profiles Table (Extends Auth.Users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'student',
  school TEXT,
  current_grade TEXT DEFAULT '1',
  ai_credits INTEGER DEFAULT 5,
  is_demo BOOLEAN DEFAULT FALSE,
  completed_topics TEXT[] DEFAULT '{}',
  linked_student_ids TEXT[] DEFAULT '{}',
  parent_link_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Student Activity Table
CREATE TABLE student_activity (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  topic_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Schedules Table
CREATE TABLE schedules (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  day TEXT NOT NULL,
  time TEXT NOT NULL,
  subject TEXT NOT NULL,
  type TEXT NOT NULL,
  notes TEXT,
  linked_topic_id TEXT,
  is_auto_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for Activity
CREATE POLICY "Students can view their own activity" ON student_activity FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can insert their own activity" ON student_activity FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Policies for Schedules
CREATE POLICY "Users can view their own schedule" ON schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own schedule" ON schedules FOR ALL USING (auth.uid() = user_id);

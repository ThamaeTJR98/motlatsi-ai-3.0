-- Initial Production Schema for Motlatsi

-- 1. Organizations (Schools)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    ai_quota INTEGER DEFAULT 5000,
    used_quota INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Users (Extends Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin', 'parent')),
    name TEXT NOT NULL,
    email TEXT,
    organization_id UUID REFERENCES organizations(id),
    current_grade TEXT,
    subject TEXT,
    ai_credits INTEGER DEFAULT 5,
    parent_link_code TEXT UNIQUE,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Classrooms
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    join_code TEXT UNIQUE NOT NULL,
    grade TEXT NOT NULL,
    subject TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Classroom Students (Mapping)
CREATE TABLE classroom_students (
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (classroom_id, student_id)
);

-- 5. Student Activity (Progress Tracking)
CREATE TABLE student_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL,
    activity_type TEXT NOT NULL, -- e.g., 'quiz', 'flashcard', 'visual_guide'
    score INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_activity ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Teachers can view their classrooms
CREATE POLICY "Teachers can view own classrooms" ON classrooms
    FOR SELECT USING (auth.uid() = teacher_id);

-- Teachers can create classrooms
CREATE POLICY "Teachers can create classrooms" ON classrooms
    FOR INSERT WITH CHECK (auth.uid() = teacher_id);

-- Students can view classrooms they are in
CREATE POLICY "Students can view joined classrooms" ON classrooms
    FOR SELECT USING (
        id IN (SELECT classroom_id FROM classroom_students WHERE student_id = auth.uid())
    );

-- Students can join classrooms
CREATE POLICY "Students can join classrooms" ON classroom_students
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Teachers can view students in their classrooms
CREATE POLICY "Teachers can view students in their classrooms" ON classroom_students
    FOR SELECT USING (
        classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
    );

-- Students can view and insert their own activity
CREATE POLICY "Students can view own activity" ON student_activity
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own activity" ON student_activity
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Teachers can view activity of students in their classrooms
CREATE POLICY "Teachers can view student activity" ON student_activity
    FOR SELECT USING (
        student_id IN (
            SELECT student_id FROM classroom_students 
            WHERE classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = auth.uid())
        )
    );

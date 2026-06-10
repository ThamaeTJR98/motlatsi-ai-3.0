
import React, { useState, useEffect, useRef, Suspense, cloneElement, ReactElement } from 'react';
import { UserRole, UserState, Topic, AccessibilitySettings, Curriculum, StudyMode, AppView } from './types';
import { curriculumData as defaultCurriculum } from './curriculum';
import { LearningEngineProvider, useLearningEngine } from './contexts/LearningEngineContext';
import { AuthProvider, useAuth } from './contexts/AuthContext'; 
import { VoiceAccessProvider, useVoiceAccess } from './contexts/VoiceAccessContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { seedDemoData } from './utils/demoDataSeeder'; 
import { 
  Map, LayoutDashboard, UserCircle, PenTool, LogOut, Shield, Library, Settings, 
  BookOpenCheck, Users, CalendarDays, Key, BookCopy, Swords, Loader2, AlertCircle, X, Gamepad2,
  Cpu, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Network } from '@capacitor/network';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './lib/supabase';

// Critical Path Components (Eager Load)
import Dashboard from './components/Dashboard';
import ArcadeDashboard from './components/ArcadeDashboard';
import LudoBattle from './components/LudoBattle';
import Login from './components/Login';
import MotlatsiLogo from './components/MotlatsiLogo';
import BlindModeUI from './components/BlindModeUI'; 
import BattleArena from './components/BattleArena';
import ErrorBoundary from './components/ErrorBoundary';
import NetworkStatus from './components/NetworkStatus'; 
import TeacherDashboard from './components/TeacherDashboard'; // Eager load for debugging

// Lazy Load Heavy Components
const LessonWizard = React.lazy(() => import('./components/LessonWizard'));
const WorksheetGenerator = React.lazy(() => import('./components/WorksheetGenerator')); 
const JourneyMap = React.lazy(() => import('./components/JourneyMap'));
const SocraticChat = React.lazy(() => import('./components/SocraticChat'));
const ChalkboardView = React.lazy(() => import('./components/ChalkboardView'));
import ResourceLibrary from './components/ResourceLibrary';
// const ResourceLibrary = React.lazy(() => import('./components/ResourceLibrary'));
const UserProfile = React.lazy(() => import('./components/UserProfile'));
const QuizInterface = React.lazy(() => import('./components/QuizInterface'));
const StudentHub = React.lazy(() => import('./components/StudentHub'));
const TeacherClassroom = React.lazy(() => import('./components/TeacherClassroom'));
// const TeacherDashboard = React.lazy(() => import('./components/TeacherDashboard')); // Commented out
const SmartScheduler = React.lazy(() => import('./components/SmartScheduler'));
const ParentDashboard = React.lazy(() => import('./components/ParentDashboard'));
const ChoiceHub = React.lazy(() => import('./components/ChoiceHub'));
const InclusiveFlashcard = React.lazy(() => import('./components/InclusiveFlashcard'));
const InclusiveAudio = React.lazy(() => import('./components/InclusiveAudio'));
const InclusiveQuiz = React.lazy(() => import('./components/InclusiveQuiz'));
const InteractiveLesson = React.lazy(() => import('./components/InteractiveLesson')); 
const RevisionNotes = React.lazy(() => import('./components/RevisionNotes'));
const AccessibilitySettingsView = React.lazy(() => import('./components/AccessibilitySettings'));
const StudentLibrary = React.lazy(() => import('./components/StudentLibrary'));
const FlashcardArcade = React.lazy(() => import('./components/FlashcardArcade'));
const Morabaraba = React.lazy(() => import('./components/games/Morabaraba'));
const MemoryArchives = React.lazy(() => import('./components/games/MemoryArchives'));
const WordScramble = React.lazy(() => import('./components/games/WordScramble'));

// Admin Dedicated Components
const AdminOverview = React.lazy(() => import('./components/AdminOverview'));
const AdminUsers = React.lazy(() => import('./components/AdminUsers'));
const AdminCurriculum = React.lazy(() => import('./components/AdminCurriculumManager'));

// Lazy Load Bulk Planner Components
const BulkPlannerDashboard = React.lazy(() => import('./components/BulkPlannerDashboard'));
const BulkUnitCreator = React.lazy(() => import('./components/BulkUnitCreator'));
const BulkReporter = React.lazy(() => import('./components/BulkReporter'));
const ParentPortal = React.lazy(() => import('./components/ParentPortal'));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
        },
    },
});

const LoadingFallback = () => (
    <div className="flex flex-col items-center justify-center h-full w-full min-h-[50vh] text-teacherBlue/50 animate-pulse">
        <Loader2 className="animate-spin mb-2" size={32} />
        <span className="text-xs font-bold uppercase tracking-widest">Loading Resource...</span>
    </div>
);

import { aiClient } from './utils/aiClient';

const MagicGestureListener: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { toggleBlindMode, playEarcon } = useVoiceAccess();
    const pressTimer = useRef<any>(null);
    const warningTimer = useRef<any>(null);
    const hasTriggered = useRef(false);

    const startPress = () => {
        hasTriggered.current = false;
        warningTimer.current = setTimeout(() => {
            if (!hasTriggered.current) {
                playEarcon('rising');
            }
        }, 1000);

        pressTimer.current = setTimeout(() => {
            if (!hasTriggered.current) {
                toggleBlindMode();
                hasTriggered.current = true;
            }
        }, 1500); 
    };

    const cancelPress = () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
        if (warningTimer.current) clearTimeout(warningTimer.current);
        pressTimer.current = null;
        warningTimer.current = null;
    };

    return (
        <div 
            onTouchStart={startPress} 
            onTouchEnd={cancelPress}
            onTouchMove={cancelPress} 
            onMouseDown={startPress} 
            onMouseUp={cancelPress}
            onMouseMove={cancelPress} 
            onMouseLeave={cancelPress}
            className="h-full w-full"
        >
            {children}
        </div>
    );
};

const AppContent: React.FC<{ user: UserState }> = ({ user }) => {
  const { signOut, updateUser, setUser } = useAuth();
  const { addToast } = useToast();
  const { processGameResult } = useLearningEngine();
  const authUser = user;
  const authLoading = false;
  
  const [currentView, setCurrentView] = useState<AppView>(() => {
      try {
        const saved = localStorage.getItem('motlatsi_nav_view');
        return (saved as AppView) || 'dashboard';
      } catch (e) {
        return 'dashboard';
      }
  });

  // Native Platform Optimization & Handling
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // 1. Hide Splash Screen when app is ready
      SplashScreen.hide();

      // Native Push Notifications Registration & Topic Listener Setup
      const initPushNotifications = async () => {
        try {
          // Check/Request permission
          let permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
          }

          if (permStatus.receive !== 'granted') {
            console.warn('[Push Notification] User denied permissions.');
            return;
          }

          // Register with FCM/APNS (Native platforms)
          await PushNotifications.register();

          // Action when registration succeeds (token returned)
          await PushNotifications.addListener('registration', (token) => {
            console.log('[Push Notification] Native Device Token registered: ', token.value);
            // In a real SaaS, this token would be uploaded to the server's user profile document 
            // under "profiles" collection or a dedicated device tokens document.
            // Let's also save the token locally for reference.
            localStorage.setItem('motlatsi_device_token', token.value);
          });

          // Action when registration fails
          await PushNotifications.addListener('registrationError', (error) => {
            console.error('[Push Notification] Native Registration error: ', error.error);
          });

          // Action when push notification is received (foreground / background)
          await PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('[Push Notification] Notification received: ', notification);
            addToast(`[Push] ${notification.title}: ${notification.body}`, 'warning');
            
            // Mirror back to local notifications drawer
            const currentNotifications = JSON.parse(localStorage.getItem('motlatsi_notifications') || '[]');
            const newNotif = {
              id: 'push_' + Date.now(),
              title: notification.title || 'Notification',
              message: notification.body || '',
              time: 'Just Now',
              read: false,
              category: 'general'
            };
            localStorage.setItem('motlatsi_notifications', JSON.stringify([newNotif, ...currentNotifications]));
          });

          // Action when user clicks/taps on notification
          await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            console.log('[Push Notification] Action performed: ', action);
          });

          console.log('[Push Notification] Native Android listeners initialized successfully.');
        } catch (err: any) {
          console.warn('[Push Notification] Setup warning (likely running in mock environment):', err.message);
        }
      };

      initPushNotifications();

      // 2. Handle Back Button for Android consistently
      const backListener = CapApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          if (currentView !== 'dashboard' && currentView !== 'arcade-dashboard' && currentView !== 'admin') {
            if (user.role === 'admin') setCurrentView('admin');
            else if (user.role === 'student') setCurrentView('arcade-dashboard');
            else setCurrentView('dashboard');
          } else {
            CapApp.exitApp();
          }
        }
      });

      // 3. Status Bar & Navigation Bar Theming
      const updateNativeUI = async () => {
        try {
          const isStudent = user.role === 'student';
          await StatusBar.setStyle({
            style: isStudent ? Style.Dark : Style.Default
          });
          if (Capacitor.getPlatform() === 'android') {
            await StatusBar.setBackgroundColor({ color: isStudent ? '#101822' : '#ffffff' });
          }
        } catch (e) {
          console.warn("Native UI styling not supported", e);
        }
      };

      // 4. Performance: Pre-warm Network Status
      Network.getStatus().then(status => {
          if (!status.connected) addToast("You are offline. Content will be served from local cache.", "info");
      });
      
      // 5. Handle Custom URL Schemes / Deep Links for authentication redirects (e.g. com.motlatsi.ai://)
      const urlListener = CapApp.addListener('appUrlOpen', async (eventData: any) => {
        try {
          const urlStr = eventData.url;
          if (urlStr) {
            console.log("DEEP_LINK_DEBUG: Received deep link URL:", urlStr);
            const parsedUrl = new URL(urlStr);
            
            // Supabase redirects can have access token / hash fragments OR query parameters
            let accessToken = '';
            let refreshToken = '';
            
            if (parsedUrl.hash) {
              const hashParams = new URLSearchParams(parsedUrl.hash.replace('#', '?'));
              accessToken = hashParams.get('access_token') || '';
              refreshToken = hashParams.get('refresh_token') || '';
            } else if (parsedUrl.search) {
              const searchParams = new URLSearchParams(parsedUrl.search);
              accessToken = searchParams.get('access_token') || '';
              refreshToken = searchParams.get('refresh_token') || '';
            }
            
            if (accessToken) {
              addToast("Signing in via secure redirect...", "info");
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              if (error) {
                console.error("DEEP_LINK_DEBUG: Failed to complete session:", error);
                addToast("Authentication link was invalid or expired", "error");
              } else {
                addToast("Welcome back!", "success");
              }
            }
          }
        } catch (e) {
          console.error("DEEP_LINK_DEBUG: Error processing deep link:", e);
        }
      });
      
      updateNativeUI();

      return () => {
        backListener.then(l => l.remove());
        urlListener.then(l => l.remove());
      };
    }
  }, [currentView, user.role, addToast]);

  // View validation based on role
  useEffect(() => {
    if (!authUser) return;

    const navView = localStorage.getItem('motlatsi_nav_view');
    
    // Redirect Admin
    if (authUser.role === 'admin') {
      const adminForbidden = ['arcade-dashboard', 'ludo-battle', 'flashcard-arcade', 'morabaraba-battle', 'memory-battle', 'lingo-battle', 'dashboard'];
      if (!navView || !navView.startsWith('admin') || adminForbidden.includes(currentView)) {
        setCurrentView('admin');
      }
    } 
    // Redirect Teacher
    else if (authUser.role === 'teacher') {
      const teacherForbidden = ['arcade-dashboard', 'ludo-battle', 'flashcard-arcade', 'morabaraba-battle', 'memory-battle', 'lingo-battle'];
      if (teacherForbidden.includes(currentView)) {
        setCurrentView('dashboard');
      }
    }
    // Redirect Parent
    else if (authUser.role === 'parent') {
      if (currentView !== 'dashboard') {
        setCurrentView('dashboard');
      }
    }
    // Redirect Student who might be stuck in Admin/Teacher views
    else if (authUser.role === 'student') {
      const studentForbidden = ['admin', 'admin-users', 'admin-curriculum', 'scheduler', 'classroom', 'wizard'];
      if (studentForbidden.includes(currentView)) {
        setCurrentView('arcade-dashboard');
      }
    }
  }, [authUser, currentView]);

  const [parentLinkCode, setParentLinkCode] = useState<string | null>(null);

  // URL Parsing for Parent Portal
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/parent\/([a-zA-Z0-9-]+)/);
    if (match && match[1]) {
        setParentLinkCode(match[1]);
    }
  }, []);

  const [showQuotaWarning, setShowQuotaWarning] = useState(false);

  // Listen for AI quota exceeded events
  useEffect(() => {
    aiClient.onQuotaExceeded = () => {
        setShowQuotaWarning(true);
    };
    
    aiClient.onConsumeCredit = async (params: any) => {
        if (!authUser) return true;
        
        // 1. Demo User: Use local credits
        if (authUser.isDemo) {
            const currentCredits = authUser.ai_credits ?? (authUser.role === 'student' ? 50 : 100);
            if (currentCredits <= 0) {
                addToast("Demo quota reached! Resetting your credits for this session.", "info");
                updateUser({ ai_credits: 50 });
                return true;
            }
            updateUser({ ai_credits: currentCredits - 1 });
            return true;
        }
        
        // 2. Production User: Check Organization Quota
        const orgId = params?.orgId || authUser.organization_id;
        if (!orgId) return true; // Fallback if no org linked

        try {
            const { supabase } = await import('./lib/supabase');
            
            // Fetch current quota
            const { data: org, error } = await supabase
                .from('organizations')
                .select('ai_quota, used_quota')
                .eq('id', orgId)
                .single();

            if (error || !org) return true; // Safe fallback

            if (org.used_quota >= org.ai_quota) {
                addToast("School AI quota reached. Please contact your administrator.", "error");
                return false;
            }

            // Increment used quota (optimistic update on server)
            await supabase.rpc('increment_org_quota', { org_id: orgId });
            
            return true;
        } catch (e) {
            console.error("Quota check failed", e);
            return true; // Allow if check fails to prevent blocking users
        }
    };

    return () => {
        aiClient.onQuotaExceeded = null;
        aiClient.onConsumeCredit = null;
    };
  }, [authUser, updateUser, addToast]);

  const handleOpenKeySelector = async () => {
    try {
        // @ts-expect-error - window.aistudio is injected by the platform
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            // @ts-expect-error - window.aistudio is injected by the platform
            await window.aistudio.openSelectKey();
            setShowQuotaWarning(false);
            addToast("API Key selection opened. Please select your paid project key.", "info");
        } else {
            addToast("API Key selector is not available in this environment.", "error");
        }
    } catch (e) {
        console.error("Failed to open key selector", e);
        addToast("Failed to open API Key selector.", "error");
    }
  };

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(() => {
      try {
        const saved = localStorage.getItem('motlatsi_nav_topic');
        return saved ? JSON.parse(saved) : null;
      } catch (e) {
        console.error("Failed to parse selectedTopic from localStorage", e);
        return null;
      }
  });

  const [studyMode, setStudyMode] = useState<StudyMode>(() => {
      try {
        return (localStorage.getItem('motlatsi_nav_mode') as StudyMode) || 'intro';
      } catch (e) {
        return 'intro';
      }
  });

  const [coveredObjectives, setCoveredObjectives] = useState<string[]>([]);
  const [wizardContent, setWizardContent] = useState<string | undefined>(undefined);
  const [curriculum, setCurriculum] = useState<Curriculum>(() => {
      // Only load from localStorage if it's a demo user
      // Note: authUser might be null here, so we check if there's a demo user flag in localStorage
      const isDemo = localStorage.getItem('motlatsi_is_demo') === 'true';
      if (isDemo) {
          const saved = localStorage.getItem('motlatsi_curriculum');
          if (saved) {
              try {
                  return JSON.parse(saved);
              } catch (e) {
                  console.error("Failed to parse saved curriculum", e);
              }
          }
      }
      return defaultCurriculum;
  });

  // Fetch curriculum from Supabase on mount if real user
  useEffect(() => {
      const fetchCurriculum = async () => {
          if (authUser && !authUser.isDemo && authUser.school) {
              try {
                  const { supabase } = await import('./lib/supabase');
                  const { data, error } = await supabase
                      .from('school_settings')
                      .select('curriculum_data')
                      .eq('school_name', authUser.school)
                      .single();
                  
                  if (data && data.curriculum_data) {
                      setCurriculum(data.curriculum_data);
                  }
              } catch (err) {
                  console.error("Failed to fetch curriculum from Supabase", err);
              }
          }
      };
      
      fetchCurriculum();
  }, [authUser]);
  
  const [accessSettings, setAccessSettings] = useState<AccessibilitySettings>({
    dyslexicFont: false,
    highContrast: false,
    simplifiedLanguage: false,
    autoTranscript: true,
    dataSaver: false
  });

  useEffect(() => {
      if (authUser?.isDemo || (authUser && !authUser.isDemo)) {
          localStorage.setItem('motlatsi_nav_view', currentView);
          if (selectedTopic) {
              localStorage.setItem('motlatsi_nav_topic', JSON.stringify(selectedTopic));
          } else {
              localStorage.removeItem('motlatsi_nav_topic');
          }
          localStorage.setItem('motlatsi_nav_mode', studyMode);
      }
  }, [currentView, selectedTopic, studyMode, authUser]);

  const handleLogout = async () => {
    console.log("Logout initiated from AppContent...");
    
    // 1. Reset local component state
    setSelectedTopic(null);
    setStudyMode('intro');
    setCoveredObjectives([]);
    setWizardContent(undefined);
    setCurrentView('dashboard');
    
    // 2. Call centralized signOut
    try {
      await signOut();
    } catch (e) {
      console.error("Logout failed", e);
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleTopicSelect = (topic: Topic, targetView?: string) => {
    setSelectedTopic(topic);
    if (targetView) {
        setCurrentView(targetView as AppView);
    } else if (user?.role === 'student') {
        setCurrentView('choice-hub'); 
    } else {
        setCurrentView('wizard');
    }
  };

  const handleOpenChalkboard = (topic: Topic, content?: string) => {
      setSelectedTopic(topic);
      setWizardContent(content);
      setCurrentView('chalkboard');
  };

  const handleObjectivesCovered = React.useCallback((objs: string[]) => {
    setCoveredObjectives(prev => [...new Set([...prev, ...objs])]);
  }, []);

  const handleCompleteTopic = async (topicId: string) => {
    if (authUser && !authUser.completedTopics.includes(topicId)) {
      const newCompletedTopics = [...authUser.completedTopics, topicId];
      
      updateUser({
        completedTopics: newCompletedTopics
      });

      if (!authUser.isDemo) {
        try {
            const { supabase } = await import('./lib/supabase');
            await supabase
                .from('profiles')
                .update({ completed_topics: newCompletedTopics })
                .eq('id', authUser.id);
            
            // Log activity
            await supabase.from('activity_logs').insert({
                user_id: authUser.id,
                action_type: 'topic_completed',
                details: { topic_id: topicId }
            });
        } catch (err) {
            console.error("Failed to save progress to Supabase", err);
        }
      }
    }
  };

  const updateCurriculum = async (newCurriculum: Curriculum) => {
      setCurriculum(newCurriculum);
      
      if (authUser?.isDemo) {
          localStorage.setItem('motlatsi_curriculum', JSON.stringify(newCurriculum));
      }
      
      if (authUser && authUser.role === 'admin' && !authUser.isDemo) {
          try {
              const { supabase } = await import('./lib/supabase');
              // We store curriculum in a dedicated table or as a JSON blob in a settings table.
              // For now, we'll try to upsert it into a 'school_settings' table linked to the admin's school.
              if (authUser.school) {
                  await supabase.from('school_settings').upsert({
                      school_name: authUser.school,
                      curriculum_data: newCurriculum,
                      updated_at: new Date().toISOString()
                  }, { onConflict: 'school_name' });
              }
          } catch (err) {
              console.error("Failed to save curriculum to Supabase", err);
          }
      }
  };

  const navigateHome = () => {
      if (user?.role === 'admin') setCurrentView('admin');
      else setCurrentView('dashboard');
  };

  const handleGameComplete = async (score: number, topic: Topic) => {
    // Normalize XP based on game type
    // Memory Archives: each pair 100 pts. Total pairs ~8. Max ~800.
    // Word Scramble: each word ~150 pts. Total words ~3. Max ~450.
    // Morabaraba: totalXP tracks XP directly.
    let xp = 0;
    if (currentView === 'memory-battle') xp = Math.min(15, Math.floor(score / 50));
    else if (currentView === 'lingo-battle') xp = Math.min(15, Math.floor(score / 30));
    else if (currentView === 'morabaraba-battle') xp = score; // Already XP-based
    else if (currentView === 'flashcard-arcade') xp = Math.min(15, Math.floor(score / 50));
    else xp = Math.min(10, score);

    await processGameResult(topic.id, xp, topic.title);

    // --- ROLE INTERCONNECTION: Clear and resolve teacher/parent pushed mission notifications ---
    try {
      if (authUser) {
        const activeMissionId = localStorage.getItem('motlatsi_current_mission_id');
        const notifications = JSON.parse(localStorage.getItem('motlatsi_notifications') || '[]');
        
        let missionCleared = false;
        let clearedMissionNotif: any = null;

        const updatedNotifications = notifications.map((notif: any) => {
          const matchesTopic = notif.message && (
            notif.message.toLowerCase().includes(topic.title.toLowerCase()) ||
            topic.title.toLowerCase().includes(notif.message.toLowerCase())
          );
          const isUnreadForThisUser = String(notif.studentId) === String(authUser.id) && !notif.read;
          const isTarget = notif.id === activeMissionId || (isUnreadForThisUser && matchesTopic);
          
          if (isTarget) {
            missionCleared = true;
            clearedMissionNotif = notif;
            return { ...notif, read: true, completed: true, completedAt: new Date().toISOString() };
          }
          return notif;
        });

        if (missionCleared) {
          localStorage.setItem('motlatsi_notifications', JSON.stringify(updatedNotifications));
          
          // Log a special high-fidelity "MISSION CLEAR" activity event
          const logs = JSON.parse(localStorage.getItem('motlatsi_activity_log') || '[]');
          const missionSuccessLog = {
            id: 'log_' + Date.now().toString(),
            studentId: authUser.id.toString(),
            studentName: authUser.name,
            itemId: `mission-${topic.id}`,
            itemTitle: `💥 MISSION CLEARED: ${topic.title}`,
            score: xp + 5, // Bonus XP
            total: 20,
            type: 'lesson',
            date: new Date().toISOString(),
            topicId: topic.id,
            isMissionClear: true,
            notes: clearedMissionNotif ? `Pushed by: ${clearedMissionNotif.title?.includes('Remedial') ? 'Parent' : 'Teacher'}` : 'Integrated Challenge'
          };
          localStorage.setItem('motlatsi_activity_log', JSON.stringify([missionSuccessLog, ...logs]));
          localStorage.removeItem('motlatsi_current_mission_id');
          
          // Notify other tab views
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('refreshMissions'));
        }
      }
    } catch (e) {
      console.error("Error linking game complete events across roles", e);
    }

    setCurrentView('arcade-dashboard');
  };

  if (authLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <Loader2 className="animate-spin text-teacherBlue" size={40} />
          </div>
      );
  }

  if (parentLinkCode) {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <ParentPortal linkCode={parentLinkCode} />
        </Suspense>
    );
  }

  if (!authUser || !authUser.role) {
    return (
        <VoiceAccessProvider user={null}>
            <MagicGestureListener>
                <BlindModeUI />
                <ToastProvider>
                    <Login onLogin={(u) => setUser(u)} />
                </ToastProvider>
            </MagicGestureListener>
        </VoiceAccessProvider>
    );
  }

  if (user.role === 'parent') {
    return (
      <MagicGestureListener key={user.id}>
        <BlindModeUI />
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
              <ParentDashboard user={user} onLogout={handleLogout} />
          </Suspense>
        </ErrorBoundary>
      </MagicGestureListener>
    );
  }

  const appClasses = `h-screen overflow-hidden flex flex-col font-sans transition-all duration-300 
    ${accessSettings.dyslexicFont ? 'dyslexic-mode' : ''} 
    ${accessSettings.highContrast ? 'dark bg-background-dark text-white' : 'bg-background-light text-slate-900'}
  `;

  const IMMERSIVE_VIEWS: AppView[] = [
    'interactive-lesson', 
    'audio-lesson', 
    'inclusive-quiz', 
    'battle', 
    'flashcards',
    'wizard',
    'worksheet-generator',
    'revision-notes',
    'student-hub',
    'student-voice',
    'ludo-battle',
    'morabaraba-battle',
    'memory-battle',
    'lingo-battle',
    'flashcard-arcade'
  ];
  
  const hideNavigation = IMMERSIVE_VIEWS.includes(currentView);

  const isFullWidthView = 
    currentView === 'journey' || 
    currentView === 'choice-hub' || 
    currentView === 'battle' || 
    currentView === 'interactive-lesson' || 
    currentView === 'audio-lesson' || 
    currentView === 'inclusive-quiz' || 
    currentView === 'flashcards' ||
    currentView === 'student-hub' || 
    currentView === 'student-voice' ||
    currentView === 'wizard' ||
    currentView === 'worksheet-generator' ||
    currentView === 'revision-notes' ||
    currentView === 'arcade-dashboard' ||
    currentView === 'ludo-battle' ||
    currentView === 'flashcard-arcade' ||
    currentView === 'morabaraba-battle' ||
    currentView === 'memory-battle' ||
    currentView === 'lingo-battle' ||
    (currentView === 'dashboard' && user.role === 'student'); 

  return (
    <MagicGestureListener key={user.id}>
        <div className={appClasses}>
          <BlindModeUI />
          <NetworkStatus />
          <ErrorBoundary>
                {!hideNavigation && (
                <nav className={`fixed bottom-0 w-full md:w-64 md:h-screen md:top-0 md:left-0 border-t md:border-t-0 md:border-r z-50 px-1 pt-2 pb-safe-app md:p-6 flex md:flex-col justify-around md:justify-start gap-0.5 md:gap-4 shadow-lg md:shadow-none 
              ${accessSettings.highContrast ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
              
              <div className="hidden md:flex flex-col gap-1 mb-8 px-4 mt-2 cursor-pointer group" onClick={navigateHome}>
                  <MotlatsiLogo className="h-10 w-auto self-start transition-transform group-hover:scale-105 origin-left" variant="full" />
                  <p className={`text-[10px] uppercase tracking-wider pl-1 ${accessSettings.highContrast ? 'text-gray-400' : 'text-gray-400'}`}>Lesotho Education</p>
              </div>

              {user.role === 'admin' ? (
                  <>
                      <NavButton active={currentView === 'admin'} onClick={() => setCurrentView('admin')} icon={<Shield size={24} />} label="Overview" highContrast={accessSettings.highContrast} />
                      <NavButton active={currentView === 'admin-users'} onClick={() => setCurrentView('admin-users')} icon={<Users size={24} />} label="Users" highContrast={accessSettings.highContrast} />
                      <NavButton active={currentView === 'admin-curriculum'} onClick={() => setCurrentView('admin-curriculum')} icon={<BookCopy size={24} />} label="Curriculum" highContrast={accessSettings.highContrast} />
                      <NavButton active={false} onClick={handleLogout} icon={<LogOut size={24} className="text-red-500" />} label="Logout" highContrast={accessSettings.highContrast} />
                  </>
              ) : user.role === 'teacher' ? (
                  <>
                      <NavButton active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} icon={<LayoutDashboard size={20} />} label="Home" highContrast={accessSettings.highContrast} />
                      <NavButton active={currentView === 'scheduler'} onClick={() => setCurrentView('scheduler')} icon={<CalendarDays size={20} />} label="Schedule" highContrast={accessSettings.highContrast} />
                      <NavButton active={currentView === 'wizard'} onClick={() => setCurrentView('wizard')} icon={<PenTool size={20} />} label="Plan Lesson" highContrast={accessSettings.highContrast} />
                      <NavButton active={false} onClick={handleLogout} icon={<LogOut size={20} className="text-red-500" />} label="Logout" highContrast={accessSettings.highContrast} />
                  </>
              ) : user.role === 'student' ? (
                  <>
                      <NavButton active={currentView === 'dashboard' || currentView === 'arcade-dashboard'} onClick={() => setCurrentView('arcade-dashboard')} icon={<Gamepad2 size={24} />} label="Arcade" highContrast={accessSettings.highContrast} />
                      <NavButton active={currentView === 'profile'} onClick={() => setCurrentView('profile')} icon={<UserCircle size={24} />} label="Warrior" highContrast={accessSettings.highContrast} />
                      <NavButton active={false} onClick={handleLogout} icon={<LogOut size={24} className="text-red-500" />} label="Logout" highContrast={accessSettings.highContrast} />
                  </>
              ) : (
                  <>
                      <NavButton active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} icon={<LayoutDashboard size={24} />} label="Home" highContrast={accessSettings.highContrast} />
                      <NavButton active={false} onClick={handleLogout} icon={<LogOut size={24} className="text-red-500" />} label="Logout" highContrast={accessSettings.highContrast} />
                  </>
              )}

              <div className="md:mt-auto pt-4 md:border-t border-gray-100 hidden md:block space-y-2">
                   <button onClick={() => setCurrentView('profile')} className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${currentView === 'profile' ? 'bg-gray-100 dark:bg-slate-800' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-teacherBlue font-bold uppercase">{(user.name || 'U').charAt(0)}</div>
                      <div className="text-left overflow-hidden"><p className="font-medium text-sm truncate">{user.name || 'User'}</p><p className="text-gray-500 text-xs capitalize">{user.role || 'Guest'}</p></div>
                      <Settings size={16} className="ml-auto text-gray-400" />
                   </button>
                   <button onClick={handleLogout} className="w-full flex items-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg text-sm transition-colors mt-2">
                      <LogOut size={18} /> Sign Out
                   </button>
              </div>
            </nav>
            )}

            <main role="main" className={`flex-1 w-full ${isFullWidthView && currentView === 'arcade-dashboard' ? 'overflow-hidden' : 'overflow-y-auto'} flex flex-col ${!hideNavigation ? 'md:ml-64' : ''} ${isFullWidthView ? 'p-0' : 'p-4 md:p-8 max-w-7xl mx-auto'} ${accessSettings.highContrast ? 'bg-background-dark' : 'bg-gray-50'}`}>
              {showQuotaWarning && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between animate-in slide-in-from-top duration-300 z-[60]">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertCircle size={14} className="shrink-0" />
                    <p className="text-[10px] font-medium">
                      AI Quota Limit Reached. To continue with higher limits, please connect your paid Google Cloud project key.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleOpenKeySelector}
                      className="px-2 py-1 bg-amber-600 text-white text-[9px] font-bold rounded-md hover:bg-amber-700 transition-colors"
                    >
                      Connect Key
                    </button>
                    <button 
                      onClick={() => setShowQuotaWarning(false)}
                      className="p-1 text-amber-400 hover:text-amber-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
              <Suspense fallback={<LoadingFallback />}>
                  {currentView === 'worksheet-generator' ? (
                       selectedTopic ? (
                           <WorksheetGenerator topic={selectedTopic} onBack={() => setCurrentView('wizard')} />
                       ) : (
                           <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50 rounded-2xl border border-gray-100">
                               <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4"><AlertCircle className="text-red-400" size={32} /></div>
                               <h2 className="text-lg font-bold text-gray-800 mb-2">No Topic Selected</h2>
                               <p className="text-sm text-gray-500 mb-6">Please select a lesson plan first to generate worksheets.</p>
                               <button onClick={() => setCurrentView('wizard')} className="px-6 py-3 bg-teacherBlue text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">Back to Lesson Planner</button>
                           </div>
                       )
                  ) : (
                      // ... other routes (Simplified for brevity, assuming standard router switch) ...
                      currentView === 'dashboard' ? (
                           (user.role === 'teacher') ? <TeacherDashboard user={user} onNavigate={(view) => setCurrentView(view as AppView)} onLogout={handleLogout} /> :
                           (user.role === 'student') ? <ArcadeDashboard user={user} curriculum={curriculum} selectedTopic={selectedTopic} onTopicSelect={handleTopicSelect} onNavigate={(view) => setCurrentView(view as AppView)} onLogout={handleLogout} /> :
                           (user.role === 'admin') ? <AdminOverview user={user} onLogout={handleLogout} onNavigate={(view) => setCurrentView(view as AppView)} /> :
                           <Dashboard user={user} curriculum={curriculum} onTopicSelect={handleTopicSelect} onLogout={handleLogout} />
                      ) :
                      currentView === 'arcade-dashboard' ? <ArcadeDashboard user={user} curriculum={curriculum} selectedTopic={selectedTopic} onTopicSelect={handleTopicSelect} onNavigate={(view) => setCurrentView(view as AppView)} onLogout={handleLogout} /> :
                      currentView === 'ludo-battle' && selectedTopic ? <LudoBattle user={user} topic={selectedTopic} onBack={() => setCurrentView('arcade-dashboard')} onNavigate={(view) => setCurrentView(view as AppView)} /> :
                      currentView === 'flashcard-arcade' && selectedTopic ? <FlashcardArcade topic={selectedTopic} onBack={() => setCurrentView('arcade-dashboard')} onNavigate={(view) => setCurrentView(view as AppView)} onComplete={(s) => handleGameComplete(s, selectedTopic)} userGrade={user.currentGrade || '1'} /> :
                      currentView === 'morabaraba-battle' && selectedTopic ? <Morabaraba topic={selectedTopic} onBack={() => setCurrentView('arcade-dashboard')} onComplete={(score) => handleGameComplete(score, selectedTopic)} difficulty="medium" userGrade={user.currentGrade || '1'} /> :
                      currentView === 'memory-battle' && selectedTopic ? <MemoryArchives topic={selectedTopic} onBack={() => setCurrentView('arcade-dashboard')} onComplete={(score) => handleGameComplete(score, selectedTopic)} difficulty="medium" userGrade={user.currentGrade || '1'} /> :
                      currentView === 'lingo-battle' && selectedTopic ? <WordScramble topic={selectedTopic} onBack={() => setCurrentView('arcade-dashboard')} onComplete={(score) => handleGameComplete(score, selectedTopic)} difficulty="medium" userGrade={user.currentGrade || '1'} /> :
                      currentView === 'wizard' ? <LessonWizard topic={selectedTopic} onOpenChalkboard={handleOpenChalkboard} onBack={() => setCurrentView('dashboard')} onNavigate={(view) => setCurrentView(view as AppView)} onTopicSelect={handleTopicSelect} /> :
                      currentView === 'library' ? <ResourceLibrary user={user} onNavigate={(view) => setCurrentView(view as AppView)} /> :
                      currentView === 'scheduler' ? <SmartScheduler onNavigate={(view) => setCurrentView(view as AppView)} onTopicSelect={handleTopicSelect} /> :
                      currentView === 'classroom' ? <TeacherClassroom user={user} /> :
                      currentView === 'journey' ? <JourneyMap user={user} curriculum={curriculum} onTopicSelect={handleTopicSelect} /> :
                      currentView === 'profile' ? <UserProfile user={user} onUpdate={(updates) => updateUser(updates)} onLogout={handleLogout} /> :
                      currentView === 'accessibility' ? <AccessibilitySettingsView settings={accessSettings} onUpdate={setAccessSettings} onBack={() => setCurrentView('dashboard')} onNavigate={(view) => setCurrentView(view as AppView)} onLogout={handleLogout} /> :
                      currentView === 'student-hub' ? <StudentHub user={user} onNavigate={(view) => setCurrentView(view as AppView)} onTopicSelect={handleTopicSelect} onLogout={handleLogout} /> :
                      currentView === 'student-voice' ? <StudentHub user={user} initialView="voice" onNavigate={(view) => setCurrentView(view as AppView)} onTopicSelect={handleTopicSelect} onLogout={handleLogout} /> :
                      currentView === 'student-library' ? <StudentLibrary user={user} onNavigate={(view) => setCurrentView(view as AppView)} topic={selectedTopic} onSetMode={setStudyMode} /> :
                      currentView === 'battle' ? <BattleArena user={user} onBack={() => setCurrentView('dashboard')} onNavigate={(view) => setCurrentView(view as AppView)} /> :
                      currentView === 'choice-hub' && selectedTopic ? <ChoiceHub topic={selectedTopic} user={user} curriculum={curriculum} onTopicSelect={handleTopicSelect} onChoice={(mode, sMode) => { 
                          setStudyMode(sMode); 
                          setCoveredObjectives([]);
                          if (mode === 'read' && sMode === 'exam-prep') {
                              setCurrentView('revision-notes');
                          } else {
                              setCurrentView(mode === 'read' ? 'interactive-lesson' : mode === 'listen' ? 'audio-lesson' : 'inclusive-quiz'); 
                          }
                      }} /> :
                      currentView === 'interactive-lesson' && selectedTopic ? <InteractiveLesson topic={selectedTopic} mode={studyMode} onBack={() => setCurrentView('choice-hub')} onComplete={() => handleCompleteTopic(selectedTopic.id)} onNavigate={(view) => setCurrentView(view as AppView)} onObjectivesCovered={handleObjectivesCovered} /> :
                      currentView === 'revision-notes' && selectedTopic ? <RevisionNotes topic={selectedTopic} onBack={() => setCurrentView('choice-hub')} onNavigate={(view) => setCurrentView(view as AppView)} /> :
                      currentView === 'audio-lesson' && selectedTopic ? <InclusiveAudio topic={selectedTopic} mode={studyMode} onBack={() => setCurrentView('choice-hub')} settings={accessSettings} onObjectivesCovered={handleObjectivesCovered} /> :
                      currentView === 'inclusive-quiz' && selectedTopic ? <InclusiveQuiz topic={selectedTopic} onBack={() => setCurrentView('choice-hub')} onComplete={(score) => handleCompleteTopic(selectedTopic.id)} mode={studyMode} onNavigate={(view) => setCurrentView(view as AppView)} coveredObjectives={coveredObjectives} /> :
                      currentView === 'flashcards' && selectedTopic ? <InclusiveFlashcard topic={selectedTopic} onBack={() => setCurrentView('choice-hub')} settings={accessSettings} /> :
                      currentView === 'chalkboard' && selectedTopic ? <ChalkboardView topic={selectedTopic} customContent={wizardContent} onBack={() => setCurrentView('wizard')} /> :
                      currentView === 'chat' ? <div className="space-y-4"><SocraticChat topic={selectedTopic} user={user} onComplete={handleCompleteTopic} /></div> :
                      currentView === 'quiz' && selectedTopic ? <QuizInterface topic={selectedTopic} onBack={() => setCurrentView('journey')} onComplete={(score) => handleCompleteTopic(selectedTopic.id)} /> :
                      currentView === 'admin' ? <AdminOverview user={user} onLogout={handleLogout} onNavigate={(view) => setCurrentView(view as AppView)} /> :
                      currentView === 'admin-users' ? <AdminUsers user={user} onNavigate={(view) => setCurrentView(view as AppView)} /> :
                      currentView === 'admin-curriculum' ? <AdminCurriculum user={user} curriculum={curriculum} onUpdate={updateCurriculum} onNavigate={(view) => setCurrentView(view as AppView)} /> :
                      currentView === 'bulk-planner-dashboard' ? <BulkPlannerDashboard onNavigate={(view: AppView) => setCurrentView(view)} /> :
                      currentView === 'bulk-unit-creator' ? <BulkUnitCreator onNavigate={(view: AppView) => setCurrentView(view)} /> :
                      currentView === 'bulk-reporter' ? <BulkReporter onNavigate={(view: AppView) => setCurrentView(view)} /> :
                      null
                  )}
              </Suspense>
            </main>
          </ErrorBoundary>
        </div>
    </MagicGestureListener>
  );
};

const NavButton = ({ active, onClick, icon, label, highContrast }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, highContrast: boolean }) => (
    <button 
        onClick={onClick} 
        aria-label={label} 
        aria-current={active ? 'page' : undefined}
        className={`flex-1 md:flex-none flex flex-col md:flex-row items-center md:gap-3 p-1 md:px-4 md:py-3 rounded-xl transition-all ${active ? (highContrast ? 'bg-primary text-white' : 'text-teacherBlue bg-blue-50 md:bg-blue-50') : (highContrast ? 'text-gray-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900')}`}>
        {cloneElement(icon as ReactElement<{ size: number }>, { size: 20 })}
        <span className="text-[9px] md:text-sm font-medium mt-0.5 md:mt-0" aria-hidden="true">{label}</span>
    </button>
);

const App: React.FC = () => (
    <ErrorBoundary>
        <AuthProvider>
            <AppWithUser />
        </AuthProvider>
    </ErrorBoundary>
);

const LoadingScreen = () => {
    const [progress, setProgress] = useState(0);
    const [statusIndex, setStatusIndex] = useState(0);

    const statuses = [
        "Initializing Motlatsi Experience...",
        "Securing Handshake connection...",
        "Loading Study Material & AI Models...",
        "Aligning Personal Study Pacers...",
        "Preparing Interactive Chalkboard...",
        "Ready to Launch..."
    ];

    useEffect(() => {
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    return 100;
                }
                const increment = Math.floor(Math.random() * 8) + 4;
                return Math.min(prev + increment, 100);
            });
        }, 150);

        return () => clearInterval(progressInterval);
    }, []);

    useEffect(() => {
        const statusInterval = setInterval(() => {
            setStatusIndex((prev) => (prev < statuses.length - 1 ? prev + 1 : prev));
        }, 1100);

        return () => clearInterval(statusInterval);
    }, [statuses.length]);

    return (
        <div className="fixed inset-0 bg-[#fafeff] dark:bg-[#070a13] z-[9999] flex flex-col items-center justify-center p-6 text-center font-sans overflow-hidden">
            {/* Ambient Nebula Blur Backdrops */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-[#2AF598]/8 dark:bg-[#2AF598]/5 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '6s' }}></div>
                <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-[#009EFD]/12 dark:bg-[#009EFD]/6 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }}></div>
                
                {/* Tech Dot Matrix Background */}
                <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{
                    backgroundImage: 'radial-gradient(#009EFD 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }}></div>
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-10 flex flex-col items-center"
            >
                {/* Micro-tech Badge */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8 px-4 py-1.5 rounded-full bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 dark:border-blue-500/20 flex items-center gap-2"
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2AF598] animate-ping" />
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase font-mono">
                        Active Sandbox Enclave
                    </span>
                </motion.div>

                {/* Main Holographic Logo & Orbiters */}
                <div className="relative mb-14">
                    {/* Outer slow dashed-dotted orbit */}
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-[-28px] border-2 border-dashed border-[#009EFD]/20 rounded-full"
                    />

                    {/* Inner counter-rotating thin solid orbit */}
                    <motion.div 
                        animate={{ rotate: -360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-[-14px] border border-[#2AF598]/30 rounded-full"
                    />
                    
                    {/* Pulsing floating tracker lights */}
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-[#2AF598] shadow-lg shadow-[#2AF598]/80 z-20"
                    />
                    <motion.div
                        animate={{ scale: [1.2, 1, 1.2], opacity: [1, 0.6, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-full bg-[#009EFD] shadow-lg shadow-[#009EFD]/80 z-20"
                    />

                    {/* Shielding Glass Container */}
                    <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl shadow-blue-100/40 dark:shadow-none border border-white/40 dark:border-slate-800/60 relative z-10">
                        <motion.div
                            animate={{ scale: [1, 1.04, 1] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <MotlatsiLogo variant="icon" className="w-16 h-16" />
                        </motion.div>
                    </div>

                    {/* Micro-sensor status nodes */}
                    <div className="absolute -right-16 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                        <div className="w-6 h-6 rounded-lg bg-white/90 dark:bg-[#0c1322] border border-gray-100 dark:border-slate-800 flex items-center justify-center text-blue-500 shadow-sm">
                            <Cpu size={11} className="animate-pulse" />
                        </div>
                        <div className="w-6 h-6 rounded-lg bg-white/90 dark:bg-[#0c1322] border border-gray-100 dark:border-slate-800 flex items-center justify-center text-teal-400 shadow-sm">
                            <Search size={11} />
                        </div>
                    </div>
                </div>

                {/* Typography branding */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-2 mb-10"
                >
                    <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                        Motlatsi <span className="bg-gradient-to-r from-[#2AF598] to-[#009EFD] bg-clip-text text-transparent">AI</span>
                    </h1>
                    <p className="text-[10px] font-black tracking-[0.45em] text-slate-400 dark:text-slate-500 uppercase font-mono">
                        Powering Lesotho's Future
                    </p>
                </motion.div>

                {/* Elegant dynamic progress bar & gauge */}
                <div className="flex flex-col items-center gap-4.5 bg-white/40 dark:bg-slate-950/20 border border-gray-200/10 backdrop-blur-md px-6 py-5 rounded-2xl w-72 shadow-inner">
                    {/* Core progress layout */}
                    <div className="h-1.5 w-60 bg-gray-200/50 dark:bg-slate-800/80 rounded-full overflow-hidden relative border border-gray-100/10">
                        <motion.div 
                            animate={{ width: `${progress}%` }}
                            transition={{ ease: "easeOut", duration: 0.2 }}
                            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#2AF598] via-[#00adef] to-[#009EFD] rounded-full shadow-[0_0_8px_rgba(0,158,253,0.6)]"
                        />
                    </div>
                    
                    {/* Micro detail and state machine ticks */}
                    <div className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                        <div className="flex items-center gap-1.5 animate-pulse">
                            <Loader2 size={11} className="animate-spin text-blue-500" />
                            <span>{statuses[statusIndex]}</span>
                        </div>
                        <span className="text-[#009EFD] dark:text-blue-400 font-bold">{progress}%</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const AppWithUser: React.FC = () => {
    const { user, loading, setUser } = useAuth();
    
    useEffect(() => {
       const params = new URLSearchParams(window.location.search);
       if (params.get('logout') === 'true') {
           // If we just logged out, don't auto-seed or anything, just ensure we're clean
           localStorage.clear();
           // Remove the flag so it doesn't stay forever
           window.history.replaceState({}, '', window.location.pathname);
       }
       seedDemoData();
    }, []);

    const handleUserLogin = (newUser: UserState) => {
        // Clear all persistence keys before logging in
        const keysToClear = [
            'motlatsi_nav_view', 
            'motlatsi_nav_topic', 
            'motlatsi_nav_mode',
            'motlatsi_is_demo'
        ];
        keysToClear.forEach(k => localStorage.removeItem(k));
        
        // Clear session storage
        sessionStorage.clear();
        
        setUser(newUser);
    };

    if (loading) return <LoadingScreen />;
    
    if (!user) {
        return (
            <VoiceAccessProvider user={null}>
                <MagicGestureListener>
                    <BlindModeUI />
                    <ToastProvider>
                        <Login onLogin={handleUserLogin} />
                    </ToastProvider>
                </MagicGestureListener>
            </VoiceAccessProvider>
        );
    }

    return (
      <LearningEngineProvider>
          <VoiceAccessProvider user={user}> 
            <QueryClientProvider client={queryClient}>
              <ToastProvider>
                <AppContent user={user} />
              </ToastProvider>
            </QueryClientProvider>
          </VoiceAccessProvider>
      </LearningEngineProvider>
    );
};

export default App;

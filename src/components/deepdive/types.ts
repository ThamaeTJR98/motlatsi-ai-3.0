
export type LessonPhase = 'loading' | 'narrative' | 'slides' | 'recap' | 'lab' | 'mastery' | 'interactive';

export type NarrativeItemType = 'intro' | 'chapter' | 'fact' | 'mastery';

export interface NarrativeItem {
    id: string;
    type: NarrativeItemType;
    title?: string;
    text: string;
    duration?: string; // e.g. "3 min read"
    chapterNumber?: number;
    tags?: { label: string; icon: string }[];
}

export interface Hotspot {
    x: number;
    y: number;
    label: string;
    description: string;
}

export interface LabItem {
    id: string;
    label: string;
    correctZone: 'zone1' | 'zone2';
}

export interface Flashcard {
    id: string;
    question: string;
    answer: string;
    hint?: string;
    category?: string;
}

export interface LessonContent {
    title: string;
    narrative: NarrativeItem[];
    slides: Flashcard[];
    slide: {
        title: string;
        imageKeyword: string;
        hotspots: Hotspot[];
        narrationText: string;
    };
    recap: {
        title: string;
        duration: string;
        points: { title: string; desc: string; icon: string }[];
    };
    lab: {
        title: string;
        zone1Label: string;
        zone2Label: string;
        items: LabItem[];
    };
}

export interface PhaseProps {
    content: LessonContent;
    onNext: () => void;
    onBack: () => void;
    initialMode?: 'explore' | 'practice';
}

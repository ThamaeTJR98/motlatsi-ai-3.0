import React, { useState, useMemo, useEffect } from 'react';
import { Topic } from '../types';
import { LessonContent, LessonPhase, NarrativeItem, Flashcard } from './deepdive/types';
import { DeepDiveRecap } from './deepdive/DeepDiveRecap';
import { DeepDiveNarrative } from './deepdive/DeepDiveNarrative';
import { DeepDiveInteractive } from './deepdive/DeepDiveInteractive';
import { DeepDiveSlides } from './deepdive/DeepDiveSlides';
import { DeepDiveSummary } from './deepdive/DeepDiveSummary';

interface DeepDiveProps {
    topic: Topic;
    onBack: () => void;
    onComplete: () => void;
    onNavigate?: (view: string) => void;
    onObjectivesCovered?: (objectives: string[]) => void;
}

const DeepDiveLesson: React.FC<DeepDiveProps> = ({ topic, onBack, onComplete, onNavigate, onObjectivesCovered }) => {
    const [phase, setPhase] = useState<LessonPhase>('narrative');

    // Call onObjectivesCovered in useEffect to avoid "Cannot update a component while rendering" error
    useEffect(() => {
        if (onObjectivesCovered && topic) {
            const objectives = topic.learningObjectives || ["Core Concept", "Advanced Theory", "Practical Application"];
            onObjectivesCovered(objectives.slice(0, 4));
        }
    }, [topic, onObjectivesCovered]);

    // Transform Topic into LessonContent
    const content: LessonContent = useMemo(() => {
        const objectives = topic.learningObjectives || ["Core Concept", "Advanced Theory", "Practical Application"];
        
        // We don't call onObjectivesCovered here anymore to avoid "Cannot update a component while rendering" error
        
        const rawVocab = topic.keyVocabulary || ["Term 1", "Term 2", "Term 3", "Term 4"];
        const vocabulary = rawVocab.map(v => typeof v === 'string' ? v : (v as any).term);

        // Generate Narrative Items dynamically
        const narrativeItems: NarrativeItem[] = [];

        // 1. Intro
        narrativeItems.push({
            id: 'intro',
            type: 'intro',
            title: topic.title,
            text: topic.description || `Welcome to our lesson on ${topic.title}. Let's learn together like we are sitting around a fire in the village!`,
            duration: '5 min read'
        });

        // 2. Chapters from Objectives
        objectives.slice(0, 4).forEach((obj, index) => {
            // Heuristic to split title/text if available, otherwise generate generic
            const hasColon = obj.includes(':');
            let title = hasColon ? obj.split(':')[0].trim() : obj;
            let text = hasColon ? obj.split(':')[1].trim() : obj;
            
            // Make text more child-friendly and relatable
            text = `${text}. Imagine this is like ${index === 0 ? 'counting your sheep in the mountains' : index === 1 ? 'sharing papa with your friends' : 'playing a game of morabaraba'}. It helps us understand ${topic.title} better!`;

            // Smart truncation for titles to keep them context-aware but compact
            if (title.length > 50) {
                const words = title.split(' ');
                if (words.length > 6) {
                    title = words.slice(0, 5).join(' ') + '...';
                }
            }
            // Capitalize first letter
            title = title.charAt(0).toUpperCase() + title.slice(1);

            narrativeItems.push({
                id: `chapter-${index}`,
                type: 'chapter',
                title: title,
                text: `<p>${text}</p><p>This is just like a small stone that helps us build a big house (ntlo). It is a very important part of <strong>${topic.title}</strong>.</p>`,
                chapterNumber: index + 1,
                tags: index === 0 ? vocabulary.slice(0, 2).map(v => ({ label: v, icon: 'database' })) : 
                      index === 1 ? vocabulary.slice(2, 4).map(v => ({ label: v, icon: 'zap' })) : []
            });

            // Insert a fact after the first chapter
            if (index === 0 && vocabulary.length > 0) {
                narrativeItems.push({
                    id: 'fact-1',
                    type: 'fact',
                    title: 'Did you know?',
                    text: `The word "${vocabulary[0]}" is very important for ${topic.title.toLowerCase()}. It's like the key to your school bag!`
                });
            }
        });

        // 3. Mastery
        narrativeItems.push({
            id: 'mastery-end',
            type: 'mastery',
            title: 'Great Job!',
            text: `You've learned the most important parts of ${topic.title}. You are now a master of this topic, just like a wise elder!`
        });

        // 4. Detailed Flashcards (Slides)
        const slides: Flashcard[] = [];
        
        // A. Core Concept Slides (from first 3 objectives)
        objectives.slice(0, 3).forEach((obj, i) => {
            const hasColon = obj.includes(':');
            const question = hasColon ? `Why is ${obj.split(':')[0].trim()} important?` : `Tell me about ${obj}.`;
            const answer = hasColon ? obj.split(':')[1].trim() : `This is a very important part of ${topic.title} that we should remember.`;
            const hint = vocabulary[i] ? `Remember the word: ${vocabulary[i]}` : undefined;

            slides.push({
                id: `slide-core-${i}`,
                question,
                answer,
                hint,
                category: 'Key Concept'
            });
        });

        // B. Deep Dive Detail Slides (from remaining objectives)
        objectives.slice(3, 8).forEach((obj, i) => {
            const hasColon = obj.includes(':');
            const question = hasColon ? `How do we use ${obj.split(':')[0].trim()} in real life?` : `Let's look closer at: ${obj}`;
            const answer = hasColon ? obj.split(':')[1].trim() : `This helps us understand the small details of ${topic.title}.`;
            
            slides.push({
                id: `slide-detail-${i}`,
                question,
                answer,
                category: 'Deep Dive'
            });
        });

        // C. Vocabulary Check Slides
        vocabulary.slice(0, 3).forEach((term, i) => {
            slides.push({
                id: `slide-vocab-${i}`,
                question: `What does the word "${term}" mean in simple words?`,
                answer: `The ${term} is like a tool that helps us understand ${topic.title} better.`,
                category: 'Vocabulary'
            });
        });

        // D. Critical Thinking Slide
        slides.push({
            id: 'slide-critical',
            question: `How can you use what you learned about ${topic.title} at home or in your village?`,
            answer: `Learning about ${topic.title} helps us solve problems and understand the world around us in Lesotho.`,
            category: 'Thinking Time'
        });

        // Generate Recap Points Contextually
        const recapPoints = objectives.slice(0, 3).map((obj, i) => {
             const hasColon = obj.includes(':');
             let title = hasColon ? obj.split(':')[0].trim() : obj;
             const desc = hasColon ? obj.split(':')[1].trim() : `Remembering ${obj.toLowerCase()} is very important for this topic.`;
             
             // Smart truncation for title
             if (title.length > 40) {
                 const words = title.split(' ');
                 if (words.length > 5) {
                     title = words.slice(0, 4).join(' ') + '...';
                 }
             }
             // Capitalize
             title = title.charAt(0).toUpperCase() + title.slice(1);

             return {
                 title,
                 desc,
                 icon: i === 0 ? 'zap' : i === 1 ? 'star' : 'lock'
             };
        });

        return {
            title: topic.title,
            recap: {
                title: `What we learned: ${topic.title}`,
                duration: "2:30",
                points: recapPoints
            },
            narrative: narrativeItems,
            slides: slides,
            slide: {
                title: `${topic.title} Map`,
                imageKeyword: "", // Removed image generation
                narrationText: `Look at this map of ${topic.title}. Tap the spots to see how everything fits together!`,
                hotspots: vocabulary.slice(0, 3).map((term, i) => ({
                    x: 20 + (i * 30),
                    y: 30 + (i * 20),
                    label: term,
                    description: `The ${term} is a very important part that makes everything work.`
                }))
            },
            lab: {
                title: "Knowledge Game",
                zone1Label: "Main Ideas",
                zone2Label: "How to Use It",
                items: vocabulary.slice(0, 6).map((term, i) => ({
                    id: `item-${i}`,
                    label: term,
                    correctZone: i % 2 === 0 ? 'zone1' : 'zone2' // Simple alternating logic for demo
                }))
            }
        };
    }, [topic]);

    const handleNext = () => {
        switch (phase) {
            case 'narrative': setPhase('slides'); break;
            case 'slides': setPhase('interactive'); break;
            case 'interactive': setPhase('recap'); break;
            case 'recap': setPhase('mastery'); break;
            case 'mastery': onComplete(); break;
            default: onComplete();
        }
        window.scrollTo(0, 0);
    };

    const handleBack = () => {
        switch (phase) {
            case 'narrative': onBack(); break;
            case 'slides': setPhase('narrative'); break;
            case 'interactive': setPhase('slides'); break;
            case 'recap': setPhase('interactive'); break;
            case 'mastery': setPhase('recap'); break;
            default: onBack();
        }
        window.scrollTo(0, 0);
    };

    return (
        <div className="h-full w-full relative bg-[#FBFBF8] dark:bg-[#131a1f] overflow-hidden flex flex-col font-['Manrope',_sans-serif]">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@500;700&family=Manrope:wght@400;500;700&display=swap');
                .editorial-title { font-family: 'Epilogue', sans-serif; }
            `}</style>
            {phase === 'narrative' && <DeepDiveNarrative key={`narrative-${topic.id}`} content={content} onNext={handleNext} onBack={handleBack} />}
            {phase === 'slides' && <DeepDiveSlides key={`slides-${topic.id}`} content={content} onNext={handleNext} onBack={handleBack} />}
            {phase === 'interactive' && <DeepDiveInteractive key={`interactive-${topic.id}`} content={content} onNext={handleNext} onBack={handleBack} initialMode="explore" />}
            {phase === 'recap' && <DeepDiveRecap key={`recap-${topic.id}`} content={content} onNext={handleNext} onBack={handleBack} />}
            {phase === 'mastery' && <DeepDiveSummary key={`summary-${topic.id}`} content={content} onNext={handleNext} onBack={handleBack} onNavigate={onNavigate || (() => {})} onComplete={onComplete} />}
        </div>
    );
};

export default DeepDiveLesson;


import { useEffect, useRef } from 'react';
import { useVoiceAccess, VoiceCommand } from '../contexts/VoiceAccessContext';

/**
 * useVoiceContext
 * 
 * A hook that allows components to register specific voice commands 
 * that are only active when the component is mounted.
 * 
 * This enables "Context Awareness" - the Voice OS knows what is on screen.
 */
export const useVoiceContext = (commands: VoiceCommand[]) => {
    const { registerCommand, unregisterCommand } = useVoiceAccess();
    
    // Track registered IDs to ensure clean unmounting
    const commandIds = useRef<string[]>([]);
    const commandsKey = JSON.stringify(commands.map(c => ({ id: c.id, k: c.keywords })));

    useEffect(() => {
        // Unregister previous commands if any (cleanup for updates)
        commandIds.current.forEach(id => unregisterCommand(id));
        commandIds.current = [];

        // Register new commands
        commands.forEach(cmd => {
            registerCommand(cmd);
            commandIds.current.push(cmd.id);
        });

        // Cleanup on unmount
        return () => {
            commandIds.current.forEach(id => unregisterCommand(id));
            commandIds.current = [];
        };
        // We use JSON.stringify on the commands array to detect content changes (keywords, actions) 
        // effectively, preventing stale closures while avoiding infinite loops.
    }, [registerCommand, unregisterCommand, commandsKey, commands]);
};

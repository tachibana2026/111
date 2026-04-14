'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminNotificationListener() {
  const supabase = createClient();
  const audioRef = useRef(null);

  useEffect(() => {
    // Subscribe to chat messages to play sound
    const channel = supabase
      .channel('admin_global_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          console.log('New message received, playing sound...');
          if (audioRef.current) {
            // Browser policy: may be blocked if user hasn't interacted with page
            audioRef.current.play().catch((err) => {
              console.warn('Autoplay blocked or audio error:', err);
            });
          }
        }
      )
      .subscribe();

    // Ensure cleanup on unmount
    return () => {
      console.log('Cleaning up global admin notification listener...');
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <audio
      ref={audioRef}
      src="/sounds/notification.mp3"
      preload="auto"
      style={{ display: 'none' }}
    />
  );
}

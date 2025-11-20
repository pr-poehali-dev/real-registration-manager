import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';

const CALLS_URL = 'https://functions.poehali.dev/f4fb4581-4cb1-4189-8210-16233c16a79e';

interface Contact {
  id: number;
  display_name: string;
  email: string;
  avatar_url?: string;
}

interface CallScreenProps {
  contact: Contact;
  userId: string;
  onEndCall: () => void;
}

export default function CallScreen({ contact, userId, onEndCall }: CallScreenProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callStatus, setCallStatus] = useState<'calling' | 'connected'>('calling');
  const [callId, setCallId] = useState<number | null>(null);

  useEffect(() => {
    startCall();
  }, []);

  const startCall = async () => {
    try {
      const response = await fetch(CALLS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          action: 'start_call',
          receiver_id: contact.id
        })
      });

      const data = await response.json();
      if (response.ok && data.call) {
        setCallId(data.call.id);
        setTimeout(() => {
          setCallStatus('connected');
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  useEffect(() => {
    if (callStatus === 'connected') {
      const timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-background via-primary/5 to-secondary/5 flex flex-col items-center justify-between p-8">
      <div className="flex flex-col items-center justify-center flex-1 space-y-6">
        <div className="relative">
          <Avatar className="w-40 h-40 border-4 border-primary shadow-2xl">
            <AvatarImage src={contact.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-5xl font-bold">
              {getInitials(contact.display_name)}
            </AvatarFallback>
          </Avatar>
          {callStatus === 'calling' && (
            <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-50" />
          )}
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">{contact.display_name}</h1>
          <p className="text-xl text-muted-foreground">{contact.email}</p>
        </div>

        {callStatus === 'calling' ? (
          <Badge variant="secondary" className="text-lg px-6 py-2 animate-pulse">
            <Icon name="Radio" size={20} className="mr-2 animate-spin" />
            Вызов...
          </Badge>
        ) : (
          <Badge variant="default" className="text-lg px-6 py-2">
            <Icon name="Timer" size={20} className="mr-2" />
            {formatDuration(callDuration)}
          </Badge>
        )}
      </div>

      <div className="flex gap-6 items-center">
        <Button
          size="lg"
          variant={isMuted ? 'destructive' : 'secondary'}
          className="h-16 w-16 rounded-full shadow-lg hover:scale-110 transition-transform"
          onClick={() => setIsMuted(!isMuted)}
        >
          <Icon name={isMuted ? 'MicOff' : 'Mic'} size={24} />
        </Button>

        <Button
          size="lg"
          variant="destructive"
          className="h-20 w-20 rounded-full shadow-2xl hover:scale-110 transition-transform bg-red-500 hover:bg-red-600"
          onClick={async () => {
            if (callId) {
              try {
                await fetch(CALLS_URL, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': userId
                  },
                  body: JSON.stringify({
                    action: 'end_call',
                    call_id: callId
                  })
                });
              } catch (error) {
                console.error('Failed to end call:', error);
              }
            }
            onEndCall();
          }}
        >
          <Icon name="PhoneOff" size={28} />
        </Button>

        <Button
          size="lg"
          variant={!isVideoOn ? 'destructive' : 'secondary'}
          className="h-16 w-16 rounded-full shadow-lg hover:scale-110 transition-transform"
          onClick={() => setIsVideoOn(!isVideoOn)}
        >
          <Icon name={isVideoOn ? 'Video' : 'VideoOff'} size={24} />
        </Button>
      </div>

      <div className="h-8" />
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';

interface Contact {
  id: number;
  display_name: string;
  email: string;
  avatar_url?: string;
}

interface CallScreenProps {
  contact: Contact;
  onEndCall: () => void;
}

export default function CallScreen({ contact, onEndCall }: CallScreenProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callStatus, setCallStatus] = useState<'calling' | 'connected'>('calling');

  useEffect(() => {
    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
    }, 2000);

    return () => clearTimeout(connectTimer);
  }, []);

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
          onClick={onEndCall}
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

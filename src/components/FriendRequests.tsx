import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const CONTACTS_URL = 'https://functions.poehali.dev/44ce9eab-7ef4-463f-9fd0-635bdd66adbe';

interface FriendRequest {
  id: number;
  sender_id: number;
  display_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

interface FriendRequestsProps {
  userId: string;
  onRequestHandled: () => void;
}

export default function FriendRequests({ userId, onRequestHandled }: FriendRequestsProps) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
  }, [userId]);

  const loadRequests = async () => {
    try {
      const response = await fetch(`${CONTACTS_URL}?action=requests`, {
        headers: { 'X-User-Id': userId }
      });
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (requestId: number) => {
    try {
      const response = await fetch(CONTACTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          action: 'accept_request',
          request_id: requestId
        })
      });

      if (response.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
        toast({
          title: 'Заявка принята',
          description: 'Теперь вы можете общаться'
        });
        onRequestHandled();
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось принять заявку',
        variant: 'destructive'
      });
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      const response = await fetch(CONTACTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          action: 'reject_request',
          request_id: requestId
        })
      });

      if (response.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
        toast({
          title: 'Заявка отклонена'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось отклонить заявку',
        variant: 'destructive'
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Icon name="Loader2" className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-2xl font-bold">Заявки в друзья</h2>
        {requests.length > 0 && (
          <Badge variant="default" className="text-base px-3 py-1">
            {requests.length}
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icon name="Inbox" size={64} className="mx-auto mb-4 opacity-50" />
              <p>Нет новых заявок</p>
            </div>
          ) : (
            requests.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="w-12 h-12 border-2 border-primary/20">
                      <AvatarImage src={request.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold">
                        {getInitials(request.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{request.display_name}</h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {request.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="default"
                      className="h-10 w-10"
                      onClick={() => handleAccept(request.id)}
                    >
                      <Icon name="Check" size={20} />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-10 w-10"
                      onClick={() => handleReject(request.id)}
                    >
                      <Icon name="X" size={20} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

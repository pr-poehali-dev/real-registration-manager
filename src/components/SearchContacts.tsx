import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const CONTACTS_URL = 'https://functions.poehali.dev/44ce9eab-7ef4-463f-9fd0-635bdd66adbe';

interface SearchResult {
  id: number;
  display_name: string;
  email: string;
  avatar_url?: string;
}

interface SearchContactsProps {
  userId: string;
}

export default function SearchContacts({ userId }: SearchContactsProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const handleSearch = async () => {
    if (query.length < 2) {
      toast({
        title: 'Слишком короткий запрос',
        description: 'Введите минимум 2 символа',
        variant: 'destructive'
      });
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${CONTACTS_URL}?action=search&q=${encodeURIComponent(query)}`,
        { headers: { 'X-User-Id': userId } }
      );
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      toast({
        title: 'Ошибка поиска',
        description: 'Не удалось выполнить поиск',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (receiverId: number) => {
    try {
      const response = await fetch(CONTACTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          action: 'send_request',
          receiver_id: receiverId
        })
      });

      if (response.ok) {
        setSentRequests(prev => new Set(prev).add(receiverId));
        toast({
          title: 'Заявка отправлена',
          description: 'Ожидайте подтверждения'
        });
      } else {
        const data = await response.json();
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось отправить заявку',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить заявку',
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

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-4">
        <h2 className="text-2xl font-bold">Найти друзей</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Введите имя или email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-12"
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="h-12 px-6"
          >
            {isSearching ? (
              <Icon name="Loader2" className="animate-spin" size={20} />
            ) : (
              <Icon name="Search" size={20} />
            )}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {results.length === 0 && !isSearching && (
            <div className="text-center py-12 text-muted-foreground">
              <Icon name="UserSearch" size={64} className="mx-auto mb-4 opacity-50" />
              <p>Начните поиск, чтобы найти друзей</p>
            </div>
          )}

          {results.map((user) => (
            <Card key={user.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold">
                      {getInitials(user.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold">{user.display_name}</h4>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <Button
                  onClick={() => sendFriendRequest(user.id)}
                  disabled={sentRequests.has(user.id)}
                  variant={sentRequests.has(user.id) ? 'secondary' : 'default'}
                  className="h-10"
                >
                  {sentRequests.has(user.id) ? (
                    <>
                      <Icon name="Check" size={16} className="mr-2" />
                      Заявка отправлена
                    </>
                  ) : (
                    <>
                      <Icon name="UserPlus" size={16} className="mr-2" />
                      Добавить
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { ScrollArea } from '@/components/ui/scroll-area';

const CONTACTS_URL = 'https://functions.poehali.dev/44ce9eab-7ef4-463f-9fd0-635bdd66adbe';

interface Contact {
  id: number;
  display_name: string;
  email: string;
  avatar_url?: string;
  last_seen: string;
}

interface ContactsListProps {
  userId: string;
  onCallStart: (contact: Contact) => void;
}

export default function ContactsList({ userId, onCallStart }: ContactsListProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, [userId]);

  const loadContacts = async () => {
    try {
      const response = await fetch(`${CONTACTS_URL}?action=friends`, {
        headers: { 'X-User-Id': userId }
      });
      const data = await response.json();
      setContacts(data.friends || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setIsLoading(false);
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

  const isOnline = (lastSeen: string) => {
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Icon name="Loader2" className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <Icon name="Users" size={48} className="text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Нет контактов</h3>
        <p className="text-muted-foreground">
          Найдите друзей через поиск и отправьте им заявку
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-4">
        {contacts.map((contact) => (
          <Card
            key={contact.id}
            className="p-4 hover:bg-accent/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative">
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    <AvatarImage src={contact.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold">
                      {getInitials(contact.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  {isOnline(contact.last_seen) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold truncate">{contact.display_name}</h4>
                    {isOnline(contact.last_seen) && (
                      <Badge variant="secondary" className="text-xs">
                        онлайн
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {contact.email}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 hover:bg-primary hover:text-white transition-colors"
                  onClick={() => onCallStart(contact)}
                >
                  <Icon name="Video" size={20} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 hover:bg-secondary hover:text-white transition-colors"
                  onClick={() => onCallStart(contact)}
                >
                  <Icon name="Phone" size={20} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

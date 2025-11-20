import { useState, useEffect } from 'react';
import AuthForm from '../components/AuthForm';
import ContactsList from '../components/ContactsList';
import SearchContacts from '../components/SearchContacts';
import FriendRequests from '../components/FriendRequests';
import CallScreen from '../components/CallScreen';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import Icon from '../components/ui/icon';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';

interface User {
  id: number;
  email: string;
  display_name: string;
  avatar_url?: string;
}

interface Contact {
  id: number;
  display_name: string;
  email: string;
  avatar_url?: string;
}

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('contacts');
  const [activeCall, setActiveCall] = useState<Contact | null>(null);
  const [requestsCount] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleCallStart = (contact: Contact) => {
    setActiveCall(contact);
  };

  const handleCallEnd = () => {
    setActiveCall(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) {
    return <AuthForm onAuthSuccess={setUser} />;
  }

  if (activeCall) {
    return <CallScreen contact={activeCall} userId={String(user.id)} onEndCall={handleCallEnd} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <Icon name="MessageSquare" size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Скам 2.0
              </h1>
              <p className="text-xs text-muted-foreground">Менеджер контактов</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Avatar className="w-10 h-10 border-2 border-primary/30">
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold">
                {getInitials(user.display_name)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="font-semibold">{user.display_name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleLogout}
              className="hover:bg-destructive hover:text-white transition-colors"
            >
              <Icon name="LogOut" size={20} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-5xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100vh-140px)]">
          <TabsList className="grid w-full grid-cols-3 mb-4 h-14">
            <TabsTrigger value="contacts" className="text-base">
              <Icon name="Users" size={20} className="mr-2" />
              Контакты
            </TabsTrigger>
            <TabsTrigger value="search" className="text-base">
              <Icon name="Search" size={20} className="mr-2" />
              Поиск
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-base relative">
              <Icon name="UserPlus" size={20} className="mr-2" />
              Заявки
              {requestsCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {requestsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="h-[calc(100%-64px)] border rounded-lg bg-card shadow-sm">
            <ContactsList userId={String(user.id)} onCallStart={handleCallStart} />
          </TabsContent>

          <TabsContent value="search" className="h-[calc(100%-64px)] border rounded-lg bg-card shadow-sm">
            <SearchContacts userId={String(user.id)} />
          </TabsContent>

          <TabsContent value="requests" className="h-[calc(100%-64px)] border rounded-lg bg-card shadow-sm">
            <FriendRequests
              userId={String(user.id)}
              onRequestHandled={() => {
                setActiveTab('contacts');
              }}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
import { useState } from 'react';
import Link from 'next/link';

interface ChatMember {
  id: string;
  username: string;
  avatar: string;
  isAdmin: boolean;
  isOnline: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: Date;
  isPinned: boolean;
  prediction?: {
    market: string;
    position: 'Yes' | 'No';
    amount: number;
    description?: string;
  };
}

interface Chat {
  id: string;
  name: string;
  description: string;
  avatar: string;
  members: ChatMember[];
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isAdmin: boolean;
  isMuted: boolean;
}

interface GroupPrediction {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  market: string;
  position: 'Yes' | 'No';
  amount: number;
  description?: string;
  timestamp: Date;
}

export default function ChatsPage() {
  const [activeTab, setActiveTab] = useState<'chats' | 'create'>('chats');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chatView, setChatView] = useState<'messages' | 'predictions' | 'members' | 'settings'>('messages');
  const [messageInput, setMessageInput] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBetDescriptionModal, setShowBetDescriptionModal] = useState(false);
  const [betDescription, setBetDescription] = useState('');
  const [inviteTab, setInviteTab] = useState<'friends' | 'followers'>('friends');
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [selectedInvites, setSelectedInvites] = useState<string[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);

  // Mock data for chats
  const [chats] = useState<Chat[]>([
    {
      id: '1',
      name: 'AFL Predictions Crew',
      description: 'Discussing footy predictions and sharing tips',
      avatar: '🏈',
      members: [
        { id: '1', username: 'FootyFan99', avatar: '🦘', isAdmin: true, isOnline: true },
        { id: '2', username: 'MelbMaster', avatar: '🏏', isAdmin: false, isOnline: true },
        { id: '3', username: 'SydneyPunter', avatar: '🌊', isAdmin: false, isOnline: false },
        { id: '4', username: 'BrisbaneBets', avatar: '☀️', isAdmin: false, isOnline: true },
      ],
      lastMessage: 'Who else is backing Collingwood this week?',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 5),
      unreadCount: 3,
      isAdmin: true,
      isMuted: false,
    },
    {
      id: '2',
      name: 'Politics Watchers',
      description: 'Federal and state election predictions',
      avatar: '🏛️',
      members: [
        { id: '1', username: 'PollingPro', avatar: '📊', isAdmin: true, isOnline: false },
        { id: '5', username: 'CanberraCalls', avatar: '🦅', isAdmin: false, isOnline: true },
      ],
      lastMessage: 'Rate cut looking likely now',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2),
      unreadCount: 0,
      isAdmin: false,
      isMuted: false,
    },
    {
      id: '3',
      name: 'Weather Predictors',
      description: 'BOM watchers and climate predictions',
      avatar: '🌦️',
      members: [
        { id: '6', username: 'StormChaser', avatar: '⛈️', isAdmin: true, isOnline: true },
        { id: '7', username: 'SunnyDays', avatar: '☀️', isAdmin: false, isOnline: false },
        { id: '8', username: 'RainMaker', avatar: '🌧️', isAdmin: false, isOnline: true },
      ],
      lastMessage: 'La Niña is definitely coming',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24),
      unreadCount: 0,
      isAdmin: false,
      isMuted: true,
    },
  ]);

  // Mock messages for selected chat
  const [messages] = useState<ChatMessage[]>([
    {
      id: '1',
      senderId: '2',
      senderName: 'MelbMaster',
      senderAvatar: '🏏',
      content: 'Anyone watching the game tonight?',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      isPinned: false,
    },
    {
      id: '2',
      senderId: '3',
      senderName: 'SydneyPunter',
      senderAvatar: '🌊',
      content: "Yeah mate, got a good feeling about this one",
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      isPinned: false,
    },
    {
      id: '3',
      senderId: '4',
      senderName: 'BrisbaneBets',
      senderAvatar: '☀️',
      content: "Just placed my prediction!",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      isPinned: false,
      prediction: {
        market: 'Collingwood to win vs Carlton',
        position: 'Yes',
        amount: 50,
        description: 'Pies have won 4 in a row and Carlton missing key players',
      },
    },
    {
      id: '4',
      senderId: '1',
      senderName: 'FootyFan99',
      senderAvatar: '🦘',
      content: '📌 Remember: Finals tipping comp starts next week!',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      isPinned: true,
    },
    {
      id: '5',
      senderId: '2',
      senderName: 'MelbMaster',
      senderAvatar: '🏏',
      content: 'Who else is backing Collingwood this week?',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      isPinned: false,
    },
  ]);

  // Mock group predictions
  const [groupPredictions] = useState<GroupPrediction[]>([
    {
      id: '1',
      userId: '4',
      username: 'BrisbaneBets',
      userAvatar: '☀️',
      market: 'Collingwood to win vs Carlton',
      position: 'Yes',
      amount: 50,
      description: 'Pies have won 4 in a row and Carlton missing key players',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: '2',
      userId: '2',
      username: 'MelbMaster',
      userAvatar: '🏏',
      market: 'Melbourne to make top 4',
      position: 'Yes',
      amount: 100,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    },
    {
      id: '3',
      userId: '3',
      username: 'SydneyPunter',
      userAvatar: '🌊',
      market: 'Sydney Swans Premiership 2025',
      position: 'Yes',
      amount: 25,
      description: 'Bloods looking strong this year with new recruits',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
  ]);

  // New chat creation state
  const [newChatName, setNewChatName] = useState('');
  const [newChatDescription, setNewChatDescription] = useState('');
  const [newChatEmoji, setNewChatEmoji] = useState('💬');
  const [inviteLink, setInviteLink] = useState('');

  const emojiOptions = ['💬', '🏈', '🏛️', '🌦️', '📊', '🎬', '🎵', '💰', '🌍', '⚽', '🏆', '🎯'];

  // Mock friends (mutual follows)
  const [friends] = useState([
    { id: '10', username: 'AussieTipper', avatar: '🦘', isOnline: true },
    { id: '11', username: 'PerthPunter', avatar: '🌅', isOnline: false },
    { id: '12', username: 'AdelaidePro', avatar: '🍷', isOnline: true },
  ]);

  // Mock followers (people who follow you)
  const [followers] = useState([
    { id: '10', username: 'AussieTipper', avatar: '🦘', isMutual: true, isOnline: true },
    { id: '11', username: 'PerthPunter', avatar: '🌅', isMutual: true, isOnline: false },
    { id: '12', username: 'AdelaidePro', avatar: '🍷', isMutual: true, isOnline: true },
    { id: '13', username: 'HobartHero', avatar: '🏔️', isMutual: false, isOnline: false },
    { id: '14', username: 'DarwinDave', avatar: '🐊', isMutual: false, isOnline: true },
    { id: '15', username: 'GoldCoastGambler', avatar: '🏖️', isMutual: false, isOnline: false },
    { id: '16', username: 'TassieTips', avatar: '🦔', isMutual: false, isOnline: true },
  ]);

  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  const handleCreateChat = () => {
    if (newChatName.trim()) {
      // In real app, would create chat via API
      alert(`Chat "${newChatName}" created! Invites sent to ${selectedFollowers.length} followers.`);
      setNewChatName('');
      setNewChatDescription('');
      setSelectedFollowers([]);
      setActiveTab('chats');
    }
  };

  const generateInviteLink = (chatId?: string) => {
    const id = chatId || selectedChat?.id || 'new';
    const code = Math.random().toString(36).substring(2, 10);
    return `https://foremark.com.au/join/${code}`;
  };

  const copyInviteLink = () => {
    const link = generateInviteLink();
    setInviteLink(link);
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const shareInviteLink = async (platform?: 'whatsapp' | 'messages' | 'native') => {
    const link = inviteLink || generateInviteLink();
    if (!inviteLink) setInviteLink(link);

    const groupName = selectedChat?.name || 'my group';
    const shareText = `Join ${groupName} on Foremark! We share predictions and discuss markets together. ${link}`;

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'messages') {
      // SMS/iMessage - works on mobile
      window.open(`sms:?body=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'native' && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${groupName} on Foremark`,
          text: `Join ${groupName} on Foremark! We share predictions and discuss markets together.`,
          url: link,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      copyInviteLink();
    }
  };

  const toggleInviteSelection = (id: string) => {
    setSelectedInvites(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredFriends = friends.filter(f =>
    f.username.toLowerCase().includes(inviteSearchQuery.toLowerCase())
  );

  const filteredFollowers = followers.filter(f =>
    f.username.toLowerCase().includes(inviteSearchQuery.toLowerCase())
  );

  const mutualFollowers = filteredFollowers.filter(f => f.isMutual);

  const handleCopyPrediction = (prediction: GroupPrediction) => {
    alert(`Copying prediction: ${prediction.position} on "${prediction.market}" for $${prediction.amount}`);
  };

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      // In real app, would send via API
      setMessageInput('');
    }
  };

  const toggleFollowerSelection = (id: string) => {
    setSelectedFollowers(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0F4C4C]">Group Chats</h1>
          <p className="text-gray-600 mt-1">Create private groups to discuss markets and share predictions with friends</p>
        </div>

        {/* Explainer Card */}
        <div className="bg-gradient-to-r from-[#0F4C4C] to-[#1a6b6b] rounded-xl p-5 mb-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Share predictions with anyone</h3>
              <ul className="space-y-1.5 text-white/90 text-sm">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#C8E64C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Invite friends via link - even if they're not on Foremark yet
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#C8E64C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Share your predictions and explain your reasoning
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#C8E64C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Easily share invite links via WhatsApp, Messages, or any app
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        {!selectedChat && (
          <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'chats'
                  ? 'bg-white text-[#0F4C4C] shadow-sm'
                  : 'text-gray-600 hover:text-[#0F4C4C]'
              }`}
            >
              My Chats
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'create'
                  ? 'bg-white text-[#0F4C4C] shadow-sm'
                  : 'text-gray-600 hover:text-[#0F4C4C]'
              }`}
            >
              Create Group
            </button>
          </div>
        )}

        {/* Chat List View */}
        {!selectedChat && activeTab === 'chats' && (
          <div className="space-y-3">
            {chats.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No chats yet</h3>
                <p className="text-gray-600 mb-4">Create a group to start chatting and sharing predictions with friends</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="bg-[#0F4C4C] text-white px-6 py-2 rounded-lg hover:bg-[#0a3a3a] transition-colors"
                >
                  Create your first group
                </button>
              </div>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className="w-full bg-white rounded-xl p-4 hover:shadow-md transition-shadow text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl">{chat.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate">{chat.name}</h3>
                        <div className="flex items-center space-x-2">
                          {chat.isMuted && <span className="text-gray-400">🔇</span>}
                          {chat.unreadCount > 0 && (
                            <span className="bg-[#C8E64C] text-[#0F4C4C] text-xs font-bold px-2 py-1 rounded-full">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400">
                          {chat.members.length} members
                        </span>
                        {chat.lastMessageTime && (
                          <span className="text-xs text-gray-400">
                            {formatTime(chat.lastMessageTime)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}

            {/* Community Guidelines Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
              <h4 className="font-medium text-blue-800 mb-2">Community Guidelines</h4>
              <p className="text-sm text-blue-700">
                Keep chats respectful and on-topic. Sharing predictions is encouraged, but please don&apos;t share
                misleading information or spam. Report any inappropriate behaviour to our support team.
              </p>
            </div>
          </div>
        )}

        {/* Create Group View */}
        {!selectedChat && activeTab === 'create' && (
          <div className="bg-white rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Create a New Group Chat</h2>

            <div className="space-y-6">
              {/* Group Emoji/Avatar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group Icon</label>
                <div className="flex flex-wrap gap-2">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setNewChatEmoji(emoji)}
                      className={`text-2xl p-2 rounded-lg transition-colors ${
                        newChatEmoji === emoji
                          ? 'bg-[#C8E64C] ring-2 ring-[#0F4C4C]'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Group Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group Name *</label>
                <input
                  type="text"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  placeholder="e.g., AFL Predictions Crew"
                  maxLength={50}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">{newChatName.length}/50 characters</p>
              </div>

              {/* Group Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <textarea
                  value={newChatDescription}
                  onChange={(e) => setNewChatDescription(e.target.value)}
                  placeholder="What's this group about?"
                  maxLength={200}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">{newChatDescription.length}/200 characters</p>
              </div>

              {/* Invite Followers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invite Followers ({selectedFollowers.length}/20 max members)
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {followers.map((follower) => (
                    <button
                      key={follower.id}
                      onClick={() => toggleFollowerSelection(follower.id)}
                      disabled={selectedFollowers.length >= 19 && !selectedFollowers.includes(follower.id)}
                      className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                        selectedFollowers.includes(follower.id)
                          ? 'bg-[#C8E64C]/20 border-2 border-[#0F4C4C]'
                          : 'hover:bg-gray-50 border-2 border-transparent'
                      } ${selectedFollowers.length >= 19 && !selectedFollowers.includes(follower.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-xl">{follower.avatar}</span>
                      <span className="font-medium text-gray-900">{follower.username}</span>
                      {selectedFollowers.includes(follower.id) && (
                        <span className="ml-auto text-[#0F4C4C]">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Or Share Invite Link */}
              <div className="border-t pt-6">
                <p className="text-sm text-gray-600 mb-3">Or share an invite link after creating the group</p>
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreateChat}
                disabled={!newChatName.trim()}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  newChatName.trim()
                    ? 'bg-[#0F4C4C] text-white hover:bg-[#0a3a3a]'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                Create Group Chat
              </button>
            </div>
          </div>
        )}

        {/* Selected Chat View */}
        {selectedChat && (
          <div className="bg-white rounded-xl overflow-hidden">
            {/* Chat Header */}
            <div className="bg-[#0F4C4C] text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setSelectedChat(null);
                      setChatView('messages');
                    }}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    ← Back
                  </button>
                  <span className="text-2xl">{selectedChat.avatar}</span>
                  <div>
                    <h2 className="font-semibold">{selectedChat.name}</h2>
                    <p className="text-xs text-white/70">{selectedChat.members.length} members</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setInviteLink(generateInviteLink());
                      setShowInviteModal(true);
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-sm"
                  >
                    + Invite
                  </button>
                </div>
              </div>

              {/* Chat Sub-tabs */}
              <div className="flex space-x-1 mt-4 bg-white/10 rounded-lg p-1">
                {(['messages', 'predictions', 'members', 'settings'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setChatView(tab)}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors capitalize ${
                      chatView === tab
                        ? 'bg-white text-[#0F4C4C]'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages View */}
            {chatView === 'messages' && (
              <div className="flex flex-col h-[500px]">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Pinned messages first */}
                  {messages.filter(m => m.isPinned).map((message) => (
                    <div key={message.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm">📌</span>
                        <span className="text-lg">{message.senderAvatar}</span>
                        <span className="font-medium text-sm">{message.senderName}</span>
                        <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-800 ml-8">{message.content}</p>
                    </div>
                  ))}

                  {/* Regular messages */}
                  {messages.filter(m => !m.isPinned).map((message) => (
                    <div key={message.id}>
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{message.senderAvatar}</span>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{message.senderName}</span>
                            <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
                          </div>
                          <p className="text-gray-700 mt-1">{message.content}</p>

                          {/* Shared Prediction Card */}
                          {message.prediction && (
                            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-500">Shared Prediction</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                  message.prediction.position === 'Yes'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {message.prediction.position}
                                </span>
                              </div>
                              <p className="font-medium text-sm text-gray-900">{message.prediction.market}</p>
                              <p className="text-sm text-[#0F4C4C] font-medium">${message.prediction.amount}</p>
                              {message.prediction.description && (
                                <p className="text-xs text-gray-600 mt-2 italic">
                                  &quot;{message.prediction.description}&quot;
                                </p>
                              )}
                              <button
                                onClick={() => handleCopyPrediction({
                                  id: message.id,
                                  userId: message.senderId,
                                  username: message.senderName,
                                  userAvatar: message.senderAvatar,
                                  market: message.prediction!.market,
                                  position: message.prediction!.position,
                                  amount: message.prediction!.amount,
                                  description: message.prediction?.description,
                                  timestamp: message.timestamp,
                                })}
                                className="mt-2 text-xs text-[#0F4C4C] font-medium hover:underline"
                              >
                                Copy this prediction →
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="border-t p-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button
                      onClick={handleSendMessage}
                      className="bg-[#0F4C4C] text-white px-4 py-2 rounded-lg hover:bg-[#0a3a3a] transition-colors"
                    >
                      Send
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Share a prediction from your portfolio to include it in your message
                  </p>
                </div>
              </div>
            )}

            {/* Predictions View */}
            {chatView === 'predictions' && (
              <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                <div className="bg-[#C8E64C]/20 border border-[#C8E64C] rounded-lg p-3 mb-4">
                  <p className="text-sm text-[#0F4C4C]">
                    <strong>Group Predictions Feed</strong> — View and copy the last 20 predictions from group members
                  </p>
                </div>

                {groupPredictions.map((prediction) => (
                  <div key={prediction.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{prediction.userAvatar}</span>
                        <span className="font-medium text-gray-900">{prediction.username}</span>
                      </div>
                      <span className="text-xs text-gray-500">{formatTime(prediction.timestamp)}</span>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{prediction.market}</p>
                        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                          prediction.position === 'Yes'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {prediction.position}
                        </span>
                      </div>
                      <p className="text-lg font-semibold text-[#0F4C4C] mt-1">${prediction.amount}</p>
                    </div>

                    {prediction.description && (
                      <div className="bg-white border border-gray-100 rounded-lg p-3 mb-3">
                        <p className="text-xs text-gray-500 mb-1">Prediction Reasoning:</p>
                        <p className="text-sm text-gray-700 italic">&quot;{prediction.description}&quot;</p>
                      </div>
                    )}

                    <button
                      onClick={() => handleCopyPrediction(prediction)}
                      className="w-full bg-[#0F4C4C] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#0a3a3a] transition-colors"
                    >
                      Copy Prediction
                    </button>
                  </div>
                ))}

                {groupPredictions.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">📊</div>
                    <p className="text-gray-600">No predictions shared yet</p>
                    <p className="text-sm text-gray-500">When group members make predictions, they&apos;ll appear here</p>
                  </div>
                )}
              </div>
            )}

            {/* Members View */}
            {chatView === 'members' && (
              <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                {selectedChat.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <span className="text-2xl">{member.avatar}</span>
                        <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                          member.isOnline ? 'bg-green-500' : 'bg-gray-300'
                        }`}></span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.username}</p>
                        {member.isAdmin && (
                          <span className="text-xs text-[#0F4C4C] font-medium">Admin</span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/profile/${member.username}`}
                      className="text-sm text-[#0F4C4C] hover:underline"
                    >
                      View Profile
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* Settings View */}
            {chatView === 'settings' && (
              <div className="p-4 space-y-6 max-h-[500px] overflow-y-auto">
                {/* Group Info (Admin only) */}
                {selectedChat.isAdmin && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">Group Settings (Admin)</h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                      <input
                        type="text"
                        defaultValue={selectedChat.name}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        defaultValue={selectedChat.description}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent resize-none"
                      />
                    </div>

                    <button className="w-full bg-[#0F4C4C] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#0a3a3a] transition-colors">
                      Save Changes
                    </button>

                    <div className="border-t pt-4">
                      <button
                        onClick={() => {
                          setInviteLink(generateInviteLink());
                          setShowInviteModal(true);
                        }}
                        className="w-full bg-[#C8E64C] text-[#0F4C4C] py-2 rounded-lg text-sm font-medium hover:bg-[#b8d63c] transition-colors"
                      >
                        + Add Members
                      </button>
                    </div>
                  </div>
                )}

                {/* Notifications */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Notifications</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Mute Chat</p>
                      <p className="text-sm text-gray-500">Stop receiving notifications</p>
                    </div>
                    <button
                      className={`w-12 h-6 rounded-full transition-colors ${
                        selectedChat.isMuted ? 'bg-[#0F4C4C]' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        selectedChat.isMuted ? 'translate-x-6' : 'translate-x-0.5'
                      }`}></div>
                    </button>
                  </div>
                </div>

                {/* Leave/Delete */}
                <div className="border-t pt-4 space-y-3">
                  <button className="w-full bg-red-50 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                    Leave Group
                  </button>
                  {selectedChat.isAdmin && (
                    <button className="w-full bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                      Delete Group
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="bg-[#0F4C4C] text-white px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Add people to chat</h3>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteLink('');
                    setSelectedInvites([]);
                    setInviteSearchQuery('');
                    setLinkCopied(false);
                  }}
                  className="text-white/80 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto">
                {/* Friends/Followers Tabs */}
                <div className="flex p-4 gap-2">
                  <button
                    onClick={() => setInviteTab('friends')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${
                      inviteTab === 'friends'
                        ? 'bg-[#0F4C4C] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Friends
                  </button>
                  <button
                    onClick={() => setInviteTab('followers')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${
                      inviteTab === 'followers'
                        ? 'bg-[#0F4C4C] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Followers
                  </button>
                </div>

                {/* Search Input */}
                <div className="px-4 pb-4">
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={inviteSearchQuery}
                      onChange={(e) => setInviteSearchQuery(e.target.value)}
                      placeholder="Search for a profile name"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Shareable Invite Link Section */}
                <div className="px-4 pb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Invite people to your chat</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                      <p className="text-sm text-[#0F4C4C] font-medium truncate">
                        {inviteLink || generateInviteLink()}
                      </p>
                    </div>
                    <button
                      onClick={() => shareInviteLink('native')}
                      className="bg-[#0F4C4C] text-white p-3 rounded-lg hover:bg-[#0a3a3a] transition-colors flex-shrink-0"
                      title="Share invite link"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </button>
                  </div>

                  {/* Share Buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={copyInviteLink}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        linkCopied
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {linkCopied ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy link
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => shareInviteLink('whatsapp')}
                      className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </button>
                    <button
                      onClick={() => shareInviteLink('messages')}
                      className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-[#34C759] text-white hover:bg-[#2db350] transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Messages
                    </button>
                  </div>
                </div>

                {/* People List */}
                <div className="px-4 pb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    {inviteTab === 'friends' ? 'People you follow, that follow you back' : 'Your followers'}
                  </p>

                  {inviteTab === 'friends' && filteredFriends.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No profiles found. Please try a different profile</p>
                    </div>
                  )}

                  {inviteTab === 'followers' && filteredFollowers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No profiles found. Please try a different profile</p>
                    </div>
                  )}

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {inviteTab === 'friends' && filteredFriends.map((friend) => (
                      <button
                        key={friend.id}
                        onClick={() => toggleInviteSelection(friend.id)}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${
                          selectedInvites.includes(friend.id)
                            ? 'bg-[#C8E64C]/20 border-2 border-[#0F4C4C]'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="relative">
                          <span className="text-2xl">{friend.avatar}</span>
                          {friend.isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                          )}
                        </div>
                        <span className="font-medium text-gray-900 flex-1">{friend.username}</span>
                        {selectedInvites.includes(friend.id) && (
                          <span className="text-[#0F4C4C] font-bold">✓</span>
                        )}
                      </button>
                    ))}

                    {inviteTab === 'followers' && filteredFollowers.map((follower) => (
                      <button
                        key={follower.id}
                        onClick={() => toggleInviteSelection(follower.id)}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${
                          selectedInvites.includes(follower.id)
                            ? 'bg-[#C8E64C]/20 border-2 border-[#0F4C4C]'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="relative">
                          <span className="text-2xl">{follower.avatar}</span>
                          {follower.isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">{follower.username}</span>
                          {follower.isMutual && (
                            <span className="ml-2 text-xs text-[#0F4C4C] bg-[#C8E64C]/30 px-2 py-0.5 rounded-full">
                              Mutual
                            </span>
                          )}
                        </div>
                        {selectedInvites.includes(follower.id) && (
                          <span className="text-[#0F4C4C] font-bold">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t px-4 py-4">
                <button
                  onClick={() => {
                    if (selectedInvites.length > 0) {
                      alert(`Invitations sent to ${selectedInvites.length} people!`);
                      setShowInviteModal(false);
                      setSelectedInvites([]);
                      setInviteSearchQuery('');
                    }
                  }}
                  disabled={selectedInvites.length === 0}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    selectedInvites.length > 0
                      ? 'bg-[#0F4C4C] text-white hover:bg-[#0a3a3a]'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {selectedInvites.length > 0
                    ? `Add to Chat (${selectedInvites.length})`
                    : 'Add to Chat'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bet Description Info */}
        <div className="mt-6 bg-white rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3">💡 Prediction Descriptions</h3>
          <p className="text-sm text-gray-600 mb-4">
            When you share a prediction in a group chat, you can add a description explaining your reasoning.
            This helps others understand your thought process and make informed decisions about whether to copy your prediction.
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2">Example prediction with description:</p>
            <div className="space-y-1">
              <p className="font-medium text-gray-900">RBA to cut rates in February 2025</p>
              <p className="text-[#0F4C4C] font-medium">$50 on Yes</p>
              <p className="text-sm text-gray-600 italic">
                &quot;Inflation data trending down, unemployment rising. RBA commentary has turned dovish. I think February is likely.&quot;
              </p>
            </div>
          </div>
        </div>

        {/* Community Guidelines */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="font-medium text-amber-800 mb-2">Chat Community Guidelines</h4>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• Be respectful to all group members</li>
            <li>• Don&apos;t share misleading or false information</li>
            <li>• No spam or excessive self-promotion</li>
            <li>• Report inappropriate content to admins or support</li>
            <li>• Remember: copying predictions is your own decision and risk</li>
          </ul>
        </div>

        {/* Responsible Gambling Notice */}
        <div className="mt-6 p-4 bg-gray-100 rounded-xl text-center text-sm text-gray-600">
          <p className="mb-2">Think. Is this a prediction you understand?</p>
          <p>
            For free and confidential support call 1800 858 858 or visit{' '}
            <a href="https://www.gamblinghelponline.org.au" className="text-[#0F4C4C] underline">
              gamblinghelponline.org.au
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

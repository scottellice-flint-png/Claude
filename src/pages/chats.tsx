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

  // Mock followers to invite
  const [followers] = useState([
    { id: '10', username: 'AussieTipper', avatar: '🦘', selected: false },
    { id: '11', username: 'PerthPunter', avatar: '🌅', selected: false },
    { id: '12', username: 'AdelaidePro', avatar: '🍷', selected: false },
    { id: '13', username: 'HobartHero', avatar: '🏔️', selected: false },
    { id: '14', username: 'DarwinDave', avatar: '🐊', selected: false },
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

  const generateInviteLink = () => {
    const link = `https://foremark.com.au/chat/invite/${Math.random().toString(36).substring(7)}`;
    setInviteLink(link);
    navigator.clipboard.writeText(link);
  };

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
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0F4C4C]">Chats</h1>
              <p className="text-gray-600">Message and share predictions with friends</p>
            </div>
            <div className="flex space-x-2">
              <Link
                href="/ideas"
                className="flex items-center space-x-2 px-4 py-2 bg-[#C8E64C] text-[#0F4C4C] rounded-lg font-medium hover:bg-[#b8d63c] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Ideas</span>
              </Link>
              <Link
                href="/social"
                className="flex items-center space-x-2 px-4 py-2 bg-[#0F4C4C] text-white rounded-lg font-medium hover:bg-[#0a3a3a] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Social</span>
              </Link>
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
                    onClick={() => setShowInviteModal(true)}
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
                        onClick={() => setShowInviteModal(true)}
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

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Invite to Group</h3>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteLink('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Invite Followers</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {followers.map((follower) => (
                      <button
                        key={follower.id}
                        className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 text-left"
                      >
                        <span className="text-xl">{follower.avatar}</span>
                        <span className="font-medium text-gray-900">{follower.username}</span>
                        <span className="ml-auto text-[#0F4C4C] text-sm">Invite</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Or share invite link</h4>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      placeholder="Click to generate link"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                    />
                    <button
                      onClick={generateInviteLink}
                      className="bg-[#0F4C4C] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#0a3a3a] transition-colors"
                    >
                      {inviteLink ? 'Copied!' : 'Generate'}
                    </button>
                  </div>
                </div>
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

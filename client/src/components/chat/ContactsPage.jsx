import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/auth';
import { UserPlus, Mail, Search, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export const ContactsPage = ({ onBack }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [inviting, setInviting] = useState({});

  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.google_connected) {
      fetchContacts();
    } else {
      setLoading(false);
      setError('Google contacts require signing in with Google. Please log in with your Google account to access contacts.');
    }
  }, [user]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/api/contacts/google-contacts/');
      setContacts(response.data);
    } catch (err) {
      const status = err.response?.status;
      if (status === 400) {
        setError('Google contacts require signing in with Google. Please log in with your Google account to access contacts.');
      } else {
        setError(err.response?.data?.error || 'Failed to fetch contacts. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (email) => {
    setInviting(prev => ({ ...prev, [email]: true }));
    try {
      await apiClient.post('/api/contacts/invite/', { email });
      // Show success
    } catch (err) {
      console.error(err);
    } finally {
      setInviting(prev => ({ ...prev, [email]: false }));
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-transparent animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-6 border-b border-gray-50 dark:border-white/5 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-gray-400 dark:text-gray-500" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Google Contacts</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">Import & Invite</p>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Search contacts..."
            className="w-full bg-gray-50 dark:bg-white/5 border-none dark:border dark:border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400 dark:text-gray-500">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm font-medium">Fetching from Google...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-full flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{error}</p>
            <button onClick={fetchContacts} className="text-black dark:text-white text-sm font-bold underline">Try again</button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredContacts.map((contact, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-3xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-300 font-bold">
                    {contact.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{contact.name}</h4>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{contact.email}</p>
                  </div>
                </div>

                {contact.is_on_nightchat ? (
                  <button className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-transform">
                    <UserPlus size={14} />
                    Add
                  </button>
                ) : (
                  <button 
                    onClick={() => handleInvite(contact.email)}
                    disabled={inviting[contact.email]}
                    className="flex items-center gap-2 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {inviting[contact.email] ? <Loader2 className="animate-spin" size={14} /> : <Mail size={14} />}
                    Invite
                  </button>
                )}
              </div>
            ))}
            {filteredContacts.length === 0 && (
              <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-8">No contacts found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

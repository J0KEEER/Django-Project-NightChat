import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { UserPlus, Mail, Search, ArrowLeft, Loader2 } from 'lucide-react';

export const ContactsPage = ({ onBack }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [inviting, setInviting] = useState({});

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/contacts/google-contacts/');
      setContacts(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch contacts');
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
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-6 border-b border-gray-50 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-gray-400" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Google Contacts</h2>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Import & Invite</p>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search contacts..."
            className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-black/5 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm font-medium">Fetching from Google...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
              <Mail size={24} />
            </div>
            <p className="text-sm text-gray-500">{error}</p>
            <button onClick={fetchContacts} className="text-black text-sm font-bold underline">Try again</button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredContacts.map((contact, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-3xl hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center text-gray-400 font-bold">
                    {contact.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{contact.name}</h4>
                    <p className="text-xs text-gray-400">{contact.email}</p>
                  </div>
                </div>

                {contact.is_on_nightchat ? (
                  <button className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-transform">
                    <UserPlus size={14} />
                    Add
                  </button>
                ) : (
                  <button 
                    onClick={() => handleInvite(contact.email)}
                    disabled={inviting[contact.email]}
                    className="flex items-center gap-2 text-gray-400 hover:text-black px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {inviting[contact.email] ? <Loader2 className="animate-spin" size={14} /> : <Mail size={14} />}
                    Invite
                  </button>
                )}
              </div>
            ))}
            {filteredContacts.length === 0 && (
              <p className="text-center text-sm text-gray-400 mt-8">No contacts found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

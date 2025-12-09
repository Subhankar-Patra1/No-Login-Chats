import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePresence } from '../context/PresenceContext';
import StatusDot from './StatusDot';

const timeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
};

export default function ProfileCard({ targetUser, onClose, anchorRef }) {
    const { user: currentUser, token, setUser: updateAuthUser } = useAuth(); // Assuming setUser exists
    const { presenceMap, fetchStatuses } = usePresence();
    const [privacyUpdating, setPrivacyUpdating] = useState(false);

    const isMe = currentUser && String(currentUser.id) === String(targetUser.id);
    const userId = targetUser.id;
    const status = isMe ? { online: true } : presenceMap[userId];

    // Fetch fresh status on open
    useEffect(() => {
        if (userId) {
            fetchStatuses([userId]);
        }
    }, [userId]);

    const handlePrivacyChange = async (e) => {
        const newVal = e.target.value;
        setPrivacyUpdating(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me/privacy`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({ share_presence: newVal })
            });

            if (res.ok) {
                 // Update local auth user state so dropdown reflects change
                 // We need to merge sharing presence into current user
                 if (updateAuthUser) {
                     updateAuthUser(prev => ({ ...prev, share_presence: newVal }));
                 }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setPrivacyUpdating(false);
        }
    };

    // Simplified centering logic, removed complex positioning calculation
    // const [position, setPosition] = useState({ top: 60, left: 20 });

    return (
        <>
            {/* Backdrop to close */}
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div 
                className="fixed z-50 w-80 rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl animate-fade-in-down left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
                <div className="flex flex-col items-center">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-4">
                        {targetUser.display_name?.[0]?.toUpperCase()}
                    </div>
                    
                    <h3 className="text-xl font-bold text-white">{targetUser.display_name}</h3>
                    <p className="text-slate-400 text-sm mb-4">
                        {targetUser.username?.startsWith('@') ? targetUser.username : `@${targetUser.username}`}
                    </p>

                    {/* Presence Row */}
                    {!isMe && (
                        <div className="flex items-center gap-2 mb-6 bg-slate-800/50 px-3 py-1.5 rounded-full">
                            <StatusDot online={status?.online} />
                            <div className="text-sm font-medium">
                                {status?.online ? (
                                    <span className="text-green-400">Online now</span>
                                ) : (
                                    <span className="text-slate-500">
                                        {status?.last_seen 
                                            ? `Last seen ${timeAgo(status.last_seen)}`
                                            : 'Offline'
                                        }
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 w-full">
                        <button 
                            onClick={onClose} 
                            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-lg text-sm font-bold transition-colors"
                        >
                            Message
                        </button>
                    </div>

                    {/* Own Privacy Settings */}
                    {isMe && (
                        <div className="w-full mt-6 pt-6 border-t border-slate-800">
                            <label className="text-xs text-slate-500 uppercase font-bold mb-2 block tracking-wider">
                                Share Presence
                            </label>
                            <select 
                                value={currentUser?.share_presence || 'everyone'}
                                onChange={handlePrivacyChange}
                                disabled={privacyUpdating}
                                className="w-full bg-slate-950 border border-slate-700 text-slate-300 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-violet-500 outline-none"
                            >
                                <option value="everyone">Everyone</option>
                                <option value="contacts">My Contacts</option>
                                <option value="nobody">Nobody</option>
                            </select>
                        </div>
                    )}
                    
                    <div className="mt-4 pt-4 w-full text-center">
                         <a href="#" className="text-xs text-slate-500 hover:text-slate-300">View full profile</a>
                    </div>
                </div>
            </div>
        </>
    );
}

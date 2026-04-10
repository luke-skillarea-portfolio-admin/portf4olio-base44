import { useState } from 'react';
import { groupsAPI } from '../../services/api';
import { ArrowLeft, Users } from 'lucide-react';
import '../../styles/Messages.css';

export default function CreateGroupView({ onBack, onGroupCreated }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Group name is required');
            return;
        }

        setLoading(true);
        setError('');
        
        try {
            const data = await groupsAPI.createGroup(name.trim(), description.trim());
            onGroupCreated(data.group);
        } catch (err) {
            setError(err.message || 'Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-group-view">
            <div className="create-group-header">
                <button className="back-button" onClick={onBack}>
                    <ArrowLeft size={20} />
                </button>
                <h2>Create Group</h2>
            </div>

            <form className="create-group-form" onSubmit={handleSubmit}>
                <div className="group-icon-preview">
                    <Users size={40} />
                </div>

                <div className="form-group">
                    <label htmlFor="groupName">Group Name *</label>
                    <input
                        id="groupName"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter group name"
                        maxLength={100}
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="groupDesc">Description (optional)</label>
                    <textarea
                        id="groupDesc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What's this group about?"
                        rows={3}
                        disabled={loading}
                    />
                </div>

                {error && <div className="create-group-error">{error}</div>}

                <button
                    type="submit"
                    className="create-group-submit"
                    disabled={loading || !name.trim()}
                >
                    {loading ? 'Creating...' : 'Create Group'}
                </button>

                <p className="create-group-note">
                    You will be the admin of this group and can invite others using an invite link.
                </p>
            </form>
        </div>
    );
}

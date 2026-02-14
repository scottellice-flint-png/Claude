import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import type { AdminUser, AdminRole } from '@/types/admin';

const roleLabels: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  operator: 'Operator',
  viewer: 'Viewer',
};

const roleColors: Record<AdminRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  operator: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-700',
};

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'operator' as AdminRole,
  });

  const currentUserRole = session?.user?.role as AdminRole;
  const canManageUsers = ['super_admin', 'admin'].includes(currentUserRole);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users?includeInactive=true');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data || data);
      }
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';

      const submitData = { ...formData };
      if (editingUser && !formData.password) {
        delete (submitData as { password?: string }).password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        fetchUsers();
        closeModal();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      }
    } catch (err) {
      setError('Failed to save');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}?action=deactivate`, { method: 'POST' });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to deactivate');
      }
    } catch (err) {
      setError('Failed to deactivate');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}?action=reactivate`, { method: 'POST' });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to reactivate');
      }
    } catch (err) {
      setError('Failed to reactivate');
    }
  };

  const openModal = (user?: AdminUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: '',
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'operator',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ email: '', password: '', firstName: '', lastName: '', role: 'operator' });
  };

  if (!canManageUsers) {
    return (
      <AdminLayout title="Users">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          You do not have permission to manage users.
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Users | MarketOps Admin</title>
      </Head>

      <AdminLayout title="Admin Users">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            <button onClick={() => setError('')} className="float-right">&times;</button>
          </div>
        )}

        <div className="flex justify-end mb-6">
          <button
            onClick={() => openModal()}
            className="bg-foremark-green hover:bg-foremark-green-dark text-white px-4 py-2 rounded-lg"
          >
            + Add User
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foremark-green"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className={!user.isActive ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openModal(user)}
                          className="text-sm text-foremark-green hover:underline"
                        >
                          Edit
                        </button>
                        {user.id !== session?.user?.id && (
                          user.isActive ? (
                            <button
                              onClick={() => handleDeactivate(user.id)}
                              className="text-sm text-red-500 hover:underline"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(user.id)}
                              className="text-sm text-green-600 hover:underline"
                            >
                              Reactivate
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">
                {editingUser ? 'Edit User' : 'Add User'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {editingUser && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required={!editingUser}
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as AdminRole })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {currentUserRole === 'super_admin' && (
                      <option value="super_admin">Super Admin</option>
                    )}
                    <option value="admin">Admin</option>
                    <option value="operator">Operator</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-foremark-green text-white rounded-lg">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}

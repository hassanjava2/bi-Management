/**
 * BI Management - Permissions Management Page
 * صفحة إدارة الصلاحيات
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Shield, Users, Key, Lock, Unlock, Search,
    ChevronDown, ChevronRight, Check, X, Plus,
    AlertTriangle, Eye, Edit, Trash2
} from 'lucide-react';
import api from '../services/api';

// ========== API Functions ==========
const permissionsAPI = {
    getRoles: () => api.get('/permissions/roles').then(r => r.data),
    getRole: (name) => api.get(`/permissions/roles/${name}`).then(r => r.data),
    createRole: (data) => api.post('/permissions/roles', data).then(r => r.data),
    updateRole: (name, data) => api.put(`/permissions/roles/${name}`, data).then(r => r.data),
    getAllPermissions: () => api.get('/permissions/all').then(r => r.data),
    getUserPermissions: (userId) => api.get(`/permissions/user/${userId}`).then(r => r.data),
    grantPermission: (userId, permission) => api.post(`/permissions/user/${userId}/grant`, { permission }).then(r => r.data),
    revokePermission: (userId, permission, reason) => api.post(`/permissions/user/${userId}/revoke`, { permission, reason }).then(r => r.data),
    getMyPermissions: () => api.get('/permissions/my').then(r => r.data),
};

// ========== Main Component ==========
export default function PermissionsPage() {
    const [activeTab, setActiveTab] = useState('roles');
    const [selectedRole, setSelectedRole] = useState(null);
    const [searchUser, setSearchUser] = useState('');

    const tabs = [
        { id: 'roles', label: 'الأدوار', icon: Shield },
        { id: 'permissions', label: 'الصلاحيات', icon: Key },
        { id: 'users', label: 'صلاحيات المستخدمين', icon: Users },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-7 h-7 text-purple-500" />
                        إدارة الصلاحيات
                    </h1>
                    <p className="text-surface-600 dark:text-surface-400 mt-1">
                        إدارة الأدوار والصلاحيات للمستخدمين
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-surface-200 dark:border-surface-700">
                <nav className="flex gap-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                                    : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                            }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm">
                {activeTab === 'roles' && (
                    <RolesTab 
                        selectedRole={selectedRole}
                        setSelectedRole={setSelectedRole}
                    />
                )}
                {activeTab === 'permissions' && <PermissionsTab />}
                {activeTab === 'users' && (
                    <UsersPermissionsTab 
                        searchUser={searchUser}
                        setSearchUser={setSearchUser}
                    />
                )}
            </div>
        </div>
    );
}

// ========== Roles Tab ==========
function RolesTab({ selectedRole, setSelectedRole }) {
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data: roles, isLoading } = useQuery({
        queryKey: ['roles'],
        queryFn: permissionsAPI.getRoles
    });

    const { data: roleDetails } = useQuery({
        queryKey: ['role', selectedRole],
        queryFn: () => permissionsAPI.getRole(selectedRole),
        enabled: !!selectedRole
    });

    if (isLoading) {
        return <div className="p-8 text-center">جاري التحميل...</div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Roles List */}
            <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-surface-900 dark:text-white">الأدوار</h3>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                        <Plus className="w-4 h-4" />
                        إضافة دور
                    </button>
                </div>

                <div className="space-y-2">
                    {roles?.data?.map(role => (
                        <button
                            key={role.id}
                            onClick={() => setSelectedRole(role.name)}
                            className={`w-full text-right p-4 rounded-lg border transition-all ${
                                selectedRole === role.name
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                    : 'border-surface-200 dark:border-surface-700 hover:border-purple-300'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className={`px-2 py-1 rounded text-xs ${
                                    role.security_level >= 4 ? 'bg-red-100 text-red-700' :
                                    role.security_level >= 3 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                }`}>
                                    Level {role.security_level}
                                </span>
                                <span className="font-medium text-surface-900 dark:text-white">
                                    {role.display_name}
                                </span>
                            </div>
                            <p className="text-sm text-surface-500 mt-1 text-right">
                                {role.users_count} مستخدم
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Role Details */}
            <div className="lg:col-span-2 border-r border-surface-200 dark:border-surface-700 pr-6">
                {selectedRole && roleDetails ? (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-surface-900 dark:text-white">
                                    {roleDetails.data.display_name}
                                </h3>
                                <p className="text-surface-500">{roleDetails.data.description}</p>
                            </div>
                            {!roleDetails.data.is_system && (
                                <button className="text-surface-400 hover:text-surface-600">
                                    <Edit className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-surface-50 dark:bg-surface-700/50 rounded-lg p-4">
                                <div className="text-sm text-surface-500">مستوى الأمان</div>
                                <div className="text-2xl font-bold text-purple-600">
                                    {roleDetails.data.security_level}
                                </div>
                            </div>
                            <div className="bg-surface-50 dark:bg-surface-700/50 rounded-lg p-4">
                                <div className="text-sm text-surface-500">عدد الصلاحيات</div>
                                <div className="text-2xl font-bold text-green-600">
                                    {roleDetails.data.permissions?.length || 0}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold text-surface-900 dark:text-white mb-3">
                                الصلاحيات
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {roleDetails.data.permissions?.map(perm => (
                                    <span
                                        key={perm.id}
                                        className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                                    >
                                        {perm.display_name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-64 text-surface-400">
                        <div className="text-center">
                            <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>اختر دوراً لعرض التفاصيل</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ========== Permissions Tab ==========
function PermissionsTab() {
    const [expandedCategories, setExpandedCategories] = useState(new Set(['users', 'tasks']));

    const { data: permissions, isLoading } = useQuery({
        queryKey: ['all-permissions'],
        queryFn: permissionsAPI.getAllPermissions
    });

    const toggleCategory = (category) => {
        const newSet = new Set(expandedCategories);
        if (newSet.has(category)) {
            newSet.delete(category);
        } else {
            newSet.add(category);
        }
        setExpandedCategories(newSet);
    };

    const categoryNames = {
        // النظام
        system: 'النظام والإدارة',
        // المبيعات
        sales: 'المبيعات',
        // المشتريات
        purchases: 'المشتريات',
        // المخزون
        inventory: 'المخزون',
        // المرتجعات
        returns: 'المرتجعات',
        // الصيانة
        maintenance: 'الصيانة والضمان',
        // المالية
        finance: 'المالية والمحاسبة',
        // العملاء
        customers: 'العملاء',
        // الموردين
        suppliers: 'الموردين',
        // الموارد البشرية
        hr: 'الموارد البشرية',
        // التوصيل
        delivery: 'التوصيل',
        // التقارير
        reports: 'التقارير والتحليلات',
        // الأسهم
        shares: 'الأسهم والشراكة',
        // الذكاء الاصطناعي
        ai: 'الذكاء الاصطناعي',
        // الإشعارات
        notifications: 'الإشعارات',
        // لوحة التحكم
        dashboard: 'لوحة التحكم',
        // المهام
        tasks: 'المهام',
        // الكاميرات
        cameras: 'الكاميرات والمراقبة',
        // التدريب
        training: 'التدريب والتطوير',
        // الأهداف
        goals: 'الأهداف والتحفيز'
    };

    if (isLoading) {
        return <div className="p-8 text-center">جاري التحميل...</div>;
    }

    return (
        <div className="p-6">
            <h3 className="font-semibold text-surface-900 dark:text-white mb-4">
                جميع الصلاحيات المتاحة
            </h3>

            <div className="space-y-2">
                {permissions?.data && Object.entries(permissions.data).map(([category, perms]) => (
                    <div key={category} className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
                        <button
                            onClick={() => toggleCategory(category)}
                            className="w-full flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-700/50 hover:bg-surface-100 dark:hover:bg-surface-700"
                        >
                            <div className="flex items-center gap-2">
                                {expandedCategories.has(category) ? 
                                    <ChevronDown className="w-5 h-5" /> : 
                                    <ChevronRight className="w-5 h-5" />
                                }
                                <span className="font-medium text-surface-900 dark:text-white">
                                    {categoryNames[category] || category}
                                </span>
                            </div>
                            <span className="text-sm text-surface-500">
                                {perms.length} صلاحية
                            </span>
                        </button>

                        {expandedCategories.has(category) && (
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {perms.map(perm => (
                                    <div
                                        key={perm.id}
                                        className="flex items-center gap-3 p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-100 dark:border-surface-700"
                                    >
                                        <Key className="w-4 h-4 text-purple-500" />
                                        <div>
                                            <div className="font-medium text-surface-900 dark:text-white text-sm">
                                                {perm.display_name}
                                            </div>
                                            <div className="text-xs text-surface-400">
                                                {perm.name}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ========== Users Permissions Tab ==========
function UsersPermissionsTab({ searchUser, setSearchUser }) {
    const [selectedUserId, setSelectedUserId] = useState(null);
    const queryClient = useQueryClient();

    // Get users list
    const { data: users } = useQuery({
        queryKey: ['users-list'],
        queryFn: () => api.get('/users').then(r => r.data)
    });

    // Get selected user permissions
    const { data: userPerms, isLoading: loadingPerms } = useQuery({
        queryKey: ['user-permissions', selectedUserId],
        queryFn: () => permissionsAPI.getUserPermissions(selectedUserId),
        enabled: !!selectedUserId
    });

    // Get all permissions for granting
    const { data: allPerms } = useQuery({
        queryKey: ['all-permissions'],
        queryFn: permissionsAPI.getAllPermissions
    });

    // Grant mutation
    const grantMutation = useMutation({
        mutationFn: ({ userId, permission }) => permissionsAPI.grantPermission(userId, permission),
        onSuccess: () => {
            queryClient.invalidateQueries(['user-permissions', selectedUserId]);
        }
    });

    // Revoke mutation
    const revokeMutation = useMutation({
        mutationFn: ({ userId, permission }) => permissionsAPI.revokePermission(userId, permission),
        onSuccess: () => {
            queryClient.invalidateQueries(['user-permissions', selectedUserId]);
        }
    });

    const filteredUsers = users?.data?.filter(u => 
        u.full_name?.toLowerCase().includes(searchUser.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchUser.toLowerCase())
    ) || [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Users List */}
            <div className="lg:col-span-1 space-y-4">
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                    <input
                        type="text"
                        placeholder="بحث عن مستخدم..."
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-800"
                    />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredUsers.map(user => (
                        <button
                            key={user.id}
                            onClick={() => setSelectedUserId(user.id)}
                            className={`w-full text-right p-3 rounded-lg border transition-all ${
                                selectedUserId === user.id
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                    : 'border-surface-200 dark:border-surface-700 hover:border-purple-300'
                            }`}
                        >
                            <div className="font-medium text-surface-900 dark:text-white">
                                {user.full_name}
                            </div>
                            <div className="text-sm text-surface-500 flex items-center justify-between">
                                <span className="px-2 py-0.5 bg-surface-100 dark:bg-surface-700 rounded text-xs">
                                    {user.role}
                                </span>
                                <span>{user.email}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* User Permissions */}
            <div className="lg:col-span-2 border-r border-surface-200 dark:border-surface-700 pr-6">
                {selectedUserId && userPerms ? (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-bold text-surface-900 dark:text-white">
                                {userPerms.data.user?.full_name}
                            </h3>
                            <p className="text-surface-500">
                                {userPerms.data.user?.email} • {userPerms.data.user?.role}
                            </p>
                        </div>

                        {/* Current Permissions */}
                        <div>
                            <h4 className="font-semibold text-surface-900 dark:text-white mb-3 flex items-center gap-2">
                                <Check className="w-5 h-5 text-green-500" />
                                الصلاحيات الحالية ({userPerms.data.permissions?.length || 0})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {userPerms.data.permissions?.map(perm => (
                                    <span
                                        key={perm}
                                        className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm flex items-center gap-1"
                                    >
                                        {perm}
                                        <button
                                            onClick={() => revokeMutation.mutate({ userId: selectedUserId, permission: perm })}
                                            className="hover:text-red-500"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Custom Permissions */}
                        {userPerms.data.custom_permissions?.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-surface-900 dark:text-white mb-3 flex items-center gap-2">
                                    <Key className="w-5 h-5 text-purple-500" />
                                    صلاحيات مخصصة
                                </h4>
                                <div className="space-y-2">
                                    {userPerms.data.custom_permissions.map(cp => (
                                        <div
                                            key={cp.name}
                                            className={`p-3 rounded-lg border ${
                                                cp.granted 
                                                    ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
                                                    : 'border-red-200 bg-red-50 dark:bg-red-900/20'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={cp.granted ? 'text-green-700' : 'text-red-700'}>
                                                    {cp.granted ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                                </span>
                                                <div>
                                                    <span className="font-medium">{cp.name}</span>
                                                    <span className="text-sm text-surface-500 mr-2">
                                                        بواسطة {cp.granted_by_name}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Warning for developers */}
                        {userPerms.data.user?.role === 'developer' && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                <div>
                                    <div className="font-medium text-yellow-800 dark:text-yellow-200">
                                        حساب مطور
                                    </div>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                        المطورون لا يملكون صلاحية الوصول للبيانات الحساسة (الرواتب، البيانات المالية) بشكل افتراضي.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-64 text-surface-400">
                        <div className="text-center">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>اختر مستخدماً لعرض صلاحياته</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

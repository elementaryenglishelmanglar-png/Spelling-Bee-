import React, { useState, useEffect } from 'react';
import { School, StudentProfile, Payment, SchoolResource, GradeLevel } from '../types';
import { fetchSchools, addSchool, updateSchool, deleteSchool, fetchStudents, fetchPayments, updatePayment, fetchSchoolResources, addSchoolResource, deleteSchoolResource } from '../services/supabaseData';
import { useToast } from '../lib/toastContext';
import { LoadingOverlay } from '../components/LoadingSpinner';
import { Plus, School as SchoolIcon, Users, ChevronRight, UserCheck, Trash2, Edit2, DollarSign, Upload, Image as ImageIcon, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';

export const InterschoolManager: React.FC = () => {
    const { showToast } = useToast();
    const [schools, setSchools] = useState<School[]>([]);
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'list' | 'edition4' | 'payments' | 'resources'>('list');

    // Create/Edit School Form
    const [showSchoolForm, setShowSchoolForm] = useState(false);
    const [editingSchool, setEditingSchool] = useState<School | null>(null);
    const [schoolName, setSchoolName] = useState('');
    const [schoolUser, setSchoolUser] = useState('');
    const [schoolPass, setSchoolPass] = useState('');
    const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    // Resources View
    const [resources, setResources] = useState<SchoolResource[]>([]);
    const [resourceTitle, setResourceTitle] = useState('');
    const [resourceGrade, setResourceGrade] = useState<GradeLevel>(1);
    const [resourceFile, setResourceFile] = useState<File | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [s, st, p, r] = await Promise.all([
                fetchSchools(),
                fetchStudents(),
                fetchPayments(),
                fetchSchoolResources()
            ]);
            setSchools(s);
            setStudents(st);
            setPayments(p);
            setResources(r);
        } catch (e) {
            console.error(e);
            showToast('Error loading interschool data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResourceUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resourceTitle || !resourceFile) {
            showToast('Title and PDF file are required', 'error');
            return;
        }

        setProcessing(true);
        try {
            const newRes = {
                id: crypto.randomUUID(),
                title: resourceTitle,
                grade: resourceGrade,
                fileUrl: '', // Will be set by service
                createdAt: new Date().toISOString()
            };

            const added = await addSchoolResource(newRes, resourceFile);
            setResources(prev => [added, ...prev]);
            showToast('Resource uploaded successfully', 'success');

            // Reset
            setResourceTitle('');
            setResourceFile(null);
            setResourceGrade(1);
            // Reset file input
            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

        } catch (e) {
            console.error(e);
            showToast('Error uploading resource', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteResource = async (id: string, url: string) => {
        if (!confirm('Are you sure you want to delete this resource?')) return;
        setProcessing(true);
        try {
            await deleteSchoolResource(id, url);
            setResources(prev => prev.filter(r => r.id !== id));
            showToast('Resource deleted', 'success');
        } catch (e) {
            showToast('Error deleting resource', 'error');
        } finally {
            setProcessing(false);
        }
    };

    // ... (rest of the file existing functions)

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSchoolLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const openCreateForm = () => {
        setEditingSchool(null);
        setSchoolName('');
        setSchoolUser('');
        setSchoolPass('');
        setSchoolLogo(null);
        setShowSchoolForm(true);
    };

    const openEditForm = (school: School) => {
        setEditingSchool(school);
        setSchoolName(school.name);
        setSchoolUser(school.username);
        setSchoolPass(''); // Don't show password
        setSchoolLogo(school.logo || null);
        setShowSchoolForm(true);
    };

    const handleSaveSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schoolName || !schoolUser) {
            showToast('Name and Username are required', 'error');
            return;
        }
        if (!editingSchool && !schoolPass) {
            showToast('Password is required for new schools', 'error');
            return;
        }

        setProcessing(true);
        try {
            if (editingSchool) {
                const updated: School = {
                    ...editingSchool,
                    name: schoolName,
                    username: schoolUser,
                    password: schoolPass || undefined,
                    logo: schoolLogo || undefined
                };
                const result = await updateSchool(updated);
                setSchools(prev => prev.map(s => s.id === result.id ? result : s));
                showToast('School updated successfully', 'success');
            } else {
                const newSchool: School = {
                    id: crypto.randomUUID(),
                    name: schoolName,
                    username: schoolUser,
                    password: schoolPass,
                    logo: schoolLogo || undefined
                };
                const result = await addSchool(newSchool);
                setSchools(prev => [...prev, result]);
                showToast('School added successfully', 'success');
            }
            setShowSchoolForm(false);
        } catch (e) {
            console.error(e);
            showToast('Error saving school', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteSchool = async (id: string) => {
        if (!confirm('Are you sure? This will delete the school and potentially unlink all its students.')) return;
        setProcessing(true);
        try {
            await deleteSchool(id);
            setSchools(prev => prev.filter(s => s.id !== id));
            showToast('School deleted', 'success');
        } catch (e) {
            console.error(e);
            showToast('Error deleting school', 'error');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-stone-500">Loading data...</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            <LoadingOverlay isLoading={processing} text="Processing..." />

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-stone-800">Interschool Management</h2>
                    <p className="text-stone-500">Manage invited schools, payments, and Edition IV delegations.</p>
                </div>
                <div className="flex gap-2 box-border flex-wrap">
                    <button
                        onClick={() => setActiveView('list')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'list' ? 'bg-stone-800 text-yellow-400' : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'}`}
                    >
                        Schools List
                    </button>
                    <button
                        onClick={() => setActiveView('payments')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'payments' ? 'bg-stone-800 text-yellow-400' : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'}`}
                    >
                        Payments
                    </button>
                    <button
                        onClick={() => setActiveView('edition4')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'edition4' ? 'bg-stone-800 text-yellow-400' : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'}`}
                    >
                        Edition IV
                    </button>
                    <button
                        onClick={() => setActiveView('resources')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'resources' ? 'bg-stone-800 text-yellow-400' : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'}`}
                    >
                        PDF Resources
                    </button>
                </div>
            </header>

            {activeView === 'resources' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                        <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                            <Upload size={20} className="text-blue-600" />
                            Upload New Resource (PDF)
                        </h3>
                        <form onSubmit={handleResourceUpload} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-bold text-stone-700 mb-1">Target Grade</label>
                                <select
                                    value={resourceGrade}
                                    onChange={e => setResourceGrade(Number(e.target.value) as GradeLevel)}
                                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => <option key={g} value={g}>Grade {g}</option>)}
                                    <option value="12">Group 3</option>
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-bold text-stone-700 mb-1">Title / Description</label>
                                <input
                                    type="text"
                                    value={resourceTitle}
                                    onChange={e => setResourceTitle(e.target.value)}
                                    placeholder="e.g. Spelling List G1"
                                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-bold text-stone-700 mb-1">PDF File</label>
                                <input
                                    id="file-upload"
                                    type="file"
                                    accept="application/pdf"
                                    onChange={e => setResourceFile(e.target.files?.[0] || null)}
                                    className="w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    required
                                />
                            </div>
                            <div className="md:col-span-1">
                                <button type="submit" disabled={processing} className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                    Upload PDF
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                        <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 font-bold text-stone-700">
                            Available Resources
                        </div>
                        {resources.length === 0 ? (
                            <div className="p-8 text-center text-stone-400 italic">No resources uploaded yet.</div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-stone-50 border-b border-stone-200">
                                    <tr>
                                        <th className="text-left py-3 px-4 font-bold text-stone-600 text-sm">Grade</th>
                                        <th className="text-left py-3 px-4 font-bold text-stone-600 text-sm">Title</th>
                                        <th className="text-left py-3 px-4 font-bold text-stone-600 text-sm">Date</th>
                                        <th className="text-right py-3 px-4 font-bold text-stone-600 text-sm">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resources.map(r => (
                                        <tr key={r.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                                            <td className="py-3 px-4">
                                                <span className="inline-block px-2 py-1 bg-stone-100 text-stone-600 rounded text-xs font-bold">
                                                    {r.grade === 12 ? 'Group 3' : `Grade ${r.grade}`}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-bold text-stone-800">
                                                <a href={r.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-blue-600 hover:underline">
                                                    <FileText size={16} className="text-red-500" />
                                                    {r.title}
                                                </a>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-stone-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteResource(r.id, r.fileUrl)}
                                                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeView === 'list' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button
                            onClick={openCreateForm}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus size={18} />
                            <span>Invite New School</span>
                        </button>
                    </div>

                    {showSchoolForm && (
                        <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm animate-slide-in">
                            <h3 className="font-bold text-lg text-stone-800 mb-4">{editingSchool ? 'Edit School' : 'New School'}</h3>
                            <form onSubmit={handleSaveSchool} className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-24 h-24 bg-stone-100 rounded-lg flex-shrink-0 flex items-center justify-center border-2 border-dashed border-stone-300 relative cursor-pointer hover:bg-stone-50 transition-colors overflow-hidden">
                                        {schoolLogo ? (
                                            <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="text-center">
                                                <ImageIcon className="mx-auto text-stone-400 mb-1" size={24} />
                                                <span className="text-xs text-stone-500">Logo</span>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-stone-700 mb-1">School Name</label>
                                            <input
                                                type="text"
                                                value={schoolName}
                                                onChange={e => setSchoolName(e.target.value)}
                                                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="e.g. St. Mary's Academy"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-stone-700 mb-1">Username</label>
                                            <input
                                                type="text"
                                                value={schoolUser}
                                                onChange={e => setSchoolUser(e.target.value)}
                                                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="Username"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-stone-700 mb-1">{editingSchool ? 'New Password (leave blank to keep)' : 'Password'}</label>
                                            <input
                                                type="text"
                                                value={schoolPass}
                                                onChange={e => setSchoolPass(e.target.value)}
                                                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="Password"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                                    <button type="button" onClick={() => setShowSchoolForm(false)} className="px-4 py-2 text-stone-500 hover:text-stone-700 font-medium">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">{editingSchool ? 'Update School' : 'Create School'}</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {schools.map(school => {
                            const studentCount = students.filter(s => s.schoolId === school.id || s.school === school.name).length;
                            return (
                                <div key={school.id} className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow relative group">
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditForm(school)} className="p-1.5 bg-stone-100 text-stone-600 rounded-md hover:bg-stone-200 hover:text-blue-600 transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteSchool(school.id)} className="p-1.5 bg-red-50 text-red-500 rounded-md hover:bg-red-100 hover:text-red-600 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-stone-100 rounded-lg flex items-center justify-center overflow-hidden border border-stone-200">
                                            {school.logo ? (
                                                <img src={school.logo} alt="" className="w-full h-full object-contain" />
                                            ) : (
                                                <SchoolIcon className="text-stone-400" size={24} />
                                            )}
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full mb-1 inline-block">
                                                {school.username}
                                            </span>
                                            <h3 className="text-lg font-bold text-stone-800 leading-tight">{school.name}</h3>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-sm text-stone-500 border-t border-stone-100 pt-4">
                                        <div className="flex items-center gap-2">
                                            <Users size={16} />
                                            <span>{studentCount} Students</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeView === 'payments' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                        <h3 className="text-lg font-bold text-stone-800 mb-4">Payment Overview</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-stone-200">
                                        <th className="text-left py-3 px-4 font-bold text-stone-600 text-sm">Date</th>
                                        <th className="text-left py-3 px-4 font-bold text-stone-600 text-sm">School</th>
                                        <th className="text-left py-3 px-4 font-bold text-stone-600 text-sm">Method</th>
                                        <th className="text-left py-3 px-4 font-bold text-stone-600 text-sm">Amount</th>
                                        <th className="text-left py-3 px-4 font-bold text-stone-600 text-sm">Observations</th>
                                        <th className="text-left py-3 px-4 font-bold text-stone-600 text-sm">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-stone-400">No payments verified yet.</td>
                                        </tr>
                                    ) : (
                                        payments.map(payment => {
                                            const school = schools.find(s => s.id === payment.schoolId);
                                            return (
                                                <tr key={payment.id} className="border-b border-stone-100 hover:bg-stone-50">
                                                    <td className="py-3 px-4 text-sm text-stone-800">{new Date(payment.date).toLocaleDateString()}</td>
                                                    <td className="py-3 px-4 text-sm font-medium text-stone-800">{school?.name || 'Unknown'}</td>
                                                    <td className="py-3 px-4 text-sm text-stone-600">{payment.method}</td>
                                                    <td className="py-3 px-4 text-sm font-bold text-green-600">${payment.amount}</td>
                                                    <td className="py-3 px-4 text-sm text-stone-500 italic truncate max-w-[200px]">{payment.observations || '-'}</td>
                                                    <td className="py-3 px-4 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${payment.status === 'verified' ? 'bg-green-100 text-green-700' :
                                                                payment.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                    'bg-yellow-100 text-yellow-700'
                                                                }`}>
                                                                {payment.status}
                                                            </span>

                                                            {payment.status === 'pending' && (
                                                                <div className="flex bg-gray-100 rounded-lg p-1 ml-2">
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                await updatePayment(payment.id, { status: 'verified' });
                                                                                setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: 'verified' } : p));
                                                                                showToast('Payment verified', 'success');
                                                                            } catch (e) { showToast('Error updating payment', 'error'); }
                                                                        }}
                                                                        className="p-1 text-stone-400 hover:text-green-600 hover:bg-white rounded transition-colors"
                                                                        title="Verify"
                                                                    >
                                                                        <CheckCircle size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                await updatePayment(payment.id, { status: 'rejected' });
                                                                                setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: 'rejected' } : p));
                                                                                showToast('Payment rejected', 'error');
                                                                            } catch (e) { showToast('Error updating payment', 'error'); }
                                                                        }}
                                                                        className="p-1 text-stone-400 hover:text-red-600 hover:bg-white rounded transition-colors"
                                                                        title="Reject"
                                                                    >
                                                                        <XCircle size={14} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeView === 'edition4' && (
                <div className="space-y-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-yellow-900 mb-2">Edition IV Overview</h3>
                        <p className="text-yellow-800">
                            Total Participating Schools: <span className="font-bold">{schools.length}</span> <br />
                            Total Registered Students: <span className="font-bold">{students.filter(s => !!s.schoolId || schools.some(sc => sc.name === s.school)).length}</span>
                        </p>
                    </div>

                    <div className="bg-white border-2 border-stone-100 rounded-xl overflow-hidden">
                        <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 font-bold text-stone-700 flex justify-between">
                            <span>Registered Delegations (By Grade)</span>
                        </div>
                        <div className="p-6">
                            {/* Group by Grade */}
                            {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(grade => {
                                const gradeStudents = students.filter(s => s.grade === grade && (!!s.schoolId || schools.some(sc => sc.name === s.school)));
                                if (gradeStudents.length === 0) return null;
                                return (
                                    <div key={grade} className="mb-6 last:mb-0">
                                        <h4 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                                            <span className="w-6 h-6 bg-stone-800 text-yellow-400 rounded flex items-center justify-center text-xs">
                                                {grade === 12 ? 'G3' : `G${grade}`}
                                            </span>
                                            <span>{grade === 12 ? 'Group 3' : `Grade ${grade}`}</span>
                                            <span className="text-stone-400 text-sm font-normal">({gradeStudents.length} students)</span>
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {gradeStudents.map(student => (
                                                <div key={student.id} className="flex items-center gap-3 p-3 border border-stone-100 rounded-lg hover:border-yellow-400 transition-colors">
                                                    {student.photo ? (
                                                        <img src={student.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-400">
                                                            <UserCheck size={16} />
                                                        </div>
                                                    )}
                                                    <div className="overflow-hidden">
                                                        <div className="font-medium text-stone-800 truncate">{student.firstName} {student.lastName}</div>
                                                        <div className="text-xs text-stone-500 truncate">{student.school}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

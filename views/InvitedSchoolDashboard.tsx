import React, { useState, useEffect } from 'react';
import { School, StudentProfile, GradeLevel, Payment, SchoolResource, Vendor, Sponsor } from '../types';
import { fetchStudents, addStudent, deleteStudent, fetchPayments, addPayment, fetchSchoolResources, fetchVendors, fetchSponsors } from '../services/supabaseData';
import { useToast } from '../lib/toastContext';
import { LogOut, Users, FileText, Upload, XCircle, CheckCircle, DollarSign, Calendar, MessageSquare, Clock, Download, Store, MapPin, Trophy } from 'lucide-react';
import { LoadingOverlay } from '../components/LoadingSpinner';
import { Leaderboard } from './Leaderboard';

interface InvitedSchoolDashboardProps {
    school: School;
    onLogout: () => void;
}

const VendorList: React.FC = () => {
    const [vendors, setVendors] = useState<Vendor[]>([]);

    useEffect(() => {
        fetchVendors().then(setVendors).catch(console.error);
    }, []);

    if (vendors.length === 0) return <div className="text-stone-400 italic">No vendors announced yet.</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map(v => (
                <div key={v.id} className="bg-stone-50 rounded-xl overflow-hidden border border-stone-100 hover:shadow-md transition-shadow">
                    <div className="h-40 bg-white relative">
                        <img src={v.logoUrl} alt={v.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4">
                        <h3 className="font-bold text-stone-800 text-lg">{v.name}</h3>
                        <p className="text-stone-600 text-sm mt-1 mb-3">{v.description}</p>
                        {v.location && (
                            <div className="flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded w-fit">
                                <MapPin size={12} /> {v.location}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

const SponsorGrid: React.FC = () => {
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);

    useEffect(() => {
        fetchSponsors().then(setSponsors).catch(console.error);
    }, []);

    if (sponsors.length === 0) return null;

    return (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-stone-100 p-6 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <img src="/bee.png" alt="Bee" className="w-32 h-32 object-contain grayscale" />
            </div>

            <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="h-px bg-stone-200 flex-1"></div>
                <h3 className="text-center font-black text-stone-400 uppercase tracking-widest text-xs flex items-center gap-2">
                    <img src="/bee.png" alt="Bee" className="w-4 h-4 object-contain grayscale opacity-50" />
                    Proudly Supported By
                </h3>
                <div className="h-px bg-stone-200 flex-1"></div>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 relative z-10">
                {sponsors.map(s => (
                    <a
                        key={s.id}
                        href={s.websiteUrl || '#'}
                        target={s.websiteUrl ? "_blank" : "_self"}
                        rel="noreferrer"
                        className="group relative transition-transform hover:scale-110 grayscale hover:grayscale-0 opacity-70 hover:opacity-100 duration-300"
                        title={s.name}
                    >
                        <img
                            src={s.logoUrl}
                            alt={s.name}
                            className={`object-contain transition-all duration-300 ${s.tier === 'Gold' ? 'h-16 md:h-20' :
                                s.tier === 'Silver' ? 'h-12 md:h-16' :
                                    'h-8 md:h-12'
                                }`}
                        />
                        {s.tier === 'Gold' && (
                            <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm scale-0 group-hover:scale-100 transition-transform">
                                PARTNER
                            </div>
                        )}
                    </a>
                ))}
            </div>
        </div>
    );
};

export const InvitedSchoolDashboard: React.FC<InvitedSchoolDashboardProps> = ({ school, onLogout }) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'delegation' | 'registration' | 'docs' | 'payments' | 'market' | 'leaderboard'>('delegation');
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [resources, setResources] = useState<SchoolResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Student Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [grade, setGrade] = useState<GradeLevel>(1);
    const [photo, setPhoto] = useState<string | null>(null);

    // Payment Form State
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState('');
    const [paymentObs, setPaymentObs] = useState('');

    useEffect(() => {
        loadSchoolData();
    }, [school.id]);

    const loadSchoolData = async () => {
        setLoading(true);
        try {
            const [allStudents, allPayments, allResources] = await Promise.all([
                fetchStudents(),
                fetchPayments(school.id),
                fetchSchoolResources()
            ]);

            // Filter students for this school (client-side for now)
            const schoolStudents = allStudents.filter(s => s.schoolId === school.id || s.school === school.name);
            setStudents(schoolStudents);
            setPayments(allPayments);
            setResources(allResources);
        } catch (e) {
            console.error(e);
            showToast('Error loading data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhoto(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleStudentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName || !lastName || !photo) {
            showToast('Please fill all fields and upload a photo', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const newStudent: StudentProfile = {
                id: crypto.randomUUID(),
                firstName,
                lastName,
                school: school.name,
                schoolId: school.id,
                grade,
                photo,
            };

            await addStudent(newStudent);
            showToast('Student registered successfully!', 'success');

            // Reset form
            setFirstName('');
            setLastName('');
            setGrade(1);
            setPhoto(null);

            // Refresh list
            await loadSchoolData();
            setActiveTab('delegation');
        } catch (e) {
            console.error(e);
            showToast('Error registering student', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStudentDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this student?')) return;
        try {
            await deleteStudent(id);
            setStudents(prev => prev.filter(s => s.id !== id));
            showToast('Student removed', 'success');
        } catch (e) {
            showToast('Error removing student', 'error');
        }
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentAmount || !paymentDate) {
            showToast('Please fill amount and date', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const newPayment: Payment = {
                id: crypto.randomUUID(),
                schoolId: school.id,
                amount: parseFloat(paymentAmount),
                method: 'Cash USD',
                date: paymentDate,
                observations: paymentObs,
                status: 'pending' // Default status
            };

            await addPayment(newPayment);
            showToast('Payment registered! Waiting for verification.', 'success');

            // Reset
            setPaymentAmount('');
            setPaymentDate('');
            setPaymentObs('');

            // Refresh
            const updatedPayments = await fetchPayments(school.id);
            setPayments(updatedPayments);
        } catch (e) {
            console.error(e);
            showToast('Error registering payment', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Helper to group resources
    const groupedResources = resources.reduce((acc, resource) => {
        const grade = resource.grade;
        if (!acc[grade]) acc[grade] = [];
        acc[grade].push(resource);
        return acc;
    }, {} as Record<number, SchoolResource[]>);

    if (loading) return <div className="p-8 text-center">Loading school data...</div>;

    return (
        <div className="min-h-screen bg-orange-50/30 font-sans">
            <LoadingOverlay isLoading={submitting} text="Processing..." />

            {/* Header */}
            <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center border border-stone-200 overflow-hidden">
                                {school.logo ? (
                                    <img src={school.logo} alt="Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <Users size={24} className="text-stone-400" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-stone-800 leading-tight">
                                    {school.name}
                                </h1>
                                <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mt-0.5">Invited School Portal</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={onLogout}
                                className="px-4 py-2 text-stone-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 font-medium text-sm"
                                title="Logout"
                            >
                                <LogOut size={18} />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Enhanced Sponsor Display (Always Visible) */}
                <div className="mb-10 animate-fade-in">
                    <SponsorGrid />
                </div>

                {/* Tabs */}
                <div className="mb-8">
                    {/* Contenedor de Tabs - Grid en móvil, Flex en desktop */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap md:justify-center gap-2 p-1 bg-stone-100/50 backdrop-blur-sm rounded-xl border border-stone-200/60">
                        {[
                            { id: 'delegation', label: 'Delegation', icon: Users, desc: 'Your team' },
                            { id: 'registration', label: 'Register', icon: CheckCircle, desc: 'New student' },
                            { id: 'payments', label: 'Payments', icon: DollarSign, desc: 'History' },
                            { id: 'docs', label: 'Docs', icon: FileText, desc: 'Resources' },
                            { id: 'market', label: 'Market', icon: Store, desc: 'Vendors' },
                            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, desc: 'Rankings' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                                    relative flex flex-col items-center justify-center gap-1.5 p-3 sm:px-6 sm:py-3.5 
                                    rounded-lg text-sm font-bold transition-all duration-200 outline-none
                                    ${activeTab === tab.id
                                        ? 'bg-white text-blue-600 shadow-sm border border-stone-200/50 scale-[1.02] ring-1 ring-black/5'
                                        : 'text-stone-500 hover:text-stone-700 hover:bg-white/60 border border-transparent'
                                    }
                                    ${tab.id === 'market' || tab.id === 'leaderboard' ? 'col-span-1 sm:col-span-1' : ''} 
                                `}
                            >
                                <tab.icon size={20} className={`transition-transform duration-200 ${activeTab === tab.id ? 'scale-110' : ''}`} />
                                <div className="text-center">
                                    <span className="block">{tab.label}</span>
                                    <span className={`text-[10px] sm:text-xs font-medium mt-0.5 hidden sm:block ${activeTab === tab.id ? 'text-blue-400' : 'text-stone-400'}`}>
                                        {tab.desc}
                                    </span>
                                </div>
                                {activeTab === tab.id && (
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-500 rounded-full md:hidden"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                {activeTab === 'delegation' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-stone-800">Your Delegation</h2>
                            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                                {students.length} Students
                            </div>
                        </div>

                        {students.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-stone-200">
                                <Users size={48} className="mx-auto text-stone-300 mb-4" />
                                <p className="text-stone-500 text-lg font-medium">No students registered yet.</p>
                                <button
                                    onClick={() => setActiveTab('registration')}
                                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-sm"
                                >
                                    Register your first student
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {students.map(student => (
                                    <div key={student.id} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col group">
                                        <div className="aspect-square bg-stone-100 relative overflow-hidden">
                                            {student.photo ? (
                                                <img src={student.photo} alt={student.firstName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-stone-300">
                                                    <Users size={48} />
                                                </div>
                                            )}
                                            <button
                                                onClick={() => handleStudentDelete(student.id)}
                                                className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-red-50 text-stone-500 hover:text-red-500 rounded-full transition-colors backdrop-blur-sm opacity-0 group-hover:opacity-100"
                                                title="Remove student"
                                            >
                                                <XCircle size={20} />
                                            </button>
                                        </div>
                                        <div className="p-4 flex-1">
                                            <h3 className="font-bold text-lg text-stone-800 truncate">{student.firstName} {student.lastName}</h3>
                                            <p className="text-stone-500 text-sm font-medium">Grade {student.grade}</p>
                                            <div className="mt-4 pt-4 border-t border-stone-100 flex items-center gap-2 text-sm text-green-600 font-bold">
                                                <CheckCircle size={16} />
                                                <span>Registered</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}


                    </div>
                )}

                {activeTab === 'registration' && (
                    <div className="max-w-2xl mx-auto animate-fade-in">
                        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 sm:p-8">
                            <h2 className="text-xl font-bold text-stone-800 mb-6">Register New Participant</h2>
                            <form onSubmit={handleStudentSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-stone-700 mb-1">First Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={firstName}
                                            onChange={e => setFirstName(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            placeholder="e.g. John"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-stone-700 mb-1">Last Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={lastName}
                                            onChange={e => setLastName(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            placeholder="e.g. Doe"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1">Grade Level</label>
                                    <select
                                        value={grade}
                                        onChange={e => setGrade(Number(e.target.value) as GradeLevel)}
                                        className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    >
                                        <option value="12">Group 3</option>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => (
                                            <option key={g} value={g}>Grade {g}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1">Student Photo</label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-stone-300 border-dashed rounded-lg hover:bg-stone-50 transition-colors relative cursor-pointer group">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="space-y-1 text-center">
                                            {photo ? (
                                                <div className="relative inline-block">
                                                    <img src={photo} alt="Preview" className="h-32 w-32 object-cover rounded-full mx-auto" />
                                                    <div className="mt-2 text-sm text-blue-600 font-bold">Click to change</div>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload className="mx-auto h-12 w-12 text-stone-400 group-hover:text-blue-500 transition-colors" />
                                                    <div className="flex text-sm text-stone-600 justify-center">
                                                        <span className="relative cursor-pointer rounded-md font-bold text-blue-600 hover:text-blue-500">
                                                            Upload a file
                                                        </span>
                                                        <p className="pl-1">or drag and drop</p>
                                                    </div>
                                                    <p className="text-xs text-stone-400 font-medium">PNG, JPG, GIF up to 5MB</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
                                    >
                                        {submitting ? 'Registering...' : 'Register Student'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'payments' && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 sm:p-8">
                            <h2 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                                <DollarSign className="text-green-600" />
                                Register Payment
                            </h2>
                            <form onSubmit={handlePaymentSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1">Amount (USD)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-stone-500 font-bold">$</span>
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            required
                                            value={paymentAmount}
                                            onChange={e => setPaymentAmount(e.target.value)}
                                            className="w-full pl-8 pr-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1">Date</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Calendar size={16} className="text-stone-400" />
                                        </div>
                                        <input
                                            type="date"
                                            required
                                            value={paymentDate}
                                            onChange={e => setPaymentDate(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-stone-700 mb-1">Observations / Notes</label>
                                    <div className="relative">
                                        <div className="absolute top-3 left-3 pointer-events-none">
                                            <MessageSquare size={16} className="text-stone-400" />
                                        </div>
                                        <textarea
                                            value={paymentObs}
                                            onChange={e => setPaymentObs(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all min-h-[80px]"
                                            placeholder="Anything you'd like to add about this payment..."
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        Register Cash Payment
                                    </button>
                                    <p className="text-center text-xs text-stone-400 mt-2">
                                        * Only Cash USD payments are currently accepted.
                                    </p>
                                </div>
                            </form>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-stone-700">Payment History</h3>
                            {payments.length === 0 ? (
                                <div className="bg-white p-8 rounded-xl border border-stone-200 text-center text-stone-400 italic">
                                    No payments registered yet.
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden overflow-x-auto">
                                    <table className="w-full min-w-[500px]">
                                        <thead className="bg-stone-50 border-b border-stone-200">
                                            <tr>
                                                <th className="text-left py-3 px-4 font-bold text-stone-600 text-sm whitespace-nowrap">Date</th>
                                                <th className="text-left py-3 px-4 font-bold text-stone-600 text-sm whitespace-nowrap">Amount</th>
                                                <th className="text-left py-3 px-4 font-bold text-stone-600 text-sm whitespace-nowrap">Status</th>
                                                <th className="text-left py-3 px-4 font-bold text-stone-600 text-sm min-w-[200px]">Observations</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.map(p => (
                                                <tr key={p.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                                                    <td className="py-3 px-4 text-stone-800 text-sm whitespace-nowrap">{new Date(p.date).toLocaleDateString()}</td>
                                                    <td className="py-3 px-4 font-bold text-green-700 text-sm whitespace-nowrap">${p.amount}</td>
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${p.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                            {p.status === 'pending' && <Clock size={12} />}
                                                            {p.status === 'verified' && <CheckCircle size={12} />}
                                                            <span className="capitalize">{p.status}</span>
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-stone-500 text-sm italic">{p.observations || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'docs' && (
                    <div className="space-y-6 animate-fade-in">
                        <h2 className="text-xl font-bold text-stone-800">Documentation & Resources</h2>

                        {resources.length === 0 ? (
                            <div className="bg-white p-8 rounded-xl border border-stone-200 text-center">
                                <FileText size={48} className="mx-auto text-stone-300 mb-4" />
                                <p className="text-stone-500 font-medium">No documents available yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(grade => {
                                    const gradeResources = groupedResources[grade];
                                    if (!gradeResources || gradeResources.length === 0) return null;

                                    return (
                                        <div key={grade} className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                                            <div className="bg-stone-50 px-6 py-3 border-b border-stone-200 flex items-center gap-2">
                                                <span className="w-8 h-8 rounded-lg bg-stone-800 text-yellow-400 flex items-center justify-center font-bold text-sm">
                                                    {grade === 12 ? 'G3' : `G${grade}`}
                                                </span>
                                                <h3 className="font-bold text-stone-700">
                                                    {grade === 12 ? 'Group 3 Resources' : `Grade ${grade} Resources`}
                                                </h3>
                                            </div>
                                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {gradeResources.map(res => (
                                                    <div key={res.id} className="border border-stone-100 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all group">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2.5 bg-red-50 text-red-500 rounded-lg group-hover:bg-red-100 transition-colors">
                                                                    <FileText size={20} />
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-stone-800 leading-tight group-hover:text-blue-700 transition-colors">{res.title}</h4>
                                                                    <p className="text-xs text-stone-400 mt-1">{new Date(res.createdAt).toLocaleDateString()}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={res.fileUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-stone-50 text-stone-600 rounded-lg text-sm font-bold hover:bg-blue-600 hover:text-white transition-colors"
                                                        >
                                                            <Download size={16} />
                                                            Download PDF
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mt-8">
                            <h3 className="text-lg font-bold text-blue-900 mb-2">Need Help?</h3>
                            <p className="text-blue-700 text-sm mb-4">
                                If you have any questions about the registration process or the event details, please contact the event coordinator.
                            </p>
                            <div className="font-medium text-blue-800">
                                elementaryenglish.elmanglar@gmail.com <br />
                                +58 412-185-7248
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'market' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
                            <h2 className="text-xl font-bold text-stone-800 mb-2">Event Vendors</h2>
                            <p className="text-stone-500 mb-6">Discover the shops and stands available during the Spelling Bee event.</p>

                            <VendorList />
                        </div>
                    </div>
                )}

                {activeTab === 'leaderboard' && (
                    <div className="space-y-8 animate-fade-in">
                        <Leaderboard />
                    </div>
                )}
            </div>
        </div>
    );
};



import React, { useState, useEffect } from 'react';
import { Sponsor } from '../types';
import { fetchSponsors, addSponsor, deleteSponsor } from '../services/supabaseData';
import { useToast } from '../lib/toastContext';
import { Upload, XCircle, Trash2, Globe, Shield } from 'lucide-react';
import { LoadingOverlay } from '../components/LoadingSpinner';

const PREDEFINED_SPONSORS: Sponsor[] = [
    {
        id: 'sponsor-1',
        name: 'TechCorp',
        logoUrl: 'https://placehold.co/200x100?text=TechCorp',
        websiteUrl: 'https://example.com',
        tier: 'Gold'
    },
    {
        id: 'sponsor-2',
        name: 'EduBooks',
        logoUrl: 'https://placehold.co/200x100?text=EduBooks',
        websiteUrl: 'https://example.com',
        tier: 'Silver'
    }
];

export const SponsorsManager: React.FC = () => {
    const { showToast } = useToast();
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [website, setWebsite] = useState('');
    const [tier, setTier] = useState<'Gold' | 'Silver' | 'Bronze'>('Silver');
    const [logo, setLogo] = useState<string | null>(null);

    useEffect(() => {
        loadSponsors();
    }, []);

    const loadSponsors = async () => {
        setLoading(true);
        try {
            const data = await fetchSponsors();
            setSponsors(data);
        } catch (e) {
            console.error(e);
            showToast('Error loading sponsors', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !logo) {
            showToast('Name and Logo are required', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const newSponsor: Sponsor = {
                id: crypto.randomUUID(),
                name,
                logoUrl: logo,
                websiteUrl: website || undefined,
                tier
            };

            const added = await addSponsor(newSponsor);
            setSponsors(prev => [...prev, added]);
            showToast('Sponsor added successfully!', 'success');

            // Reset
            setName('');
            setWebsite('');
            setTier('Silver');
            setLogo(null);
        } catch (e) {
            console.error(e);
            showToast('Error adding sponsor', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this sponsor?')) return;
        try {
            await deleteSponsor(id);
            setSponsors(prev => prev.filter(s => s.id !== id));
            showToast('Sponsor removed', 'success');
        } catch (e) {
            showToast('Error removing sponsor', 'error');
        }
    };

    if (loading) return <div className="text-center p-8">Loading sponsors...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <LoadingOverlay isLoading={submitting} text="Adding Sponsor..." />

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-stone-800">Manage Sponsors</h2>
                    <p className="text-stone-500">Add event sponsors to be displayed on the platform.</p>
                </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 sm:p-8">
                <h3 className="text-lg font-bold text-stone-800 mb-6">Add New Sponsor</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">Company Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Acme Corp"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">Website URL (Optional)</label>
                            <div className="relative">
                                <Globe size={16} className="absolute top-3 left-3 text-stone-400" />
                                <input
                                    type="url"
                                    value={website}
                                    onChange={e => setWebsite(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="https://"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">Sponsorship Tier</label>
                            <div className="relative">
                                <Shield size={16} className="absolute top-3 left-3 text-stone-400" />
                                <select
                                    value={tier}
                                    onChange={e => setTier(e.target.value as any)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                                >
                                    <option value="Gold">Gold Sponsor</option>
                                    <option value="Silver">Silver Sponsor</option>
                                    <option value="Bronze">Bronze Sponsor</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-stone-700 mb-1">Sponsor Logo</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-stone-300 border-dashed rounded-lg hover:bg-stone-50 transition-colors relative cursor-pointer group h-full max-h-[220px]">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="space-y-1 text-center flex flex-col items-center justify-center">
                                {logo ? (
                                    <div className="relative inline-block">
                                        <img src={logo} alt="Preview" className="h-32 object-contain mx-auto" />
                                        <div className="mt-2 text-sm text-blue-600 font-bold">Click to change</div>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="mx-auto h-12 w-12 text-stone-400 group-hover:text-blue-500 transition-colors" />
                                        <div className="flex text-sm text-stone-600 justify-center mt-2">
                                            <span className="relative cursor-pointer rounded-md font-bold text-blue-600 hover:text-blue-500">
                                                Upload Logo
                                            </span>
                                        </div>
                                        <p className="text-xs text-stone-400 font-medium mt-1">PNG, JPG, SVG</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 pt-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                            Add Sponsor
                        </button>
                    </div>
                </form>
            </div>

            {/* List */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-stone-800">Current Sponsors</h3>
                {sponsors.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-stone-200 text-stone-400">
                        No sponsors added yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sponsors.map(sponsor => (
                            <div key={sponsor.id} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden group relative">
                                <div className="h-32 p-4 bg-stone-50 flex items-center justify-center relative">
                                    <img src={sponsor.logoUrl} alt={sponsor.name} className="max-h-full max-w-full object-contain" />
                                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider
                                        ${sponsor.tier === 'Gold' ? 'bg-yellow-100 text-yellow-700' :
                                            sponsor.tier === 'Silver' ? 'bg-stone-200 text-stone-600' :
                                                'bg-orange-100 text-orange-700'}`}>
                                        {sponsor.tier}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h4 className="font-bold text-lg text-stone-800">{sponsor.name}</h4>
                                    {sponsor.websiteUrl && (
                                        <a href={sponsor.websiteUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline block truncate">
                                            {sponsor.websiteUrl}
                                        </a>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(sponsor.id)}
                                    className="absolute top-2 left-2 p-1.5 bg-white/90 text-red-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

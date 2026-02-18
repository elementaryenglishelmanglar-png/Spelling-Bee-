import React, { useState, useEffect } from 'react';
import { Vendor } from '../types';
import { fetchVendors, addVendor, deleteVendor } from '../services/supabaseData';
import { useToast } from '../lib/toastContext';
import { Upload, Trash2, MapPin, Store } from 'lucide-react';
import { LoadingOverlay } from '../components/LoadingSpinner';

export const VendorsManager: React.FC = () => {
    const { showToast } = useToast();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [logo, setLogo] = useState<string | null>(null);

    useEffect(() => {
        loadVendors();
    }, []);

    const loadVendors = async () => {
        setLoading(true);
        try {
            const data = await fetchVendors();
            setVendors(data);
        } catch (e) {
            console.error(e);
            showToast('Error loading vendors', 'error');
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
            showToast('Name and Logo/Image are required', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const newVendor: Vendor = {
                id: crypto.randomUUID(),
                name,
                description,
                logoUrl: logo,
                location: location || undefined
            };

            const added = await addVendor(newVendor);
            setVendors(prev => [...prev, added]);
            showToast('Vendor added successfully!', 'success');

            // Reset
            setName('');
            setDescription('');
            setLocation('');
            setLogo(null);
        } catch (e) {
            console.error(e);
            showToast('Error adding vendor', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this vendor?')) return;
        try {
            await deleteVendor(id);
            setVendors(prev => prev.filter(v => v.id !== id));
            showToast('Vendor removed', 'success');
        } catch (e) {
            showToast('Error removing vendor', 'error');
        }
    };

    if (loading) return <div className="text-center p-8">Loading vendors...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <LoadingOverlay isLoading={submitting} text="Adding Vendor..." />

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-stone-800">Manage Vendors</h2>
                    <p className="text-stone-500">Add shops and stalls that will be present at the event.</p>
                </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 sm:p-8">
                <h3 className="text-lg font-bold text-stone-800 mb-6">Add New Vendor</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">Vendor / Shop Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="e.g. The Book Nook"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-purple-500 outline-none min-h-[80px]"
                                placeholder="What do they sell?"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">Location / Stand (Optional)</label>
                            <div className="relative">
                                <MapPin size={16} className="absolute top-3 left-3 text-stone-400" />
                                <input
                                    type="text"
                                    value={location}
                                    onChange={e => setLocation(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="e.g. Hall A, Stand 4"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-stone-700 mb-1">Logo or Product Image</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-stone-300 border-dashed rounded-lg hover:bg-stone-50 transition-colors relative cursor-pointer group h-full max-h-[260px]">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="space-y-1 text-center flex flex-col items-center justify-center">
                                {logo ? (
                                    <div className="relative inline-block">
                                        <img src={logo} alt="Preview" className="h-40 object-cover rounded-lg mx-auto" />
                                        <div className="mt-2 text-sm text-blue-600 font-bold">Click to change</div>
                                    </div>
                                ) : (
                                    <>
                                        <Store className="mx-auto h-12 w-12 text-stone-400 group-hover:text-purple-500 transition-colors" />
                                        <div className="flex text-sm text-stone-600 justify-center mt-2">
                                            <span className="relative cursor-pointer rounded-md font-bold text-blue-600 hover:text-blue-500">
                                                Upload Image
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
                            className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                            Add Vendor
                        </button>
                    </div>
                </form>
            </div>

            {/* List */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-stone-800">Current Vendors</h3>
                {vendors.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-stone-200 text-stone-400">
                        No vendors added yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {vendors.map(vendor => (
                            <div key={vendor.id} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex">
                                <div className="w-1/3 min-w-[120px] bg-stone-100 relative">
                                    <img src={vendor.logoUrl} alt={vendor.name} className="w-full h-full object-cover absolute inset-0" />
                                </div>
                                <div className="p-4 flex-1 flex flex-col relative group">
                                    <h4 className="font-bold text-lg text-stone-800">{vendor.name}</h4>
                                    <p className="text-stone-500 text-sm mt-1 line-clamp-2">{vendor.description}</p>

                                    {vendor.location && (
                                        <div className="mt-auto pt-3 flex items-center gap-1 text-xs font-bold text-purple-600">
                                            <MapPin size={14} />
                                            <span>{vendor.location}</span>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => handleDelete(vendor.id)}
                                        className="absolute top-2 right-2 p-1.5 bg-stone-100 hover:bg-red-50 text-stone-400 hover:text-red-500 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

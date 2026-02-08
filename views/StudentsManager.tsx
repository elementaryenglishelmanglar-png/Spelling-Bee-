import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StudentProfile, GradeLevel } from '../types';
import { Users, Plus, Trash2, School, Camera, X, Pencil } from 'lucide-react';

interface StudentsManagerProps {
  students: StudentProfile[];
  onAddStudent: (student: StudentProfile) => void;
  onUpdateStudent: (student: StudentProfile) => void;
  onDeleteStudent: (id: string) => void;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({ students, onAddStudent, onUpdateStudent, onDeleteStudent }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState<GradeLevel>(1);
  const [photo, setPhoto] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter States
  const [filterGrade, setFilterGrade] = useState<GradeLevel | 'All'>('All');
  const [filterSchool, setFilterSchool] = useState<string>('All');

  // When editing, fill form with student data
  useEffect(() => {
    if (editingStudent) {
      setFirstName(editingStudent.firstName);
      setLastName(editingStudent.lastName);
      setSchool(editingStudent.school);
      setGrade(editingStudent.grade);
      setPhoto(editingStudent.photo ?? null);
    } else {
      setFirstName('');
      setLastName('');
      setSchool('');
      setGrade(1);
      setPhoto(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [editingStudent]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic check for file size (limit to ~2MB to prevent LocalStorage issues)
      if (file.size > 2 * 1024 * 1024) {
        alert("File size too large. Please select an image under 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !school.trim()) return;

    if (editingStudent) {
      const updated: StudentProfile = {
        ...editingStudent,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        school: school.trim(),
        grade,
        photo: photo || undefined,
      };
      onUpdateStudent(updated);
      setEditingStudent(null);
    } else {
      const newStudent: StudentProfile = {
        id: crypto.randomUUID(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        school: school.trim(),
        grade,
        photo: photo || undefined
      };
      onAddStudent(newStudent);
      setFirstName('');
      setLastName('');
      setPhoto(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
    setFirstName('');
    setLastName('');
    setSchool('');
    setGrade(1);
    setPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Extract unique schools for filter
  const uniqueSchools = useMemo(() => {
    return Array.from(new Set(students.map(s => s.school))).sort();
  }, [students]);

  const filteredStudents = students
    .filter(s => filterGrade === 'All' ? true : s.grade === filterGrade)
    .filter(s => filterSchool === 'All' ? true : s.school === filterSchool)
    .sort((a, b) => a.grade - b.grade || a.lastName.localeCompare(b.lastName));

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <header>
        <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
          <Users className="text-stone-500" /> Student Registry
        </h2>
        <p className="text-stone-500">Register students, define their schools, and assign grades.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm sticky top-24">
            <h3 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
              {editingStudent ? (
                <><Pencil size={18} className="text-amber-500" /> Edit Student</>
              ) : (
                <><Plus size={18} className="text-yellow-500" /> New Student</>
              )}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Photo Upload Area */}
              <div className="flex justify-center mb-4">
                <div className="relative group">
                    <div 
                        className="w-24 h-24 rounded-full bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-yellow-400 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {photo ? (
                            <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <Camera className="text-stone-400 group-hover:text-yellow-500 transition-colors" size={32} />
                        )}
                    </div>
                    {photo && (
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removePhoto(); }}
                            className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"
                        >
                            <X size={12} />
                        </button>
                    )}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        accept="image/*" 
                        className="hidden" 
                    />
                    <p className="text-xs text-center text-stone-400 mt-2">
                        {photo ? 'Click to change' : 'Upload Photo (Optional)'}
                    </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-yellow-200 outline-none"
                      placeholder="e.g. John"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-yellow-200 outline-none"
                      placeholder="e.g. Doe"
                    />
                 </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">School</label>
                <div className="relative">
                   <School className="absolute left-2.5 top-2.5 text-stone-400" size={16} />
                   <input
                     type="text"
                     value={school}
                     onChange={e => setSchool(e.target.value)}
                     className="w-full pl-9 p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-yellow-200 outline-none"
                     placeholder="School Name"
                   />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Grade</label>
                <select
                  value={grade}
                  onChange={e => setGrade(Number(e.target.value) as GradeLevel)}
                  className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-yellow-200 outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 mt-2">
                {editingStudent && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className={editingStudent ? "flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors shadow-md" : "w-full py-3 bg-stone-800 text-yellow-400 rounded-xl font-bold hover:bg-stone-900 transition-colors shadow-md"}
                >
                  {editingStudent ? 'Save changes' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Student List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-stone-200 shadow-sm gap-4">
             <span className="font-bold text-stone-700">Total Registered: {filteredStudents.length}</span>
             
             <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-stone-400 uppercase">Filters:</span>
                
                {/* Grade Filter */}
                <select 
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value === 'All' ? 'All' : Number(e.target.value) as GradeLevel)}
                    className="p-2 text-sm border border-stone-300 rounded-lg outline-none bg-white focus:border-yellow-400"
                >
                    <option value="All">All Grades</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => (
                        <option key={g} value={g}>Grade {g}</option>
                    ))}
                </select>

                {/* School Filter */}
                <select 
                    value={filterSchool}
                    onChange={(e) => setFilterSchool(e.target.value)}
                    className="p-2 text-sm border border-stone-300 rounded-lg outline-none bg-white focus:border-yellow-400 max-w-[150px]"
                >
                    <option value="All">All Schools</option>
                    {uniqueSchools.map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStudents.length === 0 ? (
                <div className="col-span-full py-12 text-center text-stone-400 border-2 border-dashed border-stone-200 rounded-xl">
                    No students match the current filters.
                </div>
            ) : (
                filteredStudents.map(student => (
                  <div key={student.id} className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm hover:border-yellow-300 transition-all group flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                        <div className="w-12 h-12 rounded-full bg-orange-50 border border-orange-100 shrink-0 overflow-hidden">
                            {student.photo ? (
                                <img src={student.photo} alt={student.firstName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-orange-600 font-bold">
                                    {student.firstName[0]}{student.lastName[0]}
                                </div>
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-stone-800">{student.firstName} {student.lastName}</h4>
                            <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                                <span className="flex items-center gap-1"><School size={12}/> {student.school}</span>
                                <span className="w-1 h-1 rounded-full bg-stone-300"></span>
                                <span className="font-bold text-stone-400">Grade {student.grade}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setEditingStudent(student)}
                        className="p-2 text-stone-300 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => onDeleteStudent(student.id)}
                        className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                    </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
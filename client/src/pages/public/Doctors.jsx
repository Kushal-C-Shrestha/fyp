import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import DoctorCard from '../../components/doctor/DoctorCard';
import DoctorFilter from '../../components/doctor/DoctorFilter';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Pagination from '../../components/ui/Pagination';
import api from '../../api/axios';

const Doctors = () => {
    const [searchParams] = useSearchParams();
    const [doctors, setDoctors] = useState([]);
    const [specialities, setSpecialities] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchInput, setSearchInput] = useState(searchParams.get('query') || '');
    const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('query') || '');

    const [filters, setFilters] = useState({
        gender: '',
        specializationId: [],
        hospitalId: searchParams.get('hospital') || '',
        sort: 'rating',
        order: 'DESC'
    });

    const scrollOnLoadRef = useRef(false);

    const [pagination, setPagination] = useState({
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        limit: 5
    });

    useEffect(() => {
        const loadFilters = async () => {
            try {
                const [specialityResult, hospitalResult] = await Promise.allSettled([
                    api.get('/specializations'),
                    api.get('/hospitals'),
                ]);

                if (specialityResult.status === 'fulfilled') {
                    setSpecialities(specialityResult.value.data.specialities || []);
                }
                if (hospitalResult.status === 'fulfilled') {
                    setHospitals(hospitalResult.value?.data?.hospitals || []);
                }
            } catch (error) {
                console.error("Error loading initial filter data", error);
            }
        };
        loadFilters();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedSearch(searchInput);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchInput]);

    useEffect(() => {
        const fetchDoctors = async () => {
            setLoading(true);

            try {
                const result = await api.get('/doctors', {
                    params: {
                        query: debouncedSearch || undefined,
                        gender: filters.gender || undefined,
                        specializationId:
                            filters.specializationId && filters.specializationId.length > 0
                                ? filters.specializationId.join(',')
                                : undefined,
                        hospitalId: filters.hospitalId || undefined,
                        sort: filters.sort || undefined,
                        order: filters.order || undefined,
                        page: pagination.currentPage,
                        limit: pagination.limit,
                    },
                });

                setDoctors(result.data.doctors || []);
                console.log(result.data);

                if (result.data.pagination) {
                    setPagination(prev => ({
                        ...prev,
                        ...result.data.pagination,
                    }));
                }

                if (scrollOnLoadRef.current) {
                    scrollOnLoadRef.current = false;
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } catch (error) {
                console.error('Error loading doctors:', error);
                setDoctors([]);
            } finally {
                setLoading(false);
            }
        };

        fetchDoctors();
    }, [debouncedSearch, filters, pagination.currentPage, pagination.limit]);

    // Handling filter search and sort changes
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handleSortChange = (e) => {
        const [sort, order] = e.target.value.split('-');
        setFilters(prev => ({ ...prev, sort, order }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handleResetFilters = () => {
        setFilters({
            gender: '',
            specializationId: [],
            hospitalId: '',
            sort: 'rating',
            order: 'DESC'
        });
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handlePageChange = (newPage) => {
        const safeTotalPages = Math.max(1, pagination.totalPages || 1);
        if (newPage >= 1 && newPage <= safeTotalPages) {
            scrollOnLoadRef.current = true;
            setPagination(prev => ({ ...prev, currentPage: newPage }));
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Navbar />

            <div className="flex-grow mt-[74px] bg-white">
                <div className="flex h-full w-full gap-6">
                    <div className="w-[340px] self-stretch">
                        <DoctorFilter
                            specialities={specialities}
                            hospitals={hospitals}
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onReset={handleResetFilters}
                        />
                    </div>

                    <main className="min-w-0 flex-1 px-8 py-5">
                        <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Doctors</h1>
                                <p className="mt-2 text-sm text-slate-600">
                                    Browse the available doctors and open a profile to see more details.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                                <div className="relative w-full sm:w-64">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search doctors..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        className="pl-10 border border-slate-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                    />
                                </div>
                                <select
                                    value={`${filters.sort}-${filters.order}`}
                                    onChange={handleSortChange}
                                    className="border border-slate-300 rounded px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="rating-DESC">Rating (Highest First)</option>
                                    <option value="rating-ASC">Rating (Lowest First)</option>
                                    <option value="name-ASC">Name (A-Z)</option>
                                    <option value="name-DESC">Name (Z-A)</option>
                                </select>
                            </div>
                        </div>

                        <div className="min-h-[600px] flex flex-col justify-between">
                            <div>
                                {loading ? (
                                    <p className="text-sm text-slate-500">Loading doctors...</p>
                                ) : doctors.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        {doctors.map((doctor) => (
                                            <DoctorCard
                                                key={doctor.user_id || doctor.id}
                                                doctor={doctor}
                                                layout="horizontal"
                                                showViewButton={false}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-20 text-center">
                                        <h3 className="text-lg font-bold text-slate-900">No doctors found</h3>
                                        <p className="mt-2 text-sm text-slate-500">
                                            There are no doctors matching your filters right now.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {pagination.totalPages > 1 && !loading && (
                                <Pagination
                                    className="mt-8"
                                    page={pagination.currentPage}
                                    totalPages={pagination.totalPages}
                                    totalItems={pagination.totalItems}
                                    pageSize={pagination.limit}
                                    itemLabel="doctors"
                                    onPageChange={handlePageChange}
                                />
                            )}
                        </div>
                    </main>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default Doctors;

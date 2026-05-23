import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Search, Building, Star } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import HospitalFilter from '../../components/hospital/HospitalFilter';
import Pagination from '../../components/ui/Pagination';
import api from '../../api/axios';

const Hospitals = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [hospitals, setHospitals] = useState([]);
  const [allHospitals, setAllHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get('query') || '');
  const [sortBy, setSortBy] = useState('name_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [filters, setFilters] = useState({
    types: [],
    departments: [],
  });
  const requestSeqRef = useRef(0);

  const handleCheckboxChange = (category, value) => {
    setFilters((prev) => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
    setCurrentPage(1);
  };

  const handleRadioChange = (category, value) => {
    setFilters((prev) => ({ ...prev, [category]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ types: [], departments: [] });
    setSearch('');
    setSortBy('name_asc');
    setCurrentPage(1);
  };

  useEffect(() => {
    const loadFilterMeta = async () => {
      try {
        const { data } = await api.get('/hospitals');
        const list = Array.isArray(data?.hospitals) ? data.hospitals : [];
        setAllHospitals(list);
      } catch (error) {
        console.error('Error loading hospitals:', error);
      }
    };

    loadFilterMeta();
  }, []);

  const hospitalTypes = useMemo(() => {
    const set = new Set(
      allHospitals
        .map((h) => String(h.hospital_type || '').trim())
        .filter(Boolean)
    );

    return [...set].sort((a, b) => a.localeCompare(b));
  }, [allHospitals]);

  const departments = useMemo(() => {
    const set = new Set();

    allHospitals.forEach((hospital) => {
      const list = Array.isArray(hospital.departments) ? hospital.departments : [];
      list.forEach((dep) => {
        if (dep) set.add(dep);
      });
    });

    return [...set].sort((a, b) => a.localeCompare(b));
  }, [allHospitals]);

  useEffect(() => {
    const sortMap = {
      name_asc: { sort: 'name', order: 'ASC' },
      name_desc: { sort: 'name', order: 'DESC' },
      year_new: { sort: 'year', order: 'DESC' },
      year_old: { sort: 'year', order: 'ASC' },
    };

    const sortParams = sortMap[sortBy] || sortMap.name_asc;

    const timeout = setTimeout(async () => {
      const requestSeq = requestSeqRef.current + 1;
      requestSeqRef.current = requestSeq;
      setLoading(true);
      try {
        const { data } = await api.get('/hospitals/search', {
          params: {
            query: search || undefined,
            types: filters.types.length > 0 ? filters.types.join(',') : undefined,
            departments: filters.departments.length > 0 ? filters.departments.join(',') : undefined,
            sort: sortParams.sort,
            order: sortParams.order,
          },
        });
        if (requestSeq !== requestSeqRef.current) return;
        const nextHospitals = Array.isArray(data?.hospitals) ? data.hospitals : [];
        setHospitals(nextHospitals);
        setCurrentPage((page) => {
          const nextTotalPages = Math.max(1, Math.ceil(nextHospitals.length / itemsPerPage));
          return Math.min(Math.max(page, 1), nextTotalPages);
        });
      } catch (error) {
        if (requestSeq !== requestSeqRef.current) return;
        console.error('Error searching hospitals:', error);
        setHospitals([]);
      } finally {
        if (requestSeq !== requestSeqRef.current) return;
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, filters, sortBy, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(hospitals.length / itemsPerPage));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const indexOfLastItem = safePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentHospitals = hospitals.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    if (currentPage !== safePage) {
      setCurrentPage(safePage);
    }
  }, [currentPage, safePage]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(Math.min(Math.max(pageNumber, 1), totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <div className="mt-[74px] flex-grow bg-white">
        <div className="flex h-full w-full flex-col gap-6 lg:flex-row">
          <div className="lg:w-[340px] lg:self-stretch">
            <HospitalFilter
              filters={filters}
              handleRadioChange={handleRadioChange}
              handleCheckboxChange={handleCheckboxChange}
              clearFilters={clearFilters}
              hospitalTypes={hospitalTypes}
              departments={departments}
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
            />
          </div>

          <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
            <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Hospitals</h1>
                <p className="mt-2 text-sm text-slate-600">
                  Browse the available hospitals and open a profile to see more details.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search hospitals..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 border border-slate-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border border-slate-300 rounded px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                  <option value="year_new">Newest Hospital</option>
                  <option value="year_old">Oldest Hospital</option>
                </select>
              </div>
            </div>

            <div className="min-h-[600px] flex flex-col justify-between">
              <div>
                {loading ? (
                  <p className="text-sm text-slate-500">Loading hospitals...</p>
                ) : currentHospitals.length > 0 ? (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {currentHospitals.map((hospital) => (
                      <article 
                        key={hospital.hospital_id} 
                        onClick={() => navigate(`/hospitals/${hospital.hospital_id}`)}
                        className="group relative flex h-full cursor-pointer flex-col overflow-hidden bg-white rounded-3xl border border-slate-200"
                      >
                        <div className="relative h-44 w-full overflow-hidden bg-slate-50">
                          {hospital.hospital_image ? (
                            <img
                              src={hospital.hospital_image}
                              alt={hospital.hospital_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-700">
                              <Building className="h-12 w-12 stroke-[1.5]" />
                            </div>
                          )}
                        </div>

                        <div className="flex min-h-[220px] flex-col p-5">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{hospital.hospital_type || 'Private Hospital'}</p>
                          <h3 className="mt-1.5 line-clamp-2 text-lg font-bold leading-tight text-slate-900">{hospital.hospital_name}</h3>

                          <p className="mt-3 flex items-start gap-1.5 text-sm font-medium text-slate-500">
                            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="line-clamp-2">{hospital.hospital_address || "Location unavailable"}</span>
                          </p>

                          <p className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-slate-600">
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                            <span>
                              <span className="font-semibold text-slate-800">
                                {Number(hospital.avg_rating || 0).toFixed(1)}
                              </span>{' '}
                              <span className="text-slate-500">
                                ({hospital.review_count || 0} {hospital.review_count === 1 ? 'review' : 'reviews'})
                              </span>
                            </span>
                          </p>

                          <div className="mt-3.5 flex flex-wrap gap-1.5">
                            {(Array.isArray(hospital.departments) ? hospital.departments : []).slice(0, 3).map((dep) => (
                              <span key={`${hospital.hospital_id}-${dep}`} className="rounded-lg bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 border border-slate-100">
                                {dep}
                              </span>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <h3 className="text-lg font-bold text-slate-900">No hospitals found</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      There are no hospitals matching your filters right now.
                    </p>
                    <button
                      onClick={clearFilters}
                      className="mt-6 rounded border border-emerald-700 bg-white px-6 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            {hospitals.length > itemsPerPage && !loading && (
              <Pagination
                className="mt-8"
                page={safePage}
                totalPages={totalPages}
                totalItems={hospitals.length}
                pageSize={itemsPerPage}
                itemLabel="hospitals"
                onPageChange={handlePageChange}
              />
            )}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Hospitals;

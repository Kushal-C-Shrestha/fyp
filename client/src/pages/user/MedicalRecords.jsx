import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import AddRecordModal from '../../components/user/AddRecordModal.jsx';
import api from '../../api/axios';

const getUploadErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

const extractFileName = (path = '') => {
  if (!path) return '';
  const fileName = path.split(/\//).pop();
  const sanitized = fileName.replace(/^\d+-/, "");
  return sanitized;
};

const normalizeRecord = (record) => ({
  id: record.record_id,
  title: record.record_title || record.record_name || 'Medical Record',
  fileName: extractFileName(record.record_file),
  createdAt: record.uploaded_at || record.created_at
    ? new Date(record.uploaded_at || record.created_at).toISOString().slice(0, 10)
    : '-',
});

const MedicalRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState({ id: null, title: '' });
  const [form, setForm] = useState({ title: '', file: null });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date-desc');

  const fetchRecords = useCallback(async ({ showLoading = false } = {}) => {
    try {
      if (showLoading) setLoading(true);
      setError('');
      const { data } = await api.get('/records');
      const normalized = Array.isArray(data?.records)
        ? data.records.map(normalizeRecord)
        : [];
      setRecords(normalized);
    } catch (err) {
      setRecords([]);
      setError(err?.response?.data?.message || 'Failed to load medical records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const onFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'file') {
      setForm((prev) => ({ ...prev, file: files?.[0] || null }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setSelectedRecord({ id: null, title: '' });
    setForm({ title: '', file: null });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedRecord.id) {
      await handleEdit();
      return;
    }
    if (!form.title.trim() || !form.file) return;
    try {
      setIsSubmitting(true);
      setError('');
      const payload = new FormData();
      payload.append('title', form.title.trim());
      payload.append('medicalRecord', form.file);
      const { data } = await api.post('/records', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      if (!data?.record?.record_id) {
        throw new Error(data?.message || 'Failed to upload record.');
      }
      await fetchRecords();
      handleCloseModal();
    } catch (err) {
      setError(getUploadErrorMessage(err, 'Failed to upload record.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedRecord.id || !form.title.trim()) return;
    try {
      setIsSubmitting(true);
      setError('');
      const { data } = await api.put(`/records/${selectedRecord.id}`, { title: form.title.trim() });
      if (!data?.success) {
        throw new Error(data?.message || 'Failed to update record.');
      }
      await fetchRecords();
      handleCloseModal();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update record.');
    } finally {
      setIsSubmitting(false);
    }
  };


  const startRename = (record) => {
    setError('');
    setSelectedRecord({ id: record.id, title: record.title });
    setIsAddModalOpen(true);
  };


  const handleDelete = async (recordId) => {
    try {
      setError('');
      setDeletingId(recordId);
      await api.delete(`/records/${recordId}`);
      await fetchRecords();
      if (selectedRecord.id === recordId) {
        setSelectedRecord({ id: null, title: '' });
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete record.');
    } finally {
      setDeletingId(null);
    }
  };



  const filteredRecords = records
    .filter((r) => r.title?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'title-asc') return a.title.localeCompare(b.title);
      if (sort === 'title-desc') return b.title.localeCompare(a.title);
      if (sort === 'date-asc') return new Date(a.createdAt) - new Date(b.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return (
    <>
      <div className="space-y-6">
        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-56"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="date-desc">Date (Newest)</option>
              <option value="date-asc">Date (Oldest)</option>
              <option value="title-asc">Title (A–Z)</option>
              <option value="title-desc">Title (Z–A)</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 py-2 pl-3 pr-4 text-sm font-semibold text-white hover:bg-emerald-800 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add Record
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">File</th>
                  <th className="px-4 py-3 font-semibold">Added On</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      Loading records...
                    </td>
                  </tr>
                ) : filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {record.title}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block max-w-[240px] truncate" title={record.fileName}>
                          {record.fileName}
                        </span>
                      </td>
                      <td className="px-4 py-3">{record.createdAt}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startRename(record)}
                            title="Rename"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === record.id}
                            onClick={() => handleDelete(record.id)}
                            title="Delete"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                          >
                            {deletingId === record.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      {search ? 'No records match your search.' : 'No records found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddRecordModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        form={form}
        onChange={onFormChange}
        isSubmitting={isSubmitting}
        error={error}
        selectedRecord={selectedRecord}
      />
    </>
  );
};

export default MedicalRecords;

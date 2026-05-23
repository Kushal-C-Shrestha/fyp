import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import DataTable from "../../components/ui/DataTable";
import SearchFilterBar from "../../components/ui/SearchFilterBar";

const normalizeValue = (value) => String(value || "").trim().toLowerCase();

const COLUMNS = [
  { label: "User Details" },
  { label: "Role" },
  { label: "Contacts" },
  { label: "Status" },
  { label: "Joined" },
];

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterText, setFilterText] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get("/admin/users");
        setUsers(Array.isArray(data?.users) ? data.users : []);
      } catch (err) {
        setUsers([]);
        setError(err?.response?.data?.message || "Failed to load users.");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    let result = users;

    const query = normalizeValue(filterText);
    if (query) {
      result = result.filter((user) =>
        [
          user.full_name,
          user.email,
          user.phone,
          user.role_label,
          user.status,
          user.specialization_name,
          user.hospital_name,
        ]
          .map(normalizeValue)
          .join(" ")
          .includes(query)
      );
    }

    if (roleFilter) {
      result = result.filter((user) => {
        const valRole = normalizeValue(user.role);
        const valRoleLabel = normalizeValue(user.role_label);
        const target = normalizeValue(roleFilter);
        return valRole === target || valRoleLabel.includes(target);
      });
    }

    if (statusFilter) {
      result = result.filter((user) => normalizeValue(user.status) === normalizeValue(statusFilter));
    }

    return result;
  }, [filterText, roleFilter, statusFilter, users]);

  return (
    <>
      <div>
        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-slate-800">Platform Users</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchFilterBar
              value={filterText}
              onChange={setFilterText}
              placeholder="Search users..."
              maxWidth="sm:max-w-xs"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-100"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="doctor">Doctor</option>
              <option value="hospital">Hospital</option>
              <option value="user">Patient/User</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-100"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        <DataTable
          columns={COLUMNS}
          data={filteredUsers}
          getRowKey={(user) => user.user_id}
          loading={loading}
          loadingText="Loading platform users..."
          emptyText="No users match your current filters."
          pagination
          pageSize={10}
          resetPageKey={`${filterText}-${roleFilter}-${statusFilter}`}
          renderRow={(user) => (
            <tr key={user.user_id} className="group transition hover:bg-slate-50/50">
              <td className="px-6 py-4">
                <div>
                  <p className="font-bold text-slate-900">{user.full_name || "-"}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{user.email || "-"}</p>
                </div>
              </td>
              <td className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider text-slate-500">
                {user.role_label || "-"}
              </td>
              <td className="px-6 py-4">
                <p className="text-xs font-semibold text-slate-600">
                  {user.phone || "No phone"}
                </p>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  user.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                  'bg-slate-50 text-slate-600 border border-slate-100'
                }`}>
                  {user.status || "Unknown"}
                </span>
              </td>
              <td className="px-6 py-4 font-medium text-slate-400 text-xs">
                {user.created_at ? new Date(user.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : "-"}
              </td>
            </tr>
          )}
        />
      </div>
    </>
  );
};

export default AdminUsers;

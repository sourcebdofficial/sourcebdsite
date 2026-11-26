import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

export default function AdminDashboard() {
  const { user, logout, logoData, setLogoData, brandLogoSrc } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");

  const [coAdminForm, setCoAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    permissions: ["view_users"],
  });
  const [creatingCoAdmin, setCreatingCoAdmin] = useState(false);
  const [editingCoAdmin, setEditingCoAdmin] = useState(null);
  const [editedPermissions, setEditedPermissions] = useState([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [logoSaving, setLogoSaving] = useState(false);

  const [verificationQueue, setVerificationQueue] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [categories, setCategories] = useState([]);

  // Inline states replacing window.prompt/confirm
  const [rejectingSupplierId, setRejectingSupplierId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [inspectingSupplier, setInspectingSupplier] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await apiRequest("/auth/admin/dashboard");
      setDashboard(data);
    } catch (error) {
      setMessage(error.message || "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const data = await apiRequest("/auth/admin/users");
      setUsers(Array.isArray(data) ? data : data.users || data.data || []);
    } catch (error) {
      setMessage(error.message || "Could not load users.");
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchSourcingQueues = async () => {
    try {
      const [verRes, revRes, catRes] = await Promise.all([
        apiRequest("/sourcing/admin/verification"),
        apiRequest("/sourcing/admin/reviews"),
        apiRequest("/sourcing/categories"),
      ]);
      setVerificationQueue(verRes.suppliers || []);
      setReviewQueue(revRes.reviews || []);
      setCategories(catRes.categories || []);
    } catch (error) {
      setMessage(error.message);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchUsers();
    fetchSourcingQueues();
  }, []);

  const reviewSupplier = async (supplier, decision, note = "") => {
    try {
      await apiRequest(`/sourcing/admin/verification/${supplier._id}`, {
        method: "PATCH",
        body: JSON.stringify({ decision, note }),
      });
      setRejectingSupplierId(null);
      setRejectNote("");
      setInspectingSupplier(null);
      setPreviewDoc(null);
      setMessage(`Supplier ${decision}.`);
      fetchSourcingQueues();
      fetchUsers();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const moderateReview = async (review, status) => {
    try {
      await apiRequest(`/sourcing/admin/reviews/${review._id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage(`Review ${status}.`);
      fetchSourcingQueues();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await apiRequest("/sourcing/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      setNewCategoryName("");
      setMessage("Category added.");
      fetchSourcingQueues();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const archiveCategory = async (category) => {
    if (category.isDefault) {
      setMessage("Built-in categories cannot be archived.");
      return;
    }
    try {
      await apiRequest(`/sourcing/admin/categories/${category._id}`, { method: "DELETE" });
      setMessage("Category archived.");
      fetchSourcingQueues();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const createCoAdmin = async (e) => {
    e.preventDefault();
    setCreatingCoAdmin(true);
    setMessage("");
    try {
      const data = await apiRequest("/auth/admin/co-admins", {
        method: "POST",
        body: JSON.stringify(coAdminForm),
      });
      const createdEmail = data.coAdmin?.email || coAdminForm.email;
      setCoAdminForm({ name: "", email: "", password: "", permissions: ["view_users"] });
      fetchUsers();
      setMessage(`Co-Admin account created for ${createdEmail}.`);
    } catch (error) {
      setMessage(error.message || "Could not create Co-Admin.");
    } finally {
      setCreatingCoAdmin(false);
    }
  };

  const toggleCoAdminPermission = (permission) => {
    setCoAdminForm((curr) => ({
      ...curr,
      permissions: curr.permissions.includes(permission)
        ? curr.permissions.filter((item) => item !== permission)
        : [...curr.permissions, permission],
    }));
  };

  const openPermissionEditor = (coAdmin) => {
    setEditingCoAdmin(coAdmin);
    setEditedPermissions(coAdmin.permissions || []);
    setMessage("");
  };

  const toggleEditedPermission = (permission) => {
    setEditedPermissions((curr) =>
      curr.includes(permission) ? curr.filter((i) => i !== permission) : [...curr, permission]
    );
  };

  const saveCoAdminPermissions = async () => {
    if (!editingCoAdmin?._id) return;
    setSavingPermissions(true);
    setMessage("");
    try {
      const data = await apiRequest(`/auth/admin/co-admins/${editingCoAdmin._id}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ permissions: editedPermissions }),
      });
      setUsers((curr) =>
        curr.map((item) =>
          item._id === editingCoAdmin._id
            ? { ...item, permissions: data.coAdmin?.permissions || editedPermissions }
            : item
        )
      );
      setEditingCoAdmin(null);
      setMessage(`Permissions updated for ${editingCoAdmin.name || editingCoAdmin.email}.`);
    } catch (error) {
      setMessage(error.message || "Could not update Co-Admin permissions.");
    } finally {
      setSavingPermissions(false);
    }
  };

  const uploadSiteLogo = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setMessage("Choose a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setMessage("Logo image must be smaller than 1.5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setMessage("Could not read this image file.");
    reader.onload = async () => {
      setLogoSaving(true);
      setMessage("");
      try {
        const data = await apiRequest("/settings/logo", {
          method: "PUT",
          body: JSON.stringify({ logoData: reader.result }),
        });
        setLogoData(data.logoData || "");
        setMessage("Site logo updated successfully.");
      } catch (error) {
        setMessage(error.message || "Could not update the site logo.");
      } finally {
        setLogoSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const restoreDefaultLogo = async () => {
    setLogoSaving(true);
    setMessage("");
    try {
      await apiRequest("/settings/logo", { method: "DELETE" });
      setLogoData("");
      setMessage("Official SourceBD logo restored.");
    } catch (error) {
      setMessage(error.message || "Could not restore the default logo.");
    } finally {
      setLogoSaving(false);
    }
  };

  const handleDeleteUser = async (selectedUser) => {
    if (!selectedUser?._id || selectedUser._id === user?._id) return;
    try {
      setMessage("");
      await apiRequest(`/auth/admin/users/${selectedUser._id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((item) => item._id !== selectedUser._id));
      setConfirmDeleteUserId(null);
      setMessage("User deleted successfully.");
      fetchDashboard();
    } catch (error) {
      setMessage(error.message || "Could not delete user.");
    }
  };

  const filteredUsers = users.filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.name || "").toLowerCase().includes(q) ||
      (item.email || "").toLowerCase().includes(q) ||
      (item.phone || "").toLowerCase().includes(q) ||
      (item.role || "").toLowerCase().includes(q)
    );
  });

  const roleFilters = [
    { id: "all", label: "All users" },
    { id: "buyer", label: "Buyers" },
    { id: "supplier", label: "Suppliers" },
    ...(user?.role === "admin"
      ? [
          { id: "admin", label: "Admins" },
          { id: "co-admin", label: "Co-Admins" },
        ]
      : []),
  ];
  const roleFilteredUsers = filteredUsers.filter(
    (item) => userRoleFilter === "all" || item.role === userRoleFilter
  );

  const totalUsers = dashboard?.totalUsers ?? dashboard?.stats?.totalUsers ?? users.length;
  const totalBuyers =
    dashboard?.totalBuyers ?? dashboard?.stats?.totalBuyers ?? users.filter((i) => i.role === "buyer").length;
  const totalSuppliers =
    dashboard?.totalSuppliers ?? dashboard?.stats?.totalSuppliers ?? users.filter((i) => i.role === "supplier").length;
  const totalAdmins =
    dashboard?.totalAdmins ??
    dashboard?.stats?.totalAdmins ??
    users.filter((i) => i.role === "admin" || i.role === "co-admin").length;

  const pageTitles = {
    overview: "Admin Overview",
    users: "Users Management",
    "create-co-admin": "Create Co-Admin",
    "site-logo": "Site Logo",
    profile: "My Account",
    verification: "Supplier Verification",
    reviews: "Review Moderation",
    categories: "Category Management",
  };

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src={brandLogoSrc} alt="SourceBD" referrerPolicy="no-referrer" className="h-8 w-auto object-contain" />
          <div>
            <h2>Control Center</h2>
            <p>{user?.role === "admin" ? "Super Admin" : "Co-Admin"}</p>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin dashboard">
          <button type="button" className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>
            Overview
          </button>
          <button
            type="button"
            className={activeTab === "verification" ? "active" : ""}
            onClick={() => {
              setActiveTab("verification");
              fetchSourcingQueues();
            }}
          >
            Supplier Verification ({verificationQueue.length})
          </button>
          <button
            type="button"
            className={activeTab === "reviews" ? "active" : ""}
            onClick={() => {
              setActiveTab("reviews");
              fetchSourcingQueues();
            }}
          >
            Review Moderation ({reviewQueue.length})
          </button>
          <button
            type="button"
            className={activeTab === "categories" ? "active" : ""}
            onClick={() => {
              setActiveTab("categories");
              fetchSourcingQueues();
            }}
          >
            Categories
          </button>
          <button type="button" className={activeTab === "users" ? "active" : ""} onClick={() => setActiveTab("users")}>
            Users Management
          </button>
          {user?.role === "admin" && (
            <button type="button" className={activeTab === "create-co-admin" ? "active" : ""} onClick={() => setActiveTab("create-co-admin")}>
              Create Co-Admin
            </button>
          )}
          {user?.role === "admin" && (
            <button type="button" className={activeTab === "site-logo" ? "active" : ""} onClick={() => setActiveTab("site-logo")}>
              Change Site Logo
            </button>
          )}
          <button type="button" className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>
            My Account
          </button>
        </nav>

        <button type="button" className="dashboard-logout w-full mt-2" onClick={logout}>
          Log out
        </button>
      </aside>

      <div className="admin-main">
        <header className="dashboard-header mb-6">
          <div>
            <h1>{pageTitles[activeTab] || "Admin Panel"}</h1>
            <p>Signed in as {user?.name || user?.email || "Admin"}</p>
          </div>
          <span className="text-xs font-semibold text-[#0b2149]">
            Role: {user?.role === "admin" ? "Super Admin" : "Co-Admin"}
          </span>
        </header>

        {message && (
          <div className="dashboard-message" role="status">
            {message}
          </div>
        )}

        {activeTab === "overview" && (
          <section className="flex flex-col gap-5">
            {loading ? (
              <p>Loading dashboard...</p>
            ) : (
              <div className="dashboard-stats admin-stats">
                <div className="admin-stat-card">
                  <span>Total Users</span>
                  <strong>{totalUsers}</strong>
                  <small>Registered accounts</small>
                </div>
                <div className="admin-stat-card">
                  <span>Buyers</span>
                  <strong>{totalBuyers}</strong>
                  <small>Sourcing businesses</small>
                </div>
                <div className="admin-stat-card">
                  <span>Suppliers</span>
                  <strong>{totalSuppliers}</strong>
                  <small>Wholesale vendors</small>
                </div>
                <div className="admin-stat-card">
                  <span>Admins</span>
                  <strong>{totalAdmins}</strong>
                  <small>Platform operators</small>
                </div>
              </div>
            )}

            <div className="dashboard-panel flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3>Quick Actions</h3>
                <p>Manage registered accounts, verify suppliers, or moderate buyer reviews.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="dashboard-primary-button w-auto"
                  onClick={() => {
                    setActiveTab("users");
                    fetchUsers();
                  }}
                >
                  Manage Users
                </button>
                <button
                  type="button"
                  className="dashboard-secondary-button"
                  onClick={() => {
                    fetchDashboard();
                    fetchUsers();
                    fetchSourcingQueues();
                  }}
                >
                  Refresh Data
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === "users" && (
          <section className="dashboard-section mt-0">
            <div className="dashboard-section-heading">
              <h2>Users Directory</h2>
              <button type="button" className="dashboard-secondary-button" onClick={fetchUsers} disabled={usersLoading}>
                {usersLoading ? "Loading..." : "Refresh"}
              </button>
            </div>

            <div className="admin-role-filters" role="tablist" aria-label="Filter users by account type">
              {roleFilters.map((filter) => {
                const count = filter.id === "all" ? users.length : users.filter((i) => i.role === filter.id).length;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    role="tab"
                    aria-selected={userRoleFilter === filter.id}
                    className={userRoleFilter === filter.id ? "active" : ""}
                    onClick={() => setUserRoleFilter(filter.id)}
                  >
                    {filter.label} ({count})
                  </button>
                );
              })}
            </div>

            <input
              className="dashboard-search"
              type="search"
              placeholder="Search by name, email, phone, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {usersLoading ? (
              <p>Loading users...</p>
            ) : (
              <div className="dashboard-table-wrapper">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roleFilteredUsers.map((item) => (
                      <tr key={item._id}>
                        <td>{item.name || "—"}</td>
                        <td>{item.email || "—"}</td>
                        <td className="capitalize">{item.role || "—"}</td>
                        <td>{item.isActive === false ? "Inactive" : "Active"}</td>
                        <td>
                          {item._id === user?._id ? (
                            <span className="text-xs text-[#64748b]">Current account</span>
                          ) : user?.role !== "admin" ? (
                            <span className="text-xs text-[#64748b]">Super Admin only</span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              {item.role === "co-admin" && (
                                <button type="button" className="dashboard-secondary-button" onClick={() => openPermissionEditor(item)}>
                                  Edit permissions
                                </button>
                              )}
                              {confirmDeleteUserId === item._id ? (
                                <>
                                  <button type="button" className="dashboard-danger-button" onClick={() => handleDeleteUser(item)}>
                                    Confirm
                                  </button>
                                  <button type="button" className="dashboard-secondary-button" onClick={() => setConfirmDeleteUserId(null)}>
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button type="button" className="dashboard-danger-button" onClick={() => setConfirmDeleteUserId(item._id)}>
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {roleFilteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5}>No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {editingCoAdmin && (
              <div className="admin-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !savingPermissions) setEditingCoAdmin(null); }}>
                <section className="admin-permission-modal" role="dialog" aria-modal="true" aria-labelledby="permission-modal-title">
                  <div className="admin-modal-heading">
                    <div>
                      <h3 id="permission-modal-title">Edit Co-Admin Permissions</h3>
                      <p className="text-xs text-[#64748b] m-0">
                        {editingCoAdmin.name} · {editingCoAdmin.email}
                      </p>
                    </div>
                    <button type="button" aria-label="Close" disabled={savingPermissions} onClick={() => setEditingCoAdmin(null)} className="border-0 bg-transparent text-xl">
                      ×
                    </button>
                  </div>
                  <div className="admin-permission-options">
                    {[
                      ["view_users", "View users"],
                      ["manage_users", "Manage users"],
                      ["view_suppliers", "View suppliers"],
                      ["manage_suppliers", "Manage suppliers"],
                      ["view_listings", "View listings"],
                      ["manage_listings", "Manage listings"],
                      ["view_orders", "View orders"],
                      ["manage_orders", "Manage orders"],
                      ["view_reports", "View reports"],
                    ].map(([permission, label]) => (
                      <label key={permission}>
                        <input
                          type="checkbox"
                          checked={editedPermissions.includes(permission)}
                          onChange={() => toggleEditedPermission(permission)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="admin-modal-actions">
                    <button type="button" className="dashboard-secondary-button" disabled={savingPermissions} onClick={() => setEditingCoAdmin(null)}>
                      Cancel
                    </button>
                    <button type="button" className="dashboard-primary-button w-auto" disabled={savingPermissions} onClick={saveCoAdminPermissions}>
                      {savingPermissions ? "Saving..." : "Save permissions"}
                    </button>
                  </div>
                </section>
              </div>
            )}
          </section>
        )}

        {activeTab === "create-co-admin" && user?.role === "admin" && (
          <form className="admin-create-form" onSubmit={createCoAdmin}>
            <div className="admin-create-fields">
              <label>
                Full name
                <input
                  required
                  minLength={2}
                  value={coAdminForm.name}
                  onChange={(e) => setCoAdminForm({ ...coAdminForm, name: e.target.value })}
                  placeholder="Co-Admin name"
                />
              </label>
              <label>
                Email address
                <input
                  required
                  type="email"
                  value={coAdminForm.email}
                  onChange={(e) => setCoAdminForm({ ...coAdminForm, email: e.target.value })}
                  placeholder="name@example.com"
                />
              </label>
              <label>
                Password
                <input
                  required
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={coAdminForm.password}
                  onChange={(e) => setCoAdminForm({ ...coAdminForm, password: e.target.value })}
                  placeholder="At least 8 characters"
                />
              </label>
            </div>

            <fieldset className="admin-permissions-fieldset">
              <legend className="text-sm font-semibold text-[#0b2149]">Permissions</legend>
              <div className="admin-permission-options">
                {[
                  ["view_users", "View users"],
                  ["manage_users", "Manage users"],
                  ["view_suppliers", "View suppliers"],
                  ["manage_suppliers", "Manage suppliers"],
                  ["view_listings", "View listings"],
                  ["manage_listings", "Manage listings"],
                  ["view_orders", "View orders"],
                  ["manage_orders", "Manage orders"],
                  ["view_reports", "View reports"],
                ].map(([permission, label]) => (
                  <label key={permission}>
                    <input
                      type="checkbox"
                      checked={coAdminForm.permissions.includes(permission)}
                      onChange={() => toggleCoAdminPermission(permission)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <button className="dashboard-primary-button w-auto mt-5" type="submit" disabled={creatingCoAdmin}>
              {creatingCoAdmin ? "Creating account..." : "Create Co-Admin"}
            </button>
          </form>
        )}

        {activeTab === "site-logo" && user?.role === "admin" && (
          <div className="admin-logo-settings">
            <div className="admin-logo-preview" aria-label="Current site logo preview">
              <img src={brandLogoSrc} alt="Current SourceBD logo" referrerPolicy="no-referrer" />
            </div>
            <div className="flex flex-col gap-3">
              <label className="admin-logo-upload w-fit">
                {logoSaving ? "Saving logo..." : "Upload custom logo"}
                <input type="file" accept="image/png,image/jpeg,image/webp" disabled={logoSaving} onChange={uploadSiteLogo} />
              </label>
              <p className="text-xs text-[#64748b] m-0">
                PNG, JPG, or WebP · Maximum 1.5 MB. Appears across the navbar and dashboards.
              </p>
              {logoData && (
                <button type="button" className="dashboard-secondary-button w-fit" disabled={logoSaving} onClick={restoreDefaultLogo}>
                  Restore official SourceBD logo
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="dashboard-profile">
            <p><strong>Name:</strong> {user?.name || "—"}</p>
            <p><strong>Email:</strong> {user?.email || "—"}</p>
            <p><strong>Role:</strong> {user?.role || "—"}</p>
          </div>
        )}

        {activeTab === "verification" && (
          <section className="dashboard-section mt-0">
            <h2>Pending Supplier Verification</h2>
            {verificationQueue.length === 0 ? (
              <p className="dashboard-empty">No supplier requests pending.</p>
            ) : (
              verificationQueue.map((supplier) => {
                const docCount = Object.values(supplier.verificationDocuments || {}).filter((d) => d?.dataUrl).length;
                return (
                  <article className="dashboard-panel" key={supplier._id}>
                    <h3>{supplier.businessName} · {supplier.name}</h3>
                    <p>
                      {supplier.businessType}
                      {supplier.ownershipType ? ` (${supplier.ownershipType})` : ""} · {supplier.address}, {supplier.city}
                    </p>
                    <p>{supplier.businessDescription}</p>
                    <p>
                      <strong>Contact:</strong> {supplier.email} · {supplier.phone || "No phone"}
                    </p>
                    <p>
                      <strong>Trade License:</strong> {supplier.tradeLicenseNumber || "—"} ·{" "}
                      <strong>e-TIN:</strong> {supplier.tinNumber || "—"} ·{" "}
                      <strong>BIN:</strong> {supplier.binNumber || "—"} ·{" "}
                      <strong>Documents:</strong> {docCount} attached
                    </p>

                    {rejectingSupplierId === supplier._id ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          placeholder="Reason for rejection (shown to supplier)..."
                          className="px-3 py-1.5 border border-[#cbd5e1] rounded-lg text-sm flex-1 min-w-[200px]"
                        />
                        <button type="button" className="dashboard-danger-button" onClick={() => reviewSupplier(supplier, "rejected", rejectNote)}>
                          Confirm Reject
                        </button>
                        <button type="button" className="dashboard-secondary-button" onClick={() => setRejectingSupplierId(null)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          type="button"
                          className="dashboard-secondary-button"
                          onClick={() => {
                            setInspectingSupplier(supplier);
                            setPreviewDoc(null);
                          }}
                        >
                          Review Full Application
                        </button>
                        <button type="button" className="dashboard-primary-button w-auto" onClick={() => reviewSupplier(supplier, "verified")}>
                          Verify Supplier
                        </button>
                        <button
                          type="button"
                          className="dashboard-danger-button"
                          onClick={() => {
                            setRejectingSupplierId(supplier._id);
                            setRejectNote("");
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>
        )}

        {activeTab === "reviews" && (
          <section className="dashboard-section mt-0">
            <h2>Pending Reviews</h2>
            {reviewQueue.length === 0 ? (
              <p className="dashboard-empty">No reviews waiting for moderation.</p>
            ) : (
              reviewQueue.map((review) => (
                <article className="dashboard-panel" key={review._id}>
                  <h3>{review.product?.name || "Product"} · {review.rating}/5</h3>
                  <p>
                    <strong>Buyer:</strong> {review.buyer?.name || review.buyer?.email || "—"} ·{" "}
                    <strong>Supplier:</strong> {review.supplier?.name || "—"}
                  </p>
                  <p>{review.comment || "No written comment."}</p>
                  <div className="flex gap-2 mt-3">
                    <button type="button" className="dashboard-primary-button w-auto" onClick={() => moderateReview(review, "approved")}>
                      Approve
                    </button>
                    <button type="button" className="dashboard-danger-button" onClick={() => moderateReview(review, "rejected")}>
                      Reject
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        )}

        {activeTab === "categories" && (
          <section className="dashboard-section mt-0">
            <div className="dashboard-section-heading">
              <h2>Product Categories</h2>
              <form onSubmit={addCategory} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name..."
                  required
                />
                <button type="submit" className="dashboard-primary-button w-auto">
                  Add Category
                </button>
              </form>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((category) => (
                <div className="dashboard-panel flex items-center justify-between gap-2 m-0" key={category._id || category.name}>
                  <div>
                    <strong className="text-[#0b2149]">{category.name}</strong>
                    <div className="text-xs text-[#64748b]">
                      {category.productCount || 0} listings{category.isDefault ? " · Built-in" : ""}
                    </div>
                  </div>
                  {!category.isDefault && (
                    <button type="button" className="dashboard-danger-button" onClick={() => archiveCategory(category)}>
                      Archive
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {inspectingSupplier && (
          <div
            className="admin-modal-backdrop"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setInspectingSupplier(null);
                setPreviewDoc(null);
              }
            }}
          >
            <section
              className="admin-permission-modal admin-kyc-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-kyc-modal-title"
            >
              <div className="admin-modal-heading">
                <div>
                  <h3 id="admin-kyc-modal-title">
                    Supplier KYC Application · {inspectingSupplier.businessName || inspectingSupplier.name}
                  </h3>
                  <p className="text-xs text-[#64748b] m-0">
                    Submitted by {inspectingSupplier.name} ({inspectingSupplier.email})
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => {
                    setInspectingSupplier(null);
                    setPreviewDoc(null);
                  }}
                  className="border-0 bg-transparent text-xl"
                >
                  ×
                </button>
              </div>

              <div className="flex flex-col gap-4 text-sm">
                <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569] m-0 mb-2.5">
                    Business &amp; Contact Information
                  </h4>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 m-0">
                    <div>
                      <dt className="text-xs text-[#64748b]">Business Name</dt>
                      <dd className="m-0 mt-0.5 font-semibold text-[#0b2149]">
                        {inspectingSupplier.businessName || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#64748b]">Business Type &amp; Ownership</dt>
                      <dd className="m-0 mt-0.5 text-[#0f172a]">
                        {inspectingSupplier.businessType || "—"}
                        {inspectingSupplier.ownershipType ? ` · ${inspectingSupplier.ownershipType}` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#64748b]">Contact Person</dt>
                      <dd className="m-0 mt-0.5 text-[#0f172a]">
                        {inspectingSupplier.contactPersonName || inspectingSupplier.name || "—"}
                        {inspectingSupplier.contactPersonRole ? ` (${inspectingSupplier.contactPersonRole})` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#64748b]">Phone &amp; Email</dt>
                      <dd className="m-0 mt-0.5 text-[#0f172a] break-all">
                        {inspectingSupplier.phone || "No phone"} · {inspectingSupplier.email}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#64748b]">Address &amp; City</dt>
                      <dd className="m-0 mt-0.5 text-[#0f172a]">
                        {inspectingSupplier.address || "—"}, {inspectingSupplier.city || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#64748b]">Established &amp; Monthly Capacity</dt>
                      <dd className="m-0 mt-0.5 text-[#0f172a]">
                        {inspectingSupplier.yearEstablished || "—"} · {inspectingSupplier.monthlyCapacity || "Not specified"}
                      </dd>
                    </div>
                    {inspectingSupplier.websiteUrl && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-[#64748b]">Website</dt>
                        <dd className="m-0 mt-0.5 text-[#0b2149] break-all">{inspectingSupplier.websiteUrl}</dd>
                      </div>
                    )}
                    <div className="sm:col-span-2 pt-2 border-t border-[#e2e8f0]">
                      <dt className="text-xs text-[#64748b]">Business Description</dt>
                      <dd className="m-0 mt-1 text-[#334155] leading-relaxed">
                        {inspectingSupplier.businessDescription || "No description provided."}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#e2e8f0]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569] m-0 mb-2.5">
                    Bangladesh Regulatory, Tax &amp; Bank Details
                  </h4>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 m-0">
                    <div>
                      <dt className="text-xs text-[#64748b]">Trade License Number</dt>
                      <dd className="m-0 mt-0.5 font-mono-num font-semibold text-[#0b2149]">
                        {inspectingSupplier.tradeLicenseNumber || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#64748b]">Issuing Authority</dt>
                      <dd className="m-0 mt-0.5 text-[#0f172a]">
                        {inspectingSupplier.tradeLicenseAuthority || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#64748b]">12-Digit e-TIN</dt>
                      <dd className="m-0 mt-0.5 font-mono-num font-semibold text-[#0b2149]">
                        {inspectingSupplier.tinNumber || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#64748b]">BIN / VAT Registration</dt>
                      <dd className="m-0 mt-0.5 font-mono-num text-[#0f172a]">
                        {inspectingSupplier.binNumber || "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#64748b]">Proprietor / Authorized NID</dt>
                      <dd className="m-0 mt-0.5 font-mono-num text-[#0f172a]">
                        {inspectingSupplier.nidNumber || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#64748b]">Bank Reference</dt>
                      <dd className="m-0 mt-0.5 text-[#0f172a]">
                        {inspectingSupplier.bankName
                          ? `${inspectingSupplier.bankName}${inspectingSupplier.bankAccountNumber ? ` · A/C ${inspectingSupplier.bankAccountNumber}` : ""}`
                          : "Not provided"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569] m-0 mb-2.5">
                    Supporting Certificates &amp; Documents
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      ["tinCertificate", "e-TIN Certificate"],
                      ["tradeLicense", "Trade License Copy"],
                      ["binCertificate", "BIN / VAT Certificate"],
                    ].map(([key, label]) => {
                      const doc = inspectingSupplier.verificationDocuments?.[key];
                      const hasDoc = Boolean(doc?.dataUrl);
                      return (
                        <div key={key} className="p-3 rounded-lg border border-[#cbd5e1] bg-white flex flex-col justify-between gap-2">
                          <div>
                            <div className="text-xs font-semibold text-[#0b2149]">{label}</div>
                            <div className="text-xs text-[#64748b] truncate mt-0.5">
                              {hasDoc ? doc.fileName || "Uploaded file" : "Not uploaded"}
                            </div>
                          </div>
                          {hasDoc && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="dashboard-secondary-button py-1 px-2.5 text-xs"
                                onClick={() => setPreviewDoc({ ...doc, label })}
                              >
                                Preview
                              </button>
                              <a
                                href={doc.dataUrl}
                                download={doc.fileName || `${key}.pdf`}
                                className="dashboard-secondary-button py-1 px-2.5 text-xs no-underline"
                              >
                                Download
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {previewDoc?.dataUrl && (
                    <div className="mt-4 p-3 rounded-xl border border-[#cbd5e1] bg-white">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <strong className="text-xs text-[#0b2149]">
                          Preview: {previewDoc.label} ({previewDoc.fileName || "document"})
                        </strong>
                        <button
                          type="button"
                          className="dashboard-secondary-button py-1 px-2.5 text-xs"
                          onClick={() => setPreviewDoc(null)}
                        >
                          Hide Preview
                        </button>
                      </div>
                      {previewDoc.mimeType === "application/pdf" ||
                      previewDoc.dataUrl.startsWith("data:application/pdf") ? (
                        <iframe
                          src={previewDoc.dataUrl}
                          title={previewDoc.label}
                          className="w-full h-96 rounded-lg border border-[#e2e8f0] bg-white"
                        />
                      ) : (
                        <img
                          src={previewDoc.dataUrl}
                          alt={previewDoc.label}
                          className="max-h-96 w-auto mx-auto rounded-lg border border-[#e2e8f0]"
                        />
                      )}
                    </div>
                  )}
                </div>

                {rejectingSupplierId === inspectingSupplier._id && (
                  <div className="p-3 rounded-lg border border-[#fecaca] bg-[#fef2f2] flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Reason for rejection (shown to supplier)..."
                      className="px-3 py-1.5 border border-[#cbd5e1] rounded-lg text-sm flex-1 min-w-[220px] bg-white"
                    />
                    <button
                      type="button"
                      className="dashboard-danger-button"
                      onClick={() => reviewSupplier(inspectingSupplier, "rejected", rejectNote)}
                    >
                      Confirm Reject
                    </button>
                    <button
                      type="button"
                      className="dashboard-secondary-button"
                      onClick={() => setRejectingSupplierId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="dashboard-secondary-button"
                  onClick={() => {
                    setInspectingSupplier(null);
                    setPreviewDoc(null);
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="dashboard-danger-button"
                  onClick={() => {
                    setRejectingSupplierId(inspectingSupplier._id);
                    setRejectNote("");
                  }}
                >
                  Reject Application
                </button>
                <button
                  type="button"
                  className="dashboard-primary-button w-auto"
                  onClick={() => reviewSupplier(inspectingSupplier, "verified")}
                >
                  Verify Supplier
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

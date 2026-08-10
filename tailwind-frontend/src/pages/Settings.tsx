import { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import axios from "axios";

import { useAppSelector, useAppDispatch } from "../app/store"; // Correct custom hooks
import { updateUser } from "../features/auth/authSlice";

export default function Settings() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const token = localStorage.getItem("token") || useAppSelector((state) => state.auth.token);

  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    fullName: "",
    email: "",
    role: "",
    department: "",
    bio: "",
    bankName: "",
    accountNumber: "",
    routingNumber: "",
    accountHolderName: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id || user._id || "",
        fullName: user.name || "",
        email: user.email || "",
        role: user.role || "",
        department: user.department || "",
        bio: user.bio || "",
        bankName: user.bankDetails?.bankName || "",
        accountNumber: user.bankDetails?.accountNumber || "",
        routingNumber: user.bankDetails?.routingNumber || "",
        accountHolderName: user.bankDetails?.accountHolderName || "",
      });
    }
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert("You must be logged in to update your profile.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/me`,
        {
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          bio: formData.bio,
          bankDetails: {
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            routingNumber: formData.routingNumber,
            accountHolderName: formData.accountHolderName,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      alert("Settings updated successfully.");
      dispatch(updateUser(res.data.user));
      localStorage.setItem("user", JSON.stringify(res.data.user));
    } catch (error: any) {
      console.error("Error updating profile:", error);
      alert(
        error.response?.data?.message ||
        error.message ||
        "Failed to update profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (user) {
      setFormData({
        id: user.id || user._id || "",
        fullName: user.name || "",
        email: user.email || "",
        role: user.role || "",
        department: user.department || "",
        bio: user.bio || "",
        bankName: user.bankDetails?.bankName || "",
        accountNumber: user.bankDetails?.accountNumber || "",
        routingNumber: user.bankDetails?.routingNumber || "",
        accountHolderName: user.bankDetails?.accountHolderName || "",
      });
    }
  };

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "account", label: "Account" },
    { id: "notifications", label: "Notifications" },
    { id: "security", label: "Security & Privacy" },
    { id: "appearance", label: "Appearance" },
    { id: "teams", label: "Teams" },
  ];

  const isAdmin = user?.role === "admin";
  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 shrink-0">
          <div className="card">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <h3 className="font-medium">Settings</h3>
            </div>
            <nav className="p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm ${activeTab === tab.id
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Panel */}
        <div className="flex-1">
          {activeTab === "profile" && (
            <div className="card">
              <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                <h3 className="font-medium">Profile Information</h3>
              </div>
              <div className="p-5">
                {!user ? (
                  <p>Please log in to see your profile info.</p>
                ) : (
                  <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                      <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="input disabled:opacity-60"
                        required
                        disabled={!isAdmin}
                      />
                      {!isAdmin && (
                        <p className="text-xs text-gray-500">Only admins can change email address.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Role
                      </label>
                      <select
                        id="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="input disabled:opacity-60"
                        disabled={!isAdmin}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="chief_manager">Chief Manager</option>
                        <option value="developer">Developer</option>
                        <option value="designer">Designer</option>
                        <option value="tester">Tester</option>
                      </select>
                      {!isAdmin && (
                        <p className="text-xs text-gray-500">Only admins can change role.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Department
                      </label>
                      <select
                        id="department"
                        value={formData.department}
                        onChange={handleChange}
                        className="input disabled:opacity-60"
                        disabled={!isAdmin}
                      >
                        <option value="management">Management</option>
                        <option value="engineering">Engineering</option>
                        <option value="marketing">Marketing</option>
                        <option value="sales">Sales</option>
                        <option value="finance">Finance</option>
                        <option value="support">Support</option>
                        <option value="design">Design</option>
                        <option value="hr">HR</option>
                      </select>
                      {!isAdmin && (
                        <p className="text-xs text-gray-500">Only admins can change department.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Bio
                      </label>
                      <textarea
                        id="bio"
                        rows={4}
                        value={formData.bio}
                        onChange={handleChange}
                        className="input resize-none"
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="btn btn-outline gap-1.5"
                      >
                        <X size={16} />
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary gap-1.5"
                      >
                        <Check size={16} />
                        {loading ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
          {activeTab === "account" && (
            <div className="card">
              <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                <h3 className="font-medium">Account & Bank Details</h3>
              </div>
              <div className="p-5">
                {!user ? (
                  <p>Please log in to see your account info.</p>
                ) : (
                  <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                      <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        id="bankName"
                        value={formData.bankName}
                        onChange={handleChange}
                        className="input"
                        placeholder="e.g. Chase Bank"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Account Number
                      </label>
                      <input
                        type="text"
                        id="accountNumber"
                        value={formData.accountNumber}
                        onChange={handleChange}
                        className="input"
                        placeholder="e.g. 1234567890"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="routingNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Routing Number / IFSC Code
                      </label>
                      <input
                        type="text"
                        id="routingNumber"
                        value={formData.routingNumber}
                        onChange={handleChange}
                        className="input"
                        placeholder="e.g. 987654321"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        id="accountHolderName"
                        value={formData.accountHolderName}
                        onChange={handleChange}
                        className="input"
                        placeholder="e.g. John Doe"
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="btn btn-outline gap-1.5"
                      >
                        <X size={16} />
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary gap-1.5"
                      >
                        <Check size={16} />
                        {loading ? "Saving..." : "Save Details"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { locationAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  MdLocationOn, MdAdd, MdDelete, MdEdit, MdSave, MdClose,
  MdMyLocation, MdRadar,
} from 'react-icons/md';

const DEPT_DEFAULT = { name: '', latitude: '', longitude: '', radius: '5' };

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [form,      setForm]      = useState(DEPT_DEFAULT);
  const [editId,    setEditId]    = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await locationAPI.getAll();
      setLocations(res.data.locations);
    } catch { toast.error('Failed to load locations'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLocations(); }, []);

  const handleGPS = () => {
    if (!navigator.geolocation)
      return toast.error('GPS not supported on this device');
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          latitude:  pos.coords.latitude.toFixed(7),
          longitude: pos.coords.longitude.toFixed(7),
        }));
        setGpsLoading(false);
        toast.success('Current GPS location captured');
      },
      () => { toast.error('GPS permission denied'); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.latitude || !form.longitude)
      return toast.error('Name, latitude and longitude are required');
    try {
      if (editId) {
        await locationAPI.update(editId, form);
        toast.success('Location updated');
      } else {
        await locationAPI.create(form);
        toast.success('Location created');
      }
      setForm(DEPT_DEFAULT);
      setEditId(null);
      setShowForm(false);
      fetchLocations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save location');
    }
  };

  const handleEdit = (loc) => {
    setForm({
      name:      loc.name,
      latitude:  String(loc.latitude),
      longitude: String(loc.longitude),
      radius:    String(loc.radius),
    });
    setEditId(loc._id);
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete location "${name}"?`)) return;
    try {
      await locationAPI.delete(id);
      toast.success('Location deleted');
      fetchLocations();
    } catch { toast.error('Delete failed'); }
  };

  const handleCancel = () => {
    setForm(DEPT_DEFAULT);
    setEditId(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Site Locations</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage GPS gate punch locations for construction sites
          </p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <MdAdd className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6 border border-primary-800/30 bg-primary-900/5">
          <h2 className="font-semibold text-slate-200 mb-4">
            {editId ? 'Edit Location' : 'New Location'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Site Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-field"
                  placeholder="e.g. Gate A — Building 1"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Latitude *</label>
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                  className="input-field"
                  placeholder="e.g. 12.9716"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Longitude *</label>
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                  className="input-field"
                  placeholder="e.g. 77.5946"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Radius (meters)
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={form.radius}
                  onChange={e => setForm(f => ({ ...f, radius: e.target.value }))}
                  className="input-field"
                  placeholder="5"
                />
                <p className="text-xs text-slate-600 mt-1">
                  Employee must be within this distance from the GPS point
                </p>
              </div>

              {/* GPS capture button */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleGPS}
                  disabled={gpsLoading}
                  className="btn-secondary flex items-center gap-2 text-sm w-full justify-center"
                >
                  {gpsLoading
                    ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    : <MdMyLocation className="w-4 h-4" />}
                  Use My Current GPS
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex items-center gap-2 text-sm">
                <MdSave className="w-4 h-4" />
                {editId ? 'Update Location' : 'Save Location'}
              </button>
              <button type="button" onClick={handleCancel} className="btn-secondary text-sm flex items-center gap-2">
                <MdClose className="w-4 h-4" /> Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Locations list */}
      {loading ? (
        <div className="card p-12 text-center text-slate-500">
          <div className="w-6 h-6 border-2 border-slate-600 border-t-primary-500 rounded-full animate-spin mx-auto mb-2" />
          Loading locations...
        </div>
      ) : locations.length === 0 ? (
        <div className="card p-12 text-center">
          <MdLocationOn className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No locations added yet</p>
          <p className="text-slate-600 text-sm mt-1">
            Add a site location to enable Gate Punch for employees
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {locations.map(loc => (
            <div key={loc._id} className="card p-5 hover:border-slate-700 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-900/40 rounded-xl flex items-center justify-center">
                    <MdLocationOn className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-100">{loc.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Added {new Date(loc.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(loc)}
                    className="p-1.5 text-slate-500 hover:text-primary-400 hover:bg-primary-900/20 rounded-lg transition-all"
                  >
                    <MdEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(loc._id, loc.name)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    <MdDelete className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-slate-600">Lat:</span>
                  <span className="font-mono">{loc.latitude}</span>
                  <span className="text-slate-600 ml-2">Lng:</span>
                  <span className="font-mono">{loc.longitude}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MdRadar className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-400 font-medium">{loc.radius}m radius</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
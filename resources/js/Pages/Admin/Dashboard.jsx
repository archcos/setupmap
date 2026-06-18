// resources/js/Pages/Admin/Dashboard.jsx
import { useState, useMemo } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { 
  LogOut, Plus, Edit2, X, MapPin, Search,
  Save, Loader, Wrench, ChevronDown, FolderKanban, AlertCircle, AlertTriangle
} from 'lucide-react';

const LOCATIONS = ['BUK', 'CAM', 'LDN', 'MOC', 'MOR'];

export default function AdminDashboard({ equipments = [], projects = [], adminUser, flash }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [editProjectSearch, setEditProjectSearch] = useState('');
  const [showEditProjectDropdown, setShowEditProjectDropdown] = useState(false);
  const [showEditLocationDropdown, setShowEditLocationDropdown] = useState(false);

  const addForm = useForm({
    project_id: '',
    equipment_name: '',
    owner: '',
    expected_location: '',
    equipment_specifications: '',
    latitude: '',
    longitude: '',
  });

  const editForm = useForm({
    project_id: '',
    equipment_name: '',
    owner: '',
    expected_location: '',
    equipment_specifications: '',
    latitude: '',
    longitude: '',
  });

  const filteredProjects = useMemo(() => {
    if (!projectSearch) return projects;
    return projects.filter(p => 
      p.project_title?.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.project_id?.toString().includes(projectSearch) ||
      p.proponent?.toLowerCase().includes(projectSearch.toLowerCase())
    );
  }, [projects, projectSearch]);

  const filteredEditProjects = useMemo(() => {
    if (!editProjectSearch) return projects;
    return projects.filter(p => 
      p.project_title?.toLowerCase().includes(editProjectSearch.toLowerCase()) ||
      p.project_id?.toString().includes(editProjectSearch) ||
      p.proponent?.toLowerCase().includes(editProjectSearch.toLowerCase())
    );
  }, [projects, editProjectSearch]);

  const getProjectTitle = (projectId) => {
    const project = projects.find(p => p.project_id === projectId);
    return project?.project_title || 'N/A';
  };

  const selectedProject = projects.find(p => p.project_id === addForm.data.project_id);
  const editSelectedProject = projects.find(p => p.project_id === editForm.data.project_id);

  const handleAdd = (e) => {
    e.preventDefault();
    
    if (!addForm.data.project_id) {
      alert('Please select a project');
      return;
    }
    if (!addForm.data.equipment_name.trim()) {
      alert('Please enter equipment name');
      return;
    }
    if (!addForm.data.owner.trim()) {
      alert('Please enter owner');
      return;
    }
    if (!addForm.data.expected_location) {
      alert('Please select expected location');
      return;
    }
    if (!addForm.data.latitude || !addForm.data.longitude) {
      alert('Please enter both latitude and longitude');
      return;
    }

    addForm.post('/admin/equipment', {
      onSuccess: () => {
        setShowAddModal(false);
        addForm.reset();
        setProjectSearch('');
        setShowProjectDropdown(false);
        setShowLocationDropdown(false);
      },
    });
  };

  const handleEdit = (e) => {
    e.preventDefault();
    
    if (!editForm.data.project_id) {
      alert('Please select a project');
      return;
    }
    if (!editForm.data.equipment_name.trim()) {
      alert('Please enter equipment name');
      return;
    }
    if (!editForm.data.owner.trim()) {
      alert('Please enter owner');
      return;
    }
    if (!editForm.data.expected_location) {
      alert('Please select expected location');
      return;
    }
    if (!editForm.data.latitude || !editForm.data.longitude) {
      alert('Please enter both latitude and longitude');
      return;
    }

    // Confirm if project is being changed
    if (editForm.data.project_id !== editingEquipment.project_id) {
      const confirmed = window.confirm(
        '⚠️ You are changing the project for this equipment.\n\n' +
        'This will:\n' +
        '• Generate a new Equipment ID\n' +
        '• Update all related records (locations, power data, utilizations)\n' +
        '• This may take a moment to complete\n' +
        '• This action cannot be undone\n\n' +
        'Do you want to continue?'
      );
      
      if (!confirmed) return;
    }

    editForm.put(`/admin/equipment/${editingEquipment.equipment_id}`, {
      onSuccess: () => {
        setShowEditModal(false);
        setEditingEquipment(null);
        editForm.reset();
        setEditProjectSearch('');
        setShowEditProjectDropdown(false);
        setShowEditLocationDropdown(false);
      },
    });
  };

  const openEditModal = (equipment) => {
    setEditingEquipment(equipment);
    editForm.setData({
      project_id: equipment.project_id || '',
      equipment_name: equipment.equipment_name || '',
      owner: equipment.owner || '',
      expected_location: equipment.expected_location || '',
      equipment_specifications: equipment.equipment_specifications || '',
      latitude: equipment.initial_location?.latitude || '',
      longitude: equipment.initial_location?.longitude || '',
    });
    setShowEditModal(true);
  };

  const handleLogout = () => {
    router.post('/admin/logout');
  };

  const filteredEquipments = equipments.filter(eq => 
    eq.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.equipment_id?.toString().includes(searchTerm) ||
    eq.owner?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.expected_location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const requiredField = () => (
    <span className="text-red-500 ml-1">*</span>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Head title="Admin Dashboard - SETUP P3 Portal" />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Wrench className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">
                  Welcome, {adminUser?.first_name} {adminUser?.last_name}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Flash Messages */}
        {flash?.success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            <div dangerouslySetInnerHTML={{ __html: flash.success }} />
          </div>
        )}
        {flash?.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {flash.error}
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search equipment by name, ID, owner, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus size={20} />
            Add Equipment
          </button>
        </div>

        {/* Equipment Table */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Owner</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Coordinates</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEquipments.length > 0 ? (
                  filteredEquipments.map((equipment) => (
                    <tr key={equipment.equipment_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-600">
                        {equipment.equipment_id}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate">
                        {equipment.equipment_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <FolderKanban size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[150px]">{getProjectTitle(equipment.project_id)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {equipment.owner || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {equipment.expected_location ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {equipment.expected_location}
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {equipment.initial_location ? (
                          <span className="font-mono text-xs">
                            {parseFloat(equipment.initial_location.latitude).toFixed(6)}, {parseFloat(equipment.initial_location.longitude).toFixed(6)}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditModal(equipment)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                      {searchTerm ? 'No equipment found matching your search' : 'No equipment added yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Total: <span className="font-semibold">{filteredEquipments.length}</span> equipment
            </p>
          </div>
        </div>
      </div>

      {/* Add Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">Add New Equipment</h2>
              <button onClick={() => {
                setShowAddModal(false);
                addForm.reset();
                setProjectSearch('');
                setShowProjectDropdown(false);
                setShowLocationDropdown(false);
              }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project {requiredField()}
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProjectDropdown(!showProjectDropdown);
                      setShowLocationDropdown(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-left"
                  >
                    {selectedProject ? (
                      <span className="text-sm">
                        <span className="font-medium">{selectedProject.project_title}</span>
                        <span className="text-gray-500 ml-2">({selectedProject.proponent || 'No proponent'})</span>
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Select a project...</span>
                    )}
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                  
                  {showProjectDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 sticky top-0 bg-white border-b">
                        <input
                          type="text"
                          placeholder="Search projects..."
                          value={projectSearch}
                          onChange={(e) => setProjectSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {filteredProjects.length > 0 ? (
                        filteredProjects.map((project) => (
                          <button
                            key={project.project_id}
                            type="button"
                            onClick={() => {
                              addForm.setData('project_id', project.project_id);
                              setShowProjectDropdown(false);
                              setProjectSearch('');
                            }}
                            className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <p className="text-sm font-medium text-gray-900">{project.project_title}</p>
                            <p className="text-xs text-gray-500">
                              ID: {project.project_id} {project.proponent && `| ${project.proponent}`}
                            </p>
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-sm text-gray-500 text-center">No projects found</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment Name {requiredField()}
                </label>
                <input
                  type="text"
                  value={addForm.data.equipment_name}
                  onChange={(e) => addForm.setData('equipment_name', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter equipment name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner {requiredField()}
                </label>
                <input
                  type="text"
                  value={addForm.data.owner}
                  onChange={(e) => addForm.setData('owner', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Equipment owner"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Location {requiredField()}
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLocationDropdown(!showLocationDropdown);
                      setShowProjectDropdown(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-left"
                  >
                    {addForm.data.expected_location ? (
                      <span className="text-sm font-medium">{addForm.data.expected_location}</span>
                    ) : (
                      <span className="text-sm text-gray-400">Select location...</span>
                    )}
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                  
                  {showLocationDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                      {LOCATIONS.map((location) => (
                        <button
                          key={location}
                          type="button"
                          onClick={() => {
                            addForm.setData('expected_location', location);
                            setShowLocationDropdown(false);
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors text-sm font-medium text-gray-700 border-b border-gray-50 last:border-0"
                        >
                          {location}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specifications <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <textarea
                  value={addForm.data.equipment_specifications}
                  onChange={(e) => addForm.setData('equipment_specifications', e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Equipment specifications (optional)..."
                />
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  <MapPin size={16} className="inline mr-1" />
                  Initial Location {requiredField()}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Latitude {requiredField()}</label>
                    <input
                      type="number"
                      step="any"
                      value={addForm.data.latitude}
                      onChange={(e) => addForm.setData('latitude', e.target.value)}
                      required
                      placeholder="14.5995"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Longitude {requiredField()}</label>
                    <input
                      type="number"
                      step="any"
                      value={addForm.data.longitude}
                      onChange={(e) => addForm.setData('longitude', e.target.value)}
                      required
                      placeholder="120.9842"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    addForm.reset();
                    setProjectSearch('');
                    setShowProjectDropdown(false);
                    setShowLocationDropdown(false);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addForm.processing}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2"
                >
                  {addForm.processing ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Equipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Equipment Modal */}
      {showEditModal && editingEquipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Edit Equipment</h2>
                <p className="text-sm text-gray-500">
                  Current ID: <span className="font-mono font-semibold">{editingEquipment.equipment_id}</span>
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEquipment(null);
                  editForm.reset();
                  setEditProjectSearch('');
                  setShowEditProjectDropdown(false);
                  setShowEditLocationDropdown(false);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              {/* Project Selection with Change Warning */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project {requiredField()}
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditProjectDropdown(!showEditProjectDropdown);
                      setShowEditLocationDropdown(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-left"
                  >
                    {editSelectedProject ? (
                      <span className="text-sm">
                        <span className="font-medium">{editSelectedProject.project_title}</span>
                        <span className="text-gray-500 ml-2">({editSelectedProject.proponent || 'No proponent'})</span>
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Select a project...</span>
                    )}
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                  
                  {showEditProjectDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 sticky top-0 bg-white border-b">
                        <input
                          type="text"
                          placeholder="Search projects..."
                          value={editProjectSearch}
                          onChange={(e) => setEditProjectSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {filteredEditProjects.length > 0 ? (
                        filteredEditProjects.map((project) => (
                          <button
                            key={project.project_id}
                            type="button"
                            onClick={() => {
                              editForm.setData('project_id', project.project_id);
                              setShowEditProjectDropdown(false);
                              setEditProjectSearch('');
                            }}
                            className={`w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ${
                              editForm.data.project_id === project.project_id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <p className="text-sm font-medium text-gray-900">{project.project_title}</p>
                            <p className="text-xs text-gray-500">
                              ID: {project.project_id} {project.proponent && `| ${project.proponent}`}
                            </p>
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-sm text-gray-500 text-center">No projects found</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Warning when project changed */}
                {editForm.data.project_id !== editingEquipment?.project_id && (
                  <div className="mt-3 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-800">Project Change Detected</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Changing the project will generate a new Equipment ID and update all related records. This may take a moment.
                        </p>
                        <div className="mt-2 p-2 bg-white rounded border border-yellow-200">
                          <p className="text-xs text-gray-700">
                            <strong>Current ID:</strong> <span className="font-mono">{editingEquipment.equipment_id}</span>
                          </p>
                          <p className="text-xs text-gray-700 mt-1">
                            <strong>New ID:</strong> <span className="font-mono">Will be auto-generated based on new project</span>
                          </p>
                        </div>
                        <p className="text-xs text-yellow-700 mt-2">
                          <strong>Updated records:</strong> recorded locations, power consumptions, utilizations
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment Name {requiredField()}
                </label>
                <input
                  type="text"
                  value={editForm.data.equipment_name}
                  onChange={(e) => editForm.setData('equipment_name', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner {requiredField()}
                </label>
                <input
                  type="text"
                  value={editForm.data.owner}
                  onChange={(e) => editForm.setData('owner', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Location {requiredField()}
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditLocationDropdown(!showEditLocationDropdown);
                      setShowEditProjectDropdown(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-left"
                  >
                    {editForm.data.expected_location ? (
                      <span className="text-sm font-medium">{editForm.data.expected_location}</span>
                    ) : (
                      <span className="text-sm text-gray-400">Select location...</span>
                    )}
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                  
                  {showEditLocationDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                      {LOCATIONS.map((location) => (
                        <button
                          key={location}
                          type="button"
                          onClick={() => {
                            editForm.setData('expected_location', location);
                            setShowEditLocationDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors text-sm font-medium border-b border-gray-50 last:border-0 ${
                            editForm.data.expected_location === location ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          {location}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specifications <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <textarea
                  value={editForm.data.equipment_specifications}
                  onChange={(e) => editForm.setData('equipment_specifications', e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Equipment specifications (optional)..."
                />
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  <MapPin size={16} className="inline mr-1" />
                  Initial Location {requiredField()}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Latitude {requiredField()}</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.data.latitude}
                      onChange={(e) => editForm.setData('latitude', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Longitude {requiredField()}</label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.data.longitude}
                      onChange={(e) => editForm.setData('longitude', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEquipment(null);
                    editForm.reset();
                    setEditProjectSearch('');
                    setShowEditProjectDropdown(false);
                    setShowEditLocationDropdown(false);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editForm.processing}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2"
                >
                  {editForm.processing ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Update Equipment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
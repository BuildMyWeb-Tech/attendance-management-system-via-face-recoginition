import { useState, useRef, useCallback, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { employeeAPI } from '../services/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import {
  MdQrCode, MdDownload, MdSearch, MdRefresh, MdPictureAsPdf,
  MdPerson, MdBadge, MdBusiness, MdCheckCircle,
} from 'react-icons/md';

const getInitials = (name) =>
  name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';

export default function QRGeneratorPage() {
  const [employees,       setEmployees]       = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [search,          setSearch]          = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [qrValue,         setQrValue]         = useState('');
  const qrRef = useRef(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeAPI.getAll();
      setEmployees(res.data.employees || []);
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const generateQR = (emp) => {
    const payload = JSON.stringify({
      employeeId:   emp.employeeId,
      employeeCode: emp.employeeId,
      employeeName: emp.name,
      department:   emp.department || 'General',
      createdAt:    emp.createdAt,
    });
    setSelectedEmployee(emp);
    setQrValue(payload);
  };

  const getQRCanvas = () => {
    if (!qrRef.current) return null;
    return qrRef.current.querySelector('canvas');
  };

  const downloadPNG = () => {
    const canvas = getQRCanvas();
    if (!canvas) return toast.error('QR not ready');
    const url = canvas.toDataURL('image/png');
    const a   = document.createElement('a');
    a.href     = url;
    a.download = 'qr_' + selectedEmployee.employeeId + '.png';
    a.click();
    toast.success('PNG downloaded');
  };

  const downloadPDF = () => {
    const canvas = getQRCanvas();
    if (!canvas) return toast.error('QR not ready');
    const imgData = canvas.toDataURL('image/png');
    const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    // Center QR on A4 page — QR image only, no text
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const qrSize = 100; // mm
    const x = (pageW - qrSize) / 2;
    const y = (pageH - qrSize) / 2;
    pdf.addImage(imgData, 'PNG', x, y, qrSize, qrSize);
    pdf.save('qr_' + selectedEmployee.employeeId + '.pdf');
    toast.success('PDF downloaded');
  };

  const filtered = employees.filter(e =>
    !search ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">QR Generator</h1>
        <p className="text-slate-400 text-sm mt-1">
          Generate and download QR codes for employee attendance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Left: Employee List ── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input-field pl-9 text-sm py-2.5"
                />
              </div>
              <button onClick={fetchEmployees} className="btn-secondary p-2.5">
                <MdRefresh className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
              </button>
            </div>

            {loading ? (
              <div className="py-10 text-center text-slate-500">
                <div className="w-6 h-6 border-2 border-slate-600 border-t-primary-500 rounded-full animate-spin mx-auto mb-2" />
                Loading employees...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-slate-500">No employees found</div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {filtered.map(emp => (
                  <div
                    key={emp._id}
                    className={
                      'flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ' +
                      (selectedEmployee?._id === emp._id
                        ? 'border-primary-600/50 bg-primary-900/20'
                        : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/50')
                    }
                    onClick={() => generateQR(emp)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary-900/40 flex items-center justify-center text-primary-300 font-bold text-sm flex-shrink-0">
                      {getInitials(emp.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-200 text-sm truncate">{emp.name}</p>
                      <p className="text-slate-500 text-xs font-mono">{emp.employeeId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 hidden sm:block">{emp.department || 'General'}</span>
                      {selectedEmployee?._id === emp._id && (
                        <MdCheckCircle className="w-4 h-4 text-primary-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: QR Preview ── */}
        <div className="lg:col-span-2">
          {!selectedEmployee ? (
            <div className="card p-8 text-center h-full flex flex-col items-center justify-center gap-4 border border-dashed border-slate-700">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center">
                <MdQrCode className="w-8 h-8 text-slate-600" />
              </div>
              <div>
                <p className="text-slate-400 font-medium">No QR Generated</p>
                <p className="text-slate-600 text-sm mt-1">Select an employee from the list</p>
              </div>
            </div>
          ) : (
            <div className="card p-6 space-y-5">
              <div className="text-center">
                <p className="font-semibold text-slate-200 text-lg">{selectedEmployee.name}</p>
                <p className="text-slate-500 text-sm font-mono mt-0.5">{selectedEmployee.employeeId}</p>
                <p className="text-slate-500 text-xs mt-0.5">{selectedEmployee.department || 'General'}</p>
              </div>

              {/* QR Code */}
              <div ref={qrRef} className="flex justify-center">
                <div className="p-4 bg-white rounded-2xl shadow-lg">
                  <QRCodeCanvas
                    value={qrValue}
                    size={200}
                    level="H"
                    includeMargin={false}
                    imageSettings={{
                      src: '/favicon.svg',
                      x:   undefined,
                      y:   undefined,
                      height: 28,
                      width:  28,
                      excavate: true,
                    }}
                  />
                </div>
              </div>

              {/* Employee info strip */}
              <div className="space-y-2 text-xs">
                {[
                  { icon: MdPerson,   label: 'Name',       value: selectedEmployee.name },
                  { icon: MdBadge,    label: 'ID',         value: selectedEmployee.employeeId },
                  { icon: MdBusiness, label: 'Department', value: selectedEmployee.department || 'General' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg">
                    <Icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="text-slate-500">{label}:</span>
                    <span className="text-slate-300 font-medium truncate">{value}</span>
                  </div>
                ))}
              </div>

              {/* Download buttons */}
              <div className="flex gap-3">
                <button onClick={downloadPNG} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm py-2.5">
                  <MdDownload className="w-4 h-4" /> PNG
                </button>
                <button onClick={downloadPDF} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2.5">
                  <MdPictureAsPdf className="w-4 h-4" /> PDF
                </button>
              </div>

              <button
                onClick={() => { setSelectedEmployee(null); setQrValue(''); }}
                className="w-full text-slate-500 hover:text-slate-300 text-xs text-center"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
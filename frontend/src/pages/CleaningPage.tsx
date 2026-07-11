import { useState } from 'react';
import { useStore } from '../store/useStore';
import SectionHeader from '../components/ui/SectionHeader';
import EmptyState from '../components/ui/EmptyState';
import { 
  handleMissingValues, 
  removeDuplicates, 
  dropColumns, 
  convertDtype, 
  handleOutliers, 
  normalizeData, 
  encodeColumn,
  exportCleaned,
  getDataset
} from '../services/api';
import toast from 'react-hot-toast';
import { Brush, Download, Trash2, Edit3, Settings2, ShieldAlert, AlignLeft } from 'lucide-react';
import DataTable from '../components/ui/DataTable';

export default function CleaningPage() {
  const { activeDataset, setActiveDataset } = useStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'missing' | 'duplicates' | 'columns' | 'dtypes' | 'outliers' | 'normalize' | 'encode'>('missing');
  const [selectedCol, setSelectedCol] = useState('');
  
  // Refresh dataset data after cleaning
  const refreshDataset = async () => {
    try {
      const data = await getDataset(activeDataset!.id);
      setActiveDataset(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!activeDataset) return <EmptyState />;

  const numericCols = activeDataset.dataset_info.column_types.numeric || [];
  const catCols = activeDataset.dataset_info.column_types.categorical || [];
  const allCols = [...numericCols, ...catCols, ...(activeDataset.dataset_info.column_types.datetime || []), ...(activeDataset.dataset_info.column_types.boolean || [])];

  const handleCleanAction = async (action: () => Promise<any>, successMsg: string) => {
    try {
      setLoading(true);
      await action();
      toast.success(successMsg);
      await refreshDataset();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    window.open(exportCleaned(activeDataset.id, 'csv'), '_blank');
  };

  const tabs = [
    { id: 'missing', label: 'Missing Values', icon: ShieldAlert },
    { id: 'duplicates', label: 'Duplicates', icon: Edit3 },
    { id: 'columns', label: 'Drop Columns', icon: Trash2 },
    { id: 'dtypes', label: 'Convert Types', icon: Settings2 },
    { id: 'outliers', label: 'Outliers', icon: AlertTriangle },
    { id: 'normalize', label: 'Normalize', icon: AlignLeft },
    { id: 'encode', label: 'Encoding', icon: AlignLeft },
  ];

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <SectionHeader 
          title="Data Cleaning" 
          subtitle="Preprocess, clean, and transform your dataset."
          icon={<Brush />}
        />
        <button className="btn-primary" onClick={handleExport}>
          <Download size={18} /> Export Cleaned Data
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Sidebar - Operations */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
            Operations
          </h3>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px',
                  background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                  color: isActive ? '#818cf8' : '#94a3b8',
                  border: `1px solid ${isActive ? 'rgba(99,102,241,0.2)' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', fontWeight: isActive ? 600 : 500
                }}
              >
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Content - Operation Form & Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#e2e8f0', marginBottom: '20px' }}>
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>

            {/* MISSING VALUES */}
            {activeTab === 'missing' && (
              <div>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                  <select className="input" style={{ flex: 1 }} id="missing_strategy">
                    <option value="drop_rows">Drop Rows with Missing Values</option>
                    <option value="drop_cols">Drop Columns with Missing Values</option>
                    <option value="fill_mean">Fill with Mean (Numeric only)</option>
                    <option value="fill_median">Fill with Median (Numeric only)</option>
                    <option value="fill_mode">Fill with Mode (Most frequent)</option>
                  </select>
                  <button 
                    className="btn-primary"
                    disabled={loading}
                    onClick={() => {
                      const strategy = (document.getElementById('missing_strategy') as HTMLSelectElement).value;
                      handleCleanAction(() => handleMissingValues(activeDataset.id, { strategy }), `Missing values handled using ${strategy}`);
                    }}
                  >
                    Apply Strategy
                  </button>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid #2d2f3e' }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>Columns with missing values:</p>
                  {Object.entries(activeDataset.dataset_info.missing_info).map(([col, info]: [string, any]) => (
                    <div key={col} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                      <span style={{ color: '#e2e8f0' }}>{col}</span>
                      <span style={{ color: '#f59e0b' }}>{info.count} ({info.percentage.toFixed(1)}%)</span>
                    </div>
                  ))}
                  {Object.keys(activeDataset.dataset_info.missing_info).length === 0 && (
                    <span style={{ color: '#10b981' }}>No missing values found!</span>
                  )}
                </div>
              </div>
            )}

            {/* DUPLICATES */}
            {activeTab === 'duplicates' && (
              <div>
                <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                  Your dataset has <strong>{activeDataset.dataset_info.duplicate_rows}</strong> duplicate rows.
                </p>
                <button 
                  className="btn-primary"
                  disabled={loading || activeDataset.dataset_info.duplicate_rows === 0}
                  onClick={() => handleCleanAction(() => removeDuplicates(activeDataset.id), 'Duplicate rows removed')}
                >
                  Remove All Duplicate Rows
                </button>
              </div>
            )}

            {/* DROP COLUMNS */}
            {activeTab === 'columns' && (
              <div>
                <select className="input" style={{ marginBottom: '16px' }} onChange={(e) => setSelectedCol(e.target.value)} value={selectedCol}>
                  <option value="">Select a column to drop...</option>
                  {allCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button 
                  className="btn-primary"
                  disabled={loading || !selectedCol}
                  onClick={() => handleCleanAction(() => dropColumns(activeDataset.id, [selectedCol]), `Dropped column ${selectedCol}`)}
                >
                  Drop Column
                </button>
              </div>
            )}

            {/* DTYPES */}
            {activeTab === 'dtypes' && (
              <div style={{ display: 'flex', gap: '16px' }}>
                <select className="input" style={{ flex: 1 }} onChange={(e) => setSelectedCol(e.target.value)} value={selectedCol}>
                  <option value="">Select a column...</option>
                  {allCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="input" style={{ flex: 1 }} id="target_dtype">
                  <option value="numeric">Numeric (float)</option>
                  <option value="integer">Integer</option>
                  <option value="string">String</option>
                  <option value="datetime">Datetime</option>
                  <option value="boolean">Boolean</option>
                </select>
                <button 
                  className="btn-primary"
                  disabled={loading || !selectedCol}
                  onClick={() => {
                    const dtype = (document.getElementById('target_dtype') as HTMLSelectElement).value;
                    handleCleanAction(() => convertDtype(activeDataset.id, selectedCol, dtype), `Converted ${selectedCol} to ${dtype}`);
                  }}
                >
                  Convert
                </button>
              </div>
            )}

            {/* OUTLIERS */}
            {activeTab === 'outliers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <select className="input" onChange={(e) => setSelectedCol(e.target.value)} value={selectedCol}>
                  <option value="">Select numeric column...</option>
                  {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <select className="input" style={{ flex: 1 }} id="outlier_method">
                    <option value="iqr">IQR Method</option>
                    <option value="zscore">Z-Score Method</option>
                  </select>
                  <select className="input" style={{ flex: 1 }} id="outlier_strategy">
                    <option value="remove">Remove Rows</option>
                    <option value="cap">Cap Values (Clip)</option>
                    <option value="replace_mean">Replace with Mean</option>
                  </select>
                </div>
                <button 
                  className="btn-primary" style={{ alignSelf: 'flex-start' }}
                  disabled={loading || !selectedCol}
                  onClick={() => {
                    const method = (document.getElementById('outlier_method') as HTMLSelectElement).value;
                    const strategy = (document.getElementById('outlier_strategy') as HTMLSelectElement).value;
                    handleCleanAction(() => handleOutliers(activeDataset.id, { column: selectedCol, method, strategy }), `Handled outliers in ${selectedCol}`);
                  }}
                >
                  Handle Outliers
                </button>
              </div>
            )}

            {/* NORMALIZE */}
            {activeTab === 'normalize' && (
              <div>
                <select className="input" style={{ marginBottom: '16px' }} id="norm_method">
                  <option value="minmax">Min-Max Scaling (0 to 1)</option>
                  <option value="zscore">Standard Scaling (Z-Score)</option>
                  <option value="robust">Robust Scaling</option>
                </select>
                <button 
                  className="btn-primary"
                  disabled={loading}
                  onClick={() => {
                    const method = (document.getElementById('norm_method') as HTMLSelectElement).value;
                    handleCleanAction(() => normalizeData(activeDataset.id, { method }), `Normalized data using ${method}`);
                  }}
                >
                  Normalize All Numeric Columns
                </button>
              </div>
            )}

            {/* ENCODE */}
            {activeTab === 'encode' && (
              <div style={{ display: 'flex', gap: '16px' }}>
                <select className="input" style={{ flex: 1 }} onChange={(e) => setSelectedCol(e.target.value)} value={selectedCol}>
                  <option value="">Select categorical column...</option>
                  {catCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="input" style={{ flex: 1 }} id="encode_method">
                  <option value="label">Label Encoding</option>
                  <option value="onehot">One-Hot Encoding</option>
                </select>
                <button 
                  className="btn-primary"
                  disabled={loading || !selectedCol}
                  onClick={() => {
                    const method = (document.getElementById('encode_method') as HTMLSelectElement).value;
                    handleCleanAction(() => encodeColumn(activeDataset.id, { column: selectedCol, method }), `Encoded ${selectedCol} using ${method}`);
                  }}
                >
                  Encode Column
                </button>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '16px' }}>Live Dataset Preview</h3>
            <DataTable columns={activeDataset.preview.columns} data={activeDataset.preview.records} />
          </div>

        </div>
      </div>
    </div>
  );
}

// Just a dummy icon since lucide doesn't export AlertTriangle in this specific context block.
const AlertTriangle = ShieldAlert;

import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import SectionHeader from '../components/ui/SectionHeader';
import EmptyState from '../components/ui/EmptyState';
import { 
  handleMissingValues, 
  removeDuplicates, 
  renameColumns, 
  dropColumns, 
  convertDtype, 
  handleOutliers, 
  normalizeData, 
  encodeColumn, 
  handleSkewness, 
  removeConstants, 
  exportCleaned, 
  getDataset, 
  undoCleaning, 
  getCleaningHistory, 
  resetDataset 
} from '../services/api';
import toast from 'react-hot-toast';
import { 
  Brush, Download, Trash2, Edit3, Settings2, 
  ShieldAlert, Activity, Sliders, 
  Sparkles, Layers, Type, AlertCircle, 
  Undo2, RotateCcw 
} from 'lucide-react';
import DataTable from '../components/ui/DataTable';

type CleanTab = 
  | 'missing' 
  | 'duplicates' 
  | 'rename' 
  | 'columns' 
  | 'dtypes' 
  | 'outliers' 
  | 'normalize' 
  | 'encode' 
  | 'skewness' 
  | 'constants';

export default function CleaningPage() {
  const { activeDataset, setActiveDataset } = useStore();
  const [loading, setLoading] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [undoCount, setUndoCount] = useState<number>(0);
  const [lastActionDesc, setLastActionDesc] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<CleanTab>('missing');
  const [selectedCol, setSelectedCol] = useState('');
  
  // Form states
  const [missingStrategy, setMissingStrategy] = useState('drop_rows');
  const [missingColScope, setMissingColScope] = useState<'all' | 'specific'>('all');
  const [fillConstantVal, setFillConstantVal] = useState('');

  const [renameNewName, setRenameNewName] = useState('');
  const [targetDtype, setTargetDtype] = useState('numeric');

  const [outlierMethod, setOutlierMethod] = useState<'iqr' | 'zscore'>('iqr');
  const [outlierStrategy, setOutlierStrategy] = useState<'remove' | 'cap' | 'replace_mean' | 'replace_median'>('remove');
  const [outlierThreshold, setOutlierThreshold] = useState<number>(1.5);

  const [normMethod, setNormMethod] = useState<'minmax' | 'zscore' | 'robust'>('minmax');
  const [normColScope, setNormColScope] = useState<'all' | 'specific'>('all');

  const [encodeMethod, setEncodeMethod] = useState<'label' | 'onehot' | 'ordinal'>('label');
  const [ordinalCategories, setOrdinalCategories] = useState('');

  const [skewMethod, setSkewMethod] = useState<'log' | 'sqrt' | 'boxcox' | 'yeo_johnson'>('log');
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'json'>('csv');

  const fetchHistory = async () => {
    const currentId = activeDataset?.id;
    if (!currentId) return;
    try {
      const res: any = await getCleaningHistory(currentId);
      const data = res?.data || res;
      if (data) {
        setUndoCount(typeof data.undo_count === 'number' ? data.undo_count : 0);
        if (data.last_action && data.last_action.action) {
          setLastActionDesc(String(data.last_action.action).replace(/_/g, ' '));
        } else {
          setLastActionDesc(null);
        }
      }
    } catch (e) {
      console.error("Failed to fetch cleaning history:", e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [activeDataset?.id]);

  const refreshDataset = async () => {
    const currentId = activeDataset?.id;
    if (!currentId) return;
    try {
      const data: any = await getDataset(currentId);
      const payload = data?.data || data;
      if (payload) {
        setActiveDataset({
          ...activeDataset,
          ...payload,
          id: payload.id || payload.dataset_id || currentId,
        });
      }
      await fetchHistory();
    } catch (err) {
      console.error("Failed to refresh dataset after cleaning:", err);
    }
  };

  const datasetInfo = (activeDataset?.dataset_info ?? {}) as any;
  const colTypes = (datasetInfo.column_types ?? {}) as any;
  const numericCols = colTypes.numeric || [];
  const catCols = colTypes.categorical || [];
  const allCols = [
    ...numericCols, 
    ...catCols, 
    ...(colTypes.datetime || []), 
    ...(colTypes.boolean || [])
  ];

  const handleUndo = async () => {
    const currentId = activeDataset?.id;
    if (!currentId || undoCount === 0 || undoing || loading) return;
    try {
      setUndoing(true);
      const res: any = await undoCleaning(currentId);
      const payload = res?.data || res;
      const reverted = payload?.reverted_action?.action;
      const label = reverted ? String(reverted).replace(/_/g, ' ') : 'last cleaning operation';
      toast.success(`Successfully reverted ${label}`);
      await refreshDataset();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to undo change';
      toast.error(msg);
    } finally {
      setUndoing(false);
    }
  };

  const handleCleanAction = async (action: () => Promise<any>, successMsg: string) => {
    try {
      setLoading(true);
      await action();
      toast.success(
        (t) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>{successMsg}</span>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                await handleUndo();
              }}
              style={{
                background: 'var(--accent-primary)',
                color: '#fff',
                border: 'none',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Undo
            </button>
          </div>
        ),
        { duration: 4500 }
      );
      await refreshDataset();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (undoCount > 0 && !undoing && !loading) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoCount, undoing, loading, activeDataset?.id]);

  if (!activeDataset) return <EmptyState />;

  const handleReset = async () => {
    const currentId = activeDataset?.id;
    if (!currentId || undoCount === 0 || resetting || loading) return;
    if (!window.confirm("Are you sure you want to reset all cleaning transformations back to original uploaded state?")) return;
    try {
      setResetting(true);
      await resetDataset(currentId);
      toast.success("Dataset reset to original state");
      await refreshDataset();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to reset dataset';
      toast.error(msg);
    } finally {
      setResetting(false);
    }
  };

  const handleExport = () => {
    window.open(exportCleaned(activeDataset.id, exportFormat), '_blank');
  };

  const tabs: { id: CleanTab; label: string; icon: any; desc: string }[] = [
    { id: 'missing', label: 'Missing Values', icon: ShieldAlert, desc: 'Impute or drop missing attributes and nulls' },
    { id: 'duplicates', label: 'Duplicates', icon: Edit3, desc: 'Identify and eliminate duplicate records' },
    { id: 'rename', label: 'Rename Columns', icon: Type, desc: 'Modify dataset column identifiers' },
    { id: 'columns', label: 'Drop Columns', icon: Trash2, desc: 'Remove irrelevant or high-null features' },
    { id: 'dtypes', label: 'Convert Types', icon: Settings2, desc: 'Cast numeric, datetime, categorical types' },
    { id: 'outliers', label: 'Outlier Handling', icon: AlertCircle, desc: 'Detect, winsorize, or clip anomalous tails' },
    { id: 'normalize', label: 'Normalization', icon: Sliders, desc: 'MinMax, Standard, or Robust scaling' },
    { id: 'encode', label: 'Feature Encoding', icon: Layers, desc: 'One-Hot, Ordinal, and Label categorical mapping' },
    { id: 'skewness', label: 'Handle Skewness', icon: Activity, desc: 'Log, Box-Cox, and Yeo-Johnson transformations' },
    { id: 'constants', label: 'Constant Features', icon: Sparkles, desc: 'Purge zero-variance static columns' },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
        <SectionHeader 
          title="Data Cleaning & Transformation" 
          subtitle="Enterprise data preparation, categorical encoding, outlier winsorization, and scaling"
          icon={<Brush size={20} />}
        />
        
        {/* Action Controls Bar */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Undo Button */}
          <button
            onClick={handleUndo}
            disabled={undoCount === 0 || undoing || loading}
            title={undoCount > 0 ? `Undo last operation (${lastActionDesc || `${undoCount} steps available`})` : "No changes to undo"}
            className="btn-secondary"
            style={{
              height: '36px',
              padding: '0 12px',
              fontSize: '0.82rem',
              fontWeight: 600,
              opacity: undoCount === 0 ? 0.45 : 1,
              cursor: undoCount === 0 || undoing || loading ? 'not-allowed' : 'pointer',
            }}
          >
            <Undo2 size={14} style={{ transform: undoing ? 'rotate(-180deg)' : 'none', transition: 'transform 0.3s ease' }} />
            <span>{undoing ? 'Reverting...' : 'Undo'}</span>
            {undoCount > 0 && (
              <span className="badge-subtle badge-info" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                {undoCount}
              </span>
            )}
          </button>

          {/* Reset to Original Button */}
          {undoCount > 0 && (
            <button
              onClick={handleReset}
              disabled={resetting || loading || undoing}
              className="btn-secondary"
              style={{
                height: '36px',
                padding: '0 10px',
                fontSize: '0.8rem',
                color: 'var(--color-danger)',
                cursor: resetting ? 'not-allowed' : 'pointer',
              }}
            >
              <RotateCcw size={13} />
              <span>{resetting ? 'Resetting...' : 'Reset All'}</span>
            </button>
          )}

          <div style={{ width: '1px', height: '22px', background: 'var(--border-default)', margin: '0 4px' }} />

          <select 
            className="input-precision" 
            style={{ width: '90px', height: '36px', padding: '0 8px', fontSize: '0.82rem' }}
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as any)}
          >
            <option value="csv">CSV</option>
            <option value="xlsx">Excel</option>
            <option value="json">JSON</option>
          </select>
          <button className="btn-primary" onClick={handleExport} style={{ height: '36px', fontSize: '0.82rem' }}>
            <Download size={14} /> Export Cleaned
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Left Sidebar - Operations Navigation */}
        <div className="card-precision" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', margin: '4px 0 6px 8px' }}>
            Transformations
          </div>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedCol('');
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: isActive ? 'var(--accent-primary-light)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.84rem',
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content - Operation Form & Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
          
          <div className="card-precision" style={{ padding: '20px' }}>
            <div style={{ marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700, margin: '0 0 2px' }}>
                {tabs.find(t => t.id === activeTab)?.label}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>
                {tabs.find(t => t.id === activeTab)?.desc}
              </p>
            </div>

            {/* 1. MISSING VALUES */}
            {activeTab === 'missing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Scope
                    </label>
                    <select 
                      className="input-precision" 
                      value={missingColScope} 
                      onChange={(e) => setMissingColScope(e.target.value as any)}
                    >
                      <option value="all">Apply to All Columns</option>
                      <option value="specific">Apply to Specific Column</option>
                    </select>
                  </div>

                  {missingColScope === 'specific' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                        Target Column
                      </label>
                      <select 
                        className="input-precision" 
                        value={selectedCol} 
                        onChange={(e) => setSelectedCol(e.target.value)}
                      >
                        <option value="">Select a column...</option>
                        {allCols.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Imputation Strategy
                    </label>
                    <select 
                      className="input-precision" 
                      value={missingStrategy} 
                      onChange={(e) => setMissingStrategy(e.target.value)}
                    >
                      <option value="drop_rows">Drop Rows with Missing Values</option>
                      <option value="drop_cols">Drop Columns with Missing Values</option>
                      <option value="fill_mean">Fill with Mean (Numeric only)</option>
                      <option value="fill_median">Fill with Median (Numeric only)</option>
                      <option value="fill_mode">Fill with Mode (Most frequent)</option>
                      <option value="interpolate">Linear Interpolation (Numeric)</option>
                      <option value="ffill">Forward Fill (ffill)</option>
                      <option value="bfill">Backward Fill (bfill)</option>
                      <option value="fill_constant">Fill with Constant Value</option>
                    </select>
                  </div>

                  {missingStrategy === 'fill_constant' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                        Constant Fill Value
                      </label>
                      <input 
                        type="text" 
                        className="input-precision" 
                        placeholder="e.g. 0 or Unknown" 
                        value={fillConstantVal}
                        onChange={(e) => setFillConstantVal(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <button 
                  className="btn-primary"
                  style={{ alignSelf: 'flex-start', marginTop: '6px' }}
                  disabled={loading || (missingColScope === 'specific' && !selectedCol)}
                  onClick={() => {
                    const payload: any = { strategy: missingStrategy };
                    if (missingColScope === 'specific' && selectedCol) {
                      payload.columns = [selectedCol];
                    }
                    if (missingStrategy === 'fill_constant') {
                      payload.fill_value = fillConstantVal;
                    }
                    handleCleanAction(() => handleMissingValues(activeDataset.id, payload), `Missing values handled with ${missingStrategy}`);
                  }}
                >
                  Apply Imputation Transformation
                </button>

                <div style={{ background: 'var(--bg-canvas)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-default)', marginTop: '6px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '0 0 6px', fontWeight: 700, textTransform: 'uppercase' }}>Missing values telemetry:</p>
                  {Object.entries(activeDataset.dataset_info?.missing_info ?? {}).map(([col, info]: [string, any]) => (
                    <div key={col} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '3px' }}>
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family-mono)' }}>{col}</span>
                      <span style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-family-mono)' }}>{info.count} missing ({info.percentage.toFixed(1)}%)</span>
                    </div>
                  ))}
                  {Object.keys(activeDataset.dataset_info?.missing_info ?? {}).length === 0 && (
                    <span style={{ color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 600 }}>✓ Zero missing values detected in active workspace</span>
                  )}
                </div>
              </div>
            )}

            {/* 2. DUPLICATES */}
            {activeTab === 'duplicates' && (
              <div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.88rem' }}>
                  Dataset contains <strong style={{ color: 'var(--text-primary)' }}>{activeDataset.dataset_info?.duplicate_rows ?? 0}</strong> duplicate rows ({activeDataset.dataset_info?.duplicate_percentage ?? 0}%).
                </p>
                <button 
                  className="btn-primary"
                  disabled={loading || activeDataset.dataset_info?.duplicate_rows === 0}
                  onClick={() => handleCleanAction(() => removeDuplicates(activeDataset.id), 'Duplicate rows purged')}
                >
                  Purge Duplicate Rows
                </button>
              </div>
            )}

            {/* 3. RENAME COLUMNS */}
            {activeTab === 'rename' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Select Column
                    </label>
                    <select className="input-precision" onChange={(e) => setSelectedCol(e.target.value)} value={selectedCol}>
                      <option value="">Select column...</option>
                      {allCols.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      New Column Identifier
                    </label>
                    <input 
                      type="text" 
                      className="input-precision" 
                      placeholder="e.g. customer_age" 
                      value={renameNewName} 
                      onChange={(e) => setRenameNewName(e.target.value)} 
                    />
                  </div>
                </div>
                <button 
                  className="btn-primary"
                  style={{ alignSelf: 'flex-start' }}
                  disabled={loading || !selectedCol || !renameNewName.trim()}
                  onClick={() => {
                    handleCleanAction(
                      () => renameColumns(activeDataset.id, { [selectedCol]: renameNewName.trim() }),
                      `Renamed column ${selectedCol} to ${renameNewName}`
                    );
                    setRenameNewName('');
                  }}
                >
                  Apply Rename
                </button>
              </div>
            )}

            {/* 4. DROP COLUMNS */}
            {activeTab === 'columns' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Select Column to Drop
                  </label>
                  <select className="input-precision" onChange={(e) => setSelectedCol(e.target.value)} value={selectedCol}>
                    <option value="">Select a column to drop...</option>
                    {allCols.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button 
                  className="btn-primary"
                  style={{ alignSelf: 'flex-start', background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                  disabled={loading || !selectedCol}
                  onClick={() => handleCleanAction(() => dropColumns(activeDataset.id, [selectedCol]), `Dropped column ${selectedCol}`)}
                >
                  Drop Column
                </button>
              </div>
            )}

            {/* 5. CONVERT DTYPES */}
            {activeTab === 'dtypes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Target Column
                    </label>
                    <select className="input-precision" onChange={(e) => setSelectedCol(e.target.value)} value={selectedCol}>
                      <option value="">Select a column...</option>
                      {allCols.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Cast To Data Type
                    </label>
                    <select 
                      className="input-precision" 
                      value={targetDtype} 
                      onChange={(e) => setTargetDtype(e.target.value)}
                    >
                      <option value="numeric">Numeric (Float64)</option>
                      <option value="integer">Integer (Nullable Int64)</option>
                      <option value="string">String / Text</option>
                      <option value="category">Categorical</option>
                      <option value="datetime">Datetime</option>
                      <option value="boolean">Boolean</option>
                    </select>
                  </div>
                </div>
                <button 
                  className="btn-primary"
                  style={{ alignSelf: 'flex-start' }}
                  disabled={loading || !selectedCol}
                  onClick={() => handleCleanAction(() => convertDtype(activeDataset.id, selectedCol, targetDtype), `Converted ${selectedCol} to ${targetDtype}`)}
                >
                  Cast Data Type
                </button>
              </div>
            )}

            {/* 6. OUTLIERS */}
            {activeTab === 'outliers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Numeric Feature
                  </label>
                  <select className="input-precision" onChange={(e) => setSelectedCol(e.target.value)} value={selectedCol}>
                    <option value="">Select numeric column...</option>
                    {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Detection Algorithm
                    </label>
                    <select className="input-precision" value={outlierMethod} onChange={(e) => setOutlierMethod(e.target.value as any)}>
                      <option value="iqr">IQR (Interquartile Range)</option>
                      <option value="zscore">Z-Score (Standard Deviations)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Treatment Strategy
                    </label>
                    <select className="input-precision" value={outlierStrategy} onChange={(e) => setOutlierStrategy(e.target.value as any)}>
                      <option value="remove">Remove Outlier Rows</option>
                      <option value="cap">Cap Values (Winsorize)</option>
                      <option value="replace_mean">Replace with Mean</option>
                      <option value="replace_median">Replace with Median</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Threshold ({outlierMethod === 'iqr' ? 'IQR Multiplier, e.g. 1.5' : 'Z-Score Std, e.g. 3.0'})
                    </label>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="input-precision" 
                      value={outlierThreshold}
                      onChange={(e) => setOutlierThreshold(parseFloat(e.target.value) || 1.5)}
                    />
                  </div>
                </div>
                <button 
                  className="btn-primary" style={{ alignSelf: 'flex-start' }}
                  disabled={loading || !selectedCol}
                  onClick={() => {
                    handleCleanAction(
                      () => handleOutliers(activeDataset.id, { 
                        column: selectedCol, 
                        method: outlierMethod, 
                        strategy: outlierStrategy,
                        threshold: outlierThreshold 
                      }), 
                      `Handled outliers in ${selectedCol}`
                    );
                  }}
                >
                  Execute Outlier Treatment
                </button>
              </div>
            )}

            {/* 7. NORMALIZE */}
            {activeTab === 'normalize' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Scaling Method
                    </label>
                    <select className="input-precision" value={normMethod} onChange={(e) => setNormMethod(e.target.value as any)}>
                      <option value="minmax">Min-Max Scaling (Scale 0 to 1)</option>
                      <option value="zscore">Standard Scaling (Mean 0, Std 1)</option>
                      <option value="robust">Robust Scaling (Median & IQR based)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Columns Scope
                    </label>
                    <select className="input-precision" value={normColScope} onChange={(e) => setNormColScope(e.target.value as any)}>
                      <option value="all">All Numeric Columns</option>
                      <option value="specific">Specific Column</option>
                    </select>
                  </div>
                </div>

                {normColScope === 'specific' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Select Column
                    </label>
                    <select className="input-precision" value={selectedCol} onChange={(e) => setSelectedCol(e.target.value)}>
                      <option value="">Select numeric column...</option>
                      {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}

                <button 
                  className="btn-primary"
                  style={{ alignSelf: 'flex-start' }}
                  disabled={loading || (normColScope === 'specific' && !selectedCol)}
                  onClick={() => {
                    const payload: any = { method: normMethod };
                    if (normColScope === 'specific' && selectedCol) {
                      payload.columns = [selectedCol];
                    }
                    handleCleanAction(() => normalizeData(activeDataset.id, payload), `Normalized data using ${normMethod}`);
                  }}
                >
                  Normalize Features
                </button>
              </div>
            )}

            {/* 8. ENCODE */}
            {activeTab === 'encode' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Categorical Column
                    </label>
                    <select className="input-precision" onChange={(e) => setSelectedCol(e.target.value)} value={selectedCol}>
                      <option value="">Select categorical column...</option>
                      {catCols.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Encoding Scheme
                    </label>
                    <select className="input-precision" value={encodeMethod} onChange={(e) => setEncodeMethod(e.target.value as any)}>
                      <option value="label">Label Encoding (0, 1, 2...)</option>
                      <option value="onehot">One-Hot Encoding (Binary dummy columns)</option>
                      <option value="ordinal">Ordinal Encoding (User-ordered hierarchy)</option>
                    </select>
                  </div>
                </div>

                {encodeMethod === 'ordinal' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Ordered Categories (Comma-separated from lowest to highest)
                    </label>
                    <input 
                      type="text" 
                      className="input-precision" 
                      placeholder="e.g. Low, Medium, High" 
                      value={ordinalCategories} 
                      onChange={(e) => setOrdinalCategories(e.target.value)} 
                    />
                  </div>
                )}

                <button 
                  className="btn-primary"
                  style={{ alignSelf: 'flex-start' }}
                  disabled={loading || !selectedCol || (encodeMethod === 'ordinal' && !ordinalCategories.trim())}
                  onClick={() => {
                    const payload: any = { column: selectedCol, method: encodeMethod };
                    if (encodeMethod === 'ordinal') {
                      payload.categories = ordinalCategories.split(',').map(s => s.trim()).filter(Boolean);
                    }
                    handleCleanAction(() => encodeColumn(activeDataset.id, payload), `Encoded ${selectedCol} using ${encodeMethod}`);
                  }}
                >
                  Apply Feature Encoding
                </button>
              </div>
            )}

            {/* 9. SKEWNESS */}
            {activeTab === 'skewness' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Numeric Column
                    </label>
                    <select className="input-precision" onChange={(e) => setSelectedCol(e.target.value)} value={selectedCol}>
                      <option value="">Select numeric column...</option>
                      {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      Transformation Formula
                    </label>
                    <select className="input-precision" value={skewMethod} onChange={(e) => setSkewMethod(e.target.value as any)}>
                      <option value="log">Log Transformation (Log1p)</option>
                      <option value="sqrt">Square Root Transformation</option>
                      <option value="boxcox">Box-Cox (Strictly Positive Series)</option>
                      <option value="yeo_johnson">Yeo-Johnson (Supports Zero & Negative values)</option>
                    </select>
                  </div>
                </div>
                <button 
                  className="btn-primary"
                  style={{ alignSelf: 'flex-start' }}
                  disabled={loading || !selectedCol}
                  onClick={() => {
                    handleCleanAction(
                      () => handleSkewness(activeDataset.id, { column: selectedCol, method: skewMethod }),
                      `Reduced skewness in ${selectedCol} using ${skewMethod}`
                    );
                  }}
                >
                  Apply Skew Transformation
                </button>
              </div>
            )}

            {/* 10. REMOVE CONSTANT FEATURES */}
            {activeTab === 'constants' && (
              <div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '14px', fontSize: '0.88rem' }}>
                  Constant features (columns where every row has the identical value) provide zero predictive entropy and add redundant model complexity.
                </p>
                <button 
                  className="btn-primary"
                  disabled={loading}
                  onClick={() => handleCleanAction(() => removeConstants(activeDataset.id), 'Removed constant features')}
                >
                  Purge Zero-Variance Constant Columns
                </button>
              </div>
            )}
          </div>

          {/* Live Preview Table */}
          <div className="card-precision" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '0.94rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>
                Cleaned Data Preview
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-family-mono)' }}>
                {activeDataset.dataset_info?.rows ?? '—'} rows × {activeDataset.dataset_info?.columns ?? '—'} columns
              </span>
            </div>

            {/* Modifications & Undo Status Banner */}
            {undoCount > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                background: 'var(--accent-primary-light)',
                border: '1px solid var(--accent-primary)',
                borderRadius: '8px',
                padding: '8px 14px',
                marginBottom: '14px',
                fontSize: '0.82rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <Sparkles size={15} color="var(--accent-primary)" />
                  <span>
                    <strong>{undoCount} transformation{undoCount > 1 ? 's' : ''}</strong> applied to this workspace session.
                    {lastActionDesc && <span style={{ opacity: 0.85, marginLeft: '6px' }}>(Last: <em>{lastActionDesc}</em>)</span>}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    onClick={handleUndo}
                    disabled={undoing || loading}
                    className="btn-secondary"
                    style={{
                      height: '28px',
                      padding: '0 10px',
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: undoing || loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Undo2 size={12} /> Revert Last Step (Ctrl+Z)
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={resetting || loading}
                    style={{
                      height: '28px',
                      padding: '0 8px',
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'transparent',
                      color: 'var(--color-danger)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '6px',
                      cursor: resetting || loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <RotateCcw size={12} /> Reset All
                  </button>
                </div>
              </div>
            )}

            <DataTable columns={activeDataset.preview.columns} data={activeDataset.preview.records} />
          </div>

        </div>
      </div>
    </div>
  );
}

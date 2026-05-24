import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, AlertCircle, FileText, Settings, Type } from 'lucide-react';
import '../auth/auth.css';
import './UploadTemplatePage.css';
import CertiLogo from '../../src/Images/CertiLogo.png';
import stacy from '../../src/Images/Stacy.jpg';

const PLACEHOLDER_OPTIONS = [
  // ... (rest of constants)
  { key: 'full_name', label: 'Full Name' },
  { key: 'course', label: 'Course' },
  { key: 'certificate_id', label: 'Certificate ID' },
  { key: 'issued_by', label: 'Issued By' },
  { key: 'date_issued', label: 'Date Issued' },
  { key: 'qr_code', label: 'QR Code' }
];

const DEFAULT_MARKER_STYLE = {
  fontSize: 24,
  color: '#111111',
  align: 'center',
  fontFamily: 'Poppins, sans-serif',
  fontStyle: 'normal',
  fontWeight: '700'
};

const FONT_OPTIONS = [
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' }
];

const FONT_STYLE_OPTIONS = [
  { label: 'Normal', value: 'normal', fontStyle: 'normal', fontWeight: '400' },
  { label: 'Italic', value: 'italic', fontStyle: 'italic', fontWeight: '400' },
  { label: 'Bold', value: 'bold', fontStyle: 'normal', fontWeight: '700' }
];

const UploadTemplatePage = () => {
  const navigate = useNavigate(); // Idinagdag ito
  const [file, setFile] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [markers, setMarkers] = useState([]);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewOrientation, setPreviewOrientation] = useState('landscape');
  const [activePlaceholderKey, setActivePlaceholderKey] = useState('full_name');
  const [draggingMarkerId, setDraggingMarkerId] = useState(null);
  const dragStateRef = useRef({ markerId: null, offsetXPct: 0, offsetYPct: 0, pointerId: null });
  const [placeholderStyles, setPlaceholderStyles] = useState(() => {
    return PLACEHOLDER_OPTIONS.reduce((acc, option) => {
      acc[option.key] = { ...DEFAULT_MARKER_STYLE };
      return acc;
    }, {});
  });

  const fileInputRef = useRef(null);
  const previewImageRef = useRef(null);
  const suppressNextImageClickRef = useRef(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const getPlaceholderMeta = (key) => {
    return PLACEHOLDER_OPTIONS.find((option) => option.key === key) || PLACEHOLDER_OPTIONS[0];
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewOrientation('landscape');
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const nextPreviewUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(nextPreviewUrl);
    }
  };

  const handlePreviewLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (!naturalWidth || !naturalHeight) return;
    setPreviewOrientation(naturalHeight > naturalWidth ? 'portrait' : 'landscape');
    setMarkers((prev) => prev.map((marker) => {
      const previewFontSize = marker.previewFontSize ?? marker.fontSize;
      return {
        ...marker,
        previewFontSize,
        fontSize: toOutputFontSize(previewFontSize)
      };
    }));
  };

  const getFontScaleFactor = () => {
    const imageEl = previewImageRef.current;
    if (!imageEl || !imageEl.clientWidth || !imageEl.naturalWidth) {
      return 1;
    }
    return imageEl.naturalWidth / imageEl.clientWidth;
  };

  const toOutputFontSize = (previewFontSize) => {
    const scaled = previewFontSize * getFontScaleFactor();
    return Number(scaled.toFixed(2));
  };

  const addOrUpdateMarker = (key, xPct = 50, yPct = 50) => {
    const placeholder = getPlaceholderMeta(key);
    const style = placeholderStyles[key] || DEFAULT_MARKER_STYLE;
    const previewFontSize = style.fontSize;
    const outputFontSize = toOutputFontSize(previewFontSize);
    setMarkers((prev) => {
      const existing = prev.find((marker) => marker.key === placeholder.key);
      const nextMarker = {
        id: existing?.id || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        key: placeholder.key,
        label: placeholder.label,
        xPct: Number(xPct.toFixed(2)),
        yPct: Number(yPct.toFixed(2)),
        fontSize: outputFontSize,
        previewFontSize,
        color: style.color,
        align: style.align,
        fontFamily: style.fontFamily || DEFAULT_MARKER_STYLE.fontFamily,
        fontStyle: style.fontStyle || DEFAULT_MARKER_STYLE.fontStyle,
        fontWeight: style.fontWeight || DEFAULT_MARKER_STYLE.fontWeight
      };
      if (!existing) {
        return prev.concat(nextMarker);
      }
      return prev.map((marker) => marker.key !== placeholder.key ? marker : nextMarker);
    });
  };

  const onImageClick = (e) => {
    if (suppressNextImageClickRef.current) {
      suppressNextImageClickRef.current = false;
      return;
    }
    const imageRect = previewImageRef.current.getBoundingClientRect();
    if (e.clientX < imageRect.left || e.clientX > imageRect.right || e.clientY < imageRect.top || e.clientY > imageRect.bottom) {
      return;
    }
    const xPct = ((e.clientX - imageRect.left) / imageRect.width) * 100;
    const yPct = ((e.clientY - imageRect.top) / imageRect.height) * 100;
    addOrUpdateMarker(activePlaceholderKey, xPct, yPct);
  };

  const handleMarkerPointerDown = (e, markerId) => {
    e.preventDefault();
    e.stopPropagation();
    suppressNextImageClickRef.current = true;
    const imageEl = previewImageRef.current;
    const marker = markers.find((item) => item.id === markerId);
    if (imageEl && marker) {
      const imageRect = imageEl.getBoundingClientRect();
      if (imageRect.width && imageRect.height) {
        const pointerXPct = ((e.clientX - imageRect.left) / imageRect.width) * 100;
        const pointerYPct = ((e.clientY - imageRect.top) / imageRect.height) * 100;
        dragStateRef.current = {
          markerId,
          offsetXPct: pointerXPct - marker.xPct,
          offsetYPct: pointerYPct - marker.yPct,
          pointerId: e.pointerId
        };
      }
    }
    if (e.currentTarget?.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (error) {
        // ignore capture failures and fall back to the canvas move handler
      }
    }
    setDraggingMarkerId(markerId);
  };

  const handleCanvasPointerMove = (e) => {
    const { markerId, offsetXPct, offsetYPct } = dragStateRef.current;
    if (!draggingMarkerId || !markerId) return;
    if (!previewImageRef.current) return;
    const imageRect = previewImageRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - imageRect.left) / imageRect.width) * 100 - offsetXPct;
    const yPct = ((e.clientY - imageRect.top) / imageRect.height) * 100 - offsetYPct;
    const clampedXPct = Math.max(0, Math.min(100, xPct));
    const clampedYPct = Math.max(0, Math.min(100, yPct));
    setMarkers((prev) => prev.map((marker) => {
      if (marker.id !== markerId) return marker;
      return {
        ...marker,
        xPct: Number(clampedXPct.toFixed(2)),
        yPct: Number(clampedYPct.toFixed(2))
      };
    }));
  };

  const handleCanvasPointerUp = () => {
    dragStateRef.current = { markerId: null, offsetXPct: 0, offsetYPct: 0, pointerId: null };
    setDraggingMarkerId(null);
  };

  const removeMarker = (markerId) => {
    setMarkers((prev) => prev.filter((marker) => marker.id !== markerId));
  };

  const handleStyleChange = (field, value) => {
    setPlaceholderStyles((prev) => {
      const nextStyle = {
        ...(prev[activePlaceholderKey] || DEFAULT_MARKER_STYLE),
        [field]: value
      };
      const nextStyles = { ...prev, [activePlaceholderKey]: nextStyle };
      setMarkers((currentMarkers) => currentMarkers.map((marker) => {
        if (marker.key !== activePlaceholderKey) return marker;
        return {
          ...marker,
          ...nextStyle,
          fontFamily: nextStyle.fontFamily || DEFAULT_MARKER_STYLE.fontFamily,
          fontStyle: nextStyle.fontStyle || DEFAULT_MARKER_STYLE.fontStyle,
          fontWeight: nextStyle.fontWeight || DEFAULT_MARKER_STYLE.fontWeight,
          previewFontSize: nextStyle.fontSize,
          fontSize: toOutputFontSize(nextStyle.fontSize)
        };
      }));
      return nextStyles;
    });
  };

  const handleFontStyleChange = (value) => {
    const nextPreset = FONT_STYLE_OPTIONS.find((option) => option.value === value) || FONT_STYLE_OPTIONS[0];
    setPlaceholderStyles((prev) => {
      const nextStyle = {
        ...(prev[activePlaceholderKey] || DEFAULT_MARKER_STYLE),
        fontStyle: nextPreset.fontStyle,
        fontWeight: nextPreset.fontWeight
      };
      const nextStyles = { ...prev, [activePlaceholderKey]: nextStyle };
      setMarkers((currentMarkers) => currentMarkers.map((marker) => {
        if (marker.key !== activePlaceholderKey) return marker;
        return {
          ...marker,
          ...nextStyle,
          fontFamily: nextStyle.fontFamily || DEFAULT_MARKER_STYLE.fontFamily,
          previewFontSize: nextStyle.fontSize,
          fontSize: toOutputFontSize(nextStyle.fontSize)
        };
      }));
      return nextStyles;
    });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !templateName) {
      setMessage({ type: 'error', text: 'Please provide both name and file.' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    const formData = new FormData();
    formData.append('name', templateName);
    formData.append('background', file);
    const payloadMarkers = markers.map(({ previewFontSize, ...marker }) => marker);
    formData.append('placeholders', JSON.stringify({ version: 1, markers: payloadMarkers }));
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://127.0.0.1:8000/api/templates/', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 201 || response.status === 200) {
        setMessage({ type: 'success', text: 'Template uploaded successfully!' });
        setFile(null);
        setTemplateName('');
        setMarkers([]);
        setPlaceholderStyles(PLACEHOLDER_OPTIONS.reduce((acc, option) => {
          acc[option.key] = { ...DEFAULT_MARKER_STYLE };
          return acc;
        }, {}));
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl('');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (error) {
      const serverErr = error.response?.data;
      const errorText = serverErr ? Object.keys(serverErr).map(k => `${k.toUpperCase()}: ${Array.isArray(serverErr[k]) ? serverErr[k].join(', ') : serverErr[k]}`).join(' | ') : 'Upload failed.';
      setMessage({ type: 'error', text: errorText });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const activePreviewFontSize = placeholderStyles[activePlaceholderKey]?.fontSize || 24;
  const activeOutputFontSize = toOutputFontSize(activePreviewFontSize);

  return (
    <div className="auth-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} />
        Back
      </button>

      {message.text && (
        <div className={message.type === 'success' ? 'success-toast' : 'error-toast'}>
          <div className="toast-content">
            <span className="toast-icon">{message.type === 'success' ? '✅' : '❌'}</span>
            <div className="toast-text">
              <strong>{message.type === 'success' ? 'Success' : 'Error'}</strong>
              <p>{message.text}</p>
            </div>
          </div>
        </div>
      )}

      <div className="auth-split-wrapper">
        <div className="auth-info-section"
          style={{
            backgroundImage: `linear-gradient(165deg, rgba(5, 9, 80, 1), rgba(2, 2, 12, 0.7)), url(${stacy})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "cover"
          }}>
          <div className="info-content">
            <div className='LogoLoginContainer'>
              <img className='LogoLogin' src={CertiLogo} alt="Certifier Logo" />
            </div>
            <h1>Design Templates.</h1>
            <p>Create and manage professional certificate layouts with our visual drag-and-drop editor.</p>
            <div className="info-graphic">
              <span>✓ Visual Editor</span>
              <span>✓ Custom Fonts</span>
              <span>✓ QR Integration</span>
            </div>
          </div>
        </div>

        <div className="auth-form-section">
          <div className="auth-card wide">
            <div className="auth-header">
              <h2>Upload Template</h2>
              <p>Fill in the details to register your certificate design.</p>
            </div>

            <form className="auth-form" onSubmit={handleUpload}>
              <div className="form-group">
                <label>Template Name</label>
                <input
                  type="text"
                  placeholder="e.g. Graduation 2026"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}
                />
              </div>

              <div className="drop-zone" onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  hidden
                />
                <div className="drop-zone-label">
                  <FileText className="upload-icon" size={48} style={{ margin: '0 auto 12px', color: '#0D1282' }} />
                  {file ? <strong>{file.name}</strong> : <p>Click to upload Background Image</p>}
                </div>
              </div>

              {previewUrl && (
                <div className="template-editor">
                  <div className="placeholder-toolbar">
                    {PLACEHOLDER_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={activePlaceholderKey === option.key ? 'tool-chip active' : 'tool-chip'}
                        onClick={() => setActivePlaceholderKey(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '12px 0' }}>
                    <Settings size={18} color="#64748b" />
                    <p className="editor-hint" style={{ margin: 0 }}>
                      Selected: <strong>{getPlaceholderMeta(activePlaceholderKey).label}</strong>
                    </p>
                  </div>

                  <div className="marker-controls">
                    <label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Type size={14} /> Font Size</div>
                      <input
                        type="range"
                        min="12"
                        max="120"
                        value={activePreviewFontSize}
                        onChange={(e) => handleStyleChange('fontSize', Number(e.target.value))}
                      />
                      <span>{activePreviewFontSize}px</span>
                    </label>
                    <label>
                      Color
                      <input
                        type="color"
                        value={placeholderStyles[activePlaceholderKey]?.color || '#111111'}
                        onChange={(e) => handleStyleChange('color', e.target.value)}
                        style={{ height: '38px', padding: '2px' }}
                      />
                    </label>
                    <label>
                      Font
                      <select
                        value={placeholderStyles[activePlaceholderKey]?.fontFamily || DEFAULT_MARKER_STYLE.fontFamily}
                        onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                        style={{ padding: '8px', borderRadius: '8px' }}
                      >
                        {FONT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Style
                      <select
                        value={placeholderStyles[activePlaceholderKey]?.fontWeight === '700' ? 'bold' : (placeholderStyles[activePlaceholderKey]?.fontStyle === 'italic' ? 'italic' : 'normal')}
                        onChange={(e) => handleFontStyleChange(e.target.value)}
                        style={{ padding: '8px', borderRadius: '8px' }}
                      >
                        {FONT_STYLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Align
                      <select
                        value={placeholderStyles[activePlaceholderKey]?.align || 'center'}
                        onChange={(e) => handleStyleChange('align', e.target.value)}
                        style={{ padding: '8px', borderRadius: '8px' }}
                      >
                        <option value="left">Right</option>
                        <option value="center">Center</option>
                        <option value="right">Left</option>
                      </select>
                    </label>
                  </div>

                  <div
                    className={`template-preview ${previewOrientation}`}
                    onClick={onImageClick}
                    onPointerMove={handleCanvasPointerMove}
                    onPointerUp={handleCanvasPointerUp}
                    onPointerCancel={handleCanvasPointerUp}
                    onPointerLeave={handleCanvasPointerUp}
                  >
                    <img ref={previewImageRef} src={previewUrl} alt="Template preview" draggable={false} onLoad={handlePreviewLoad} />
                    {markers.map((marker) => {
                      const isQrMarker = marker.key === 'qr_code';
                      const horizontalTransform = marker.align === 'center' ? 'translate(-50%, -50%)' : marker.align === 'left' ? 'translate(0, -50%)' : 'translate(-100%, -50%)';
                      const justifyContent = marker.align === 'center' ? 'center' : marker.align === 'left' ? 'flex-start' : 'flex-end';
                      const markerSize = marker.previewFontSize ?? marker.fontSize;
                      return (
                        <button
                          key={marker.id}
                          type="button"
                          className={isQrMarker ? 'template-marker qr-marker' : 'template-marker'}
                          style={{
                            left: `${marker.xPct}%`,
                            top: `${marker.yPct}%`,
                            transform: isQrMarker ? 'translate(-50%, -50%)' : horizontalTransform,
                            fontSize: isQrMarker ? `${Math.max(10, Math.round(markerSize * 0.26))}px` : `${markerSize}px`,
                            width: isQrMarker ? `${Math.max(40, Math.round(markerSize * 1.4))}px` : undefined,
                            height: isQrMarker ? `${Math.max(40, Math.round(markerSize * 1.4))}px` : undefined,
                            fontFamily: marker.fontFamily || DEFAULT_MARKER_STYLE.fontFamily,
                            fontStyle: marker.fontStyle || DEFAULT_MARKER_STYLE.fontStyle,
                            fontWeight: marker.fontWeight || DEFAULT_MARKER_STYLE.fontWeight,
                            color: marker.color,
                            textAlign: isQrMarker ? 'center' : marker.align,
                            justifyContent: justifyContent,
                            touchAction: 'none',
                            userSelect: 'none'
                          }}
                          onPointerDown={(e) => handleMarkerPointerDown(e, marker.id)}
                        >
                          {isQrMarker ? 'QR' : `{{${marker.key}}}`}
                        </button>
                      );
                    })}
                  </div>

                  <div className="marker-list">
                    {markers.length === 0 ? (
                      <p className="marker-empty">No markers yet. Click the preview to add <strong>{getPlaceholderMeta(activePlaceholderKey).label}</strong>.</p>
                    ) : (
                      markers.map((marker) => (
                        <div key={marker.id} className="marker-row">
                          <span>{marker.label}</span>
                          <span>{marker.xPct}%, {marker.yPct}% | {marker.previewFontSize ?? marker.fontSize}px</span>
                          <button type="button" onClick={() => removeMarker(marker.id)}>Remove</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <button type="submit" className="auth-submit" disabled={loading} style={{ marginTop: '24px' }}>
                {loading ? 'Uploading Template...' : 'Confirm Upload'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadTemplatePage;
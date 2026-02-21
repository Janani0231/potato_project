import { useState } from "react";

const CLASS_LABELS = {
  "Potato___Early_blight": "Early Blight",
  "Potato___Late_blight": "Late Blight",
  "Potato___healthy": "Healthy",
};

const CLASS_COLORS = {
  "Potato___Early_blight": "#e67e22",
  "Potato___Late_blight": "#e74c3c",
  "Potato___healthy": "#27ae60",
};

export default function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  }

  async function handlePredict() {
    if (!image) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", image);

    try {
      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError("Could not connect to the prediction server. Make sure FastAPI is running.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setImage(null);
    setPreview(null);
    setResult(null);
    setError(null);
  }

  const predictedColor = result ? CLASS_COLORS[result.class] : "#2c3e50";

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>🥔 Potato Disease Detector</h1>
          <p style={styles.subtitle}>Upload a potato leaf image to detect disease</p>
        </div>

        {/* Upload Area */}
        <div style={styles.uploadArea}>
          {preview ? (
            <img src={preview} alt="preview" style={styles.previewImage} />
          ) : (
            <label style={styles.uploadLabel} htmlFor="fileInput">
              <div style={styles.uploadIcon}>📁</div>
              <div style={styles.uploadText}>Click to upload an image</div>
              <div style={styles.uploadHint}>JPG, JPEG or PNG</div>
            </label>
          )}
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={styles.hiddenInput}
          />
        </div>

        {/* Buttons */}
        <div style={styles.buttonRow}>
          {preview && (
            <button onClick={handleReset} style={styles.resetButton}>
              Reset
            </button>
          )}
          <button
            onClick={handlePredict}
            disabled={!image || loading}
            style={{
              ...styles.predictButton,
              opacity: !image || loading ? 0.5 : 1,
              cursor: !image || loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Analyzing..." : "Detect Disease"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            ⚠️ {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={styles.resultBox}>
            <div style={styles.resultHeader}>
              <span style={styles.resultLabel}>Prediction</span>
              <span style={{ ...styles.resultClass, color: predictedColor }}>
                {CLASS_LABELS[result.class] || result.class}
              </span>
            </div>

            <div style={styles.confidenceRow}>
              <span style={styles.confidenceLabel}>Confidence</span>
              <span style={{ ...styles.confidenceValue, color: predictedColor }}>
                {(result.confidence * 100).toFixed(1)}%
              </span>
            </div>

            {/* All class probabilities */}
            <div style={styles.probSection}>
              <div style={styles.probTitle}>All Probabilities</div>
              {Object.entries(result.all_predictions).map(([cls, prob]) => (
                <div key={cls} style={styles.probRow}>
                  <span style={styles.probLabel}>{CLASS_LABELS[cls] || cls}</span>
                  <div style={styles.barBackground}>
                    <div
                      style={{
                        ...styles.barFill,
                        width: `${(prob * 100).toFixed(1)}%`,
                        backgroundColor: CLASS_COLORS[cls],
                      }}
                    />
                  </div>
                  <span style={styles.probValue}>{(prob * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f0f4f8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', sans-serif",
    padding: "24px",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
    padding: "40px",
    width: "100%",
    maxWidth: "520px",
  },
  header: {
    textAlign: "center",
    marginBottom: "28px",
  },
  title: {
    fontSize: "26px",
    fontWeight: "700",
    color: "#2c3e50",
    margin: "0 0 6px 0",
  },
  subtitle: {
    fontSize: "14px",
    color: "#7f8c8d",
    margin: 0,
  },
  uploadArea: {
    border: "2px dashed #bdc3c7",
    borderRadius: "12px",
    minHeight: "200px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
    marginBottom: "20px",
    overflow: "hidden",
    cursor: "pointer",
  },
  uploadLabel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: "32px",
    width: "100%",
    height: "100%",
  },
  uploadIcon: { fontSize: "40px", marginBottom: "10px" },
  uploadText: { fontSize: "16px", color: "#2c3e50", fontWeight: "600" },
  uploadHint: { fontSize: "12px", color: "#95a5a6", marginTop: "4px" },
  hiddenInput: { display: "none" },
  previewImage: {
    width: "100%",
    maxHeight: "280px",
    objectFit: "cover",
    borderRadius: "10px",
  },
  buttonRow: {
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
  },
  predictButton: {
    flex: 1,
    padding: "12px",
    backgroundColor: "#27ae60",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    transition: "opacity 0.2s",
  },
  resetButton: {
    padding: "12px 20px",
    backgroundColor: "#ecf0f1",
    color: "#2c3e50",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },
  errorBox: {
    backgroundColor: "#fdecea",
    border: "1px solid #e74c3c",
    color: "#c0392b",
    borderRadius: "8px",
    padding: "12px 16px",
    fontSize: "14px",
    marginBottom: "16px",
  },
  resultBox: {
    backgroundColor: "#f8fffe",
    border: "1px solid #dfe6e9",
    borderRadius: "12px",
    padding: "20px",
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  resultLabel: {
    fontSize: "13px",
    color: "#95a5a6",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  resultClass: {
    fontSize: "20px",
    fontWeight: "700",
  },
  confidenceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "16px",
    borderBottom: "1px solid #ecf0f1",
  },
  confidenceLabel: {
    fontSize: "13px",
    color: "#95a5a6",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  confidenceValue: {
    fontSize: "20px",
    fontWeight: "700",
  },
  probSection: { display: "flex", flexDirection: "column", gap: "10px" },
  probTitle: {
    fontSize: "12px",
    color: "#95a5a6",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "4px",
  },
  probRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  probLabel: {
    fontSize: "13px",
    color: "#2c3e50",
    width: "100px",
    flexShrink: 0,
  },
  barBackground: {
    flex: 1,
    height: "8px",
    backgroundColor: "#ecf0f1",
    borderRadius: "4px",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.5s ease",
  },
  probValue: {
    fontSize: "13px",
    color: "#7f8c8d",
    width: "42px",
    textAlign: "right",
    flexShrink: 0,
  },
};
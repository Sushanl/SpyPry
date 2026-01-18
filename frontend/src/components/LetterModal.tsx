import './LetterModal.css';

interface LetterResponse {
  letter: string;
  email_address: string;
  company_name: string;
  email_subject: string;
}

interface LetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  letterData: LetterResponse | null;
  isGenerating: boolean;
  error?: string | null;
}

export default function LetterModal({ isOpen, onClose, letterData, isGenerating, error }: LetterModalProps) {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Generate Letter</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body" onClick={(e) => e.stopPropagation()}>
          {isGenerating ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Generating opt-out letter...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#d32f2f' }}>
              <p><strong>Error:</strong> {error}</p>
            </div>
          ) : letterData ? (
            <div className="modal-info">
              <div className="info-row">
                <span className="info-label">Company Name:</span>
                <span className="info-value">{letterData.company_name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email Address:</span>
                <span className="info-value">{letterData.email_address}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email Subject:</span>
                <span className="info-value">{letterData.email_subject}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Letter:</span>
                <span className="info-value letter-content">{letterData.letter}</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>No letter data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

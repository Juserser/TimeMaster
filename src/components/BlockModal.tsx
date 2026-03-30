import React from 'react';
import { ModalData } from '../types';
import { t, Language } from '../utils/i18n';

interface BlockModalProps {
  showModal: boolean;
  setShowModal: (v: boolean) => void;
  modalData: ModalData;
  setModalData: (v: ModalData) => void;
  handleSaveBlock: () => void;
  handleDeleteBlock?: (id: string) => void;
  language: Language;
}

const BlockModal: React.FC<BlockModalProps> = ({
  showModal, setShowModal, modalData, setModalData,
  handleSaveBlock, handleDeleteBlock, language
}) => {
  if (!showModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{modalData.id ? t(language, 'editBlock') : t(language, 'addBlock')}</h3>
          {modalData.id && handleDeleteBlock && (
            <button
              className="modal-delete-btn"
              onClick={() => modalData.id && handleDeleteBlock(modalData.id)}
              title="Delete Block"
            >
              🗑
            </button>
          )}
        </div>

        <input
          autoFocus
          className="modal-input"
          placeholder="Title"
          value={modalData.title}
          onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && handleSaveBlock()}
        />
        <div className="modal-row">
          <label>{t(language, 'min')}:</label>
          <input
            type="number"
            className="modal-input-small"
            value={modalData.duration}
            onChange={(e) => setModalData({ ...modalData, duration: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => setShowModal(false)}>{t(language, 'cancel')}</button>
          <button className="btn-primary" onClick={handleSaveBlock}>{t(language, 'save')}</button>
        </div>
      </div>
    </div>
  );
};

export default BlockModal;

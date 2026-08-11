import { useState } from "react";
import { MOCK_PATIENT } from "../../lib/mockData";
import UploadPanel from "../UploadPanel";

interface Props {
  roomId: string;
  examCount?: number;
}

// Painel esquerdo do dashboard do especialista: ficha resumida do paciente
// (dados mockados) e a seção "Exames do Paciente", que reaproveita o
// UploadPanel real (upload/download de arquivos da sala).
export default function PatientPanel({ roomId, examCount = 5 }: Props) {
  const [examsOpen, setExamsOpen] = useState(false);

  return (
    <aside className="patient-panel">
      <div className="patient-card">
        <h2 className="patient-card-title">Dados do paciente</h2>

        <div className="patient-grid">
          <div className="patient-field">
            <span className="patient-field-label">Nome</span>
            <span className="patient-field-value">{MOCK_PATIENT.name}</span>
          </div>
          <div className="patient-field">
            <span className="patient-field-label">Idade / Sexo</span>
            <span className="patient-field-value">{MOCK_PATIENT.ageSex}</span>
          </div>
        </div>

        <div className="patient-field">
          <span className="patient-field-label">Sinais Vitais</span>
          <span className="patient-field-value">{MOCK_PATIENT.vitals}</span>
        </div>

        <div className="patient-field">
          <span className="patient-field-label">História Clínica</span>
          <span className="patient-field-value">{MOCK_PATIENT.history}</span>
        </div>

        <div className="patient-field">
          <span className="patient-field-label">Medidas Adotadas</span>
          <span className="patient-field-value">{MOCK_PATIENT.measures}</span>
        </div>

        <div className="patient-field">
          <span className="patient-field-label">Exame Físico</span>
          <span className="patient-field-value">{MOCK_PATIENT.physicalExam}</span>
        </div>

        <div className="patient-field">
          <span className="patient-field-label">Exames Complementares</span>
          <span className="patient-field-value">{MOCK_PATIENT.complementaryExams}</span>
        </div>

        <hr className="patient-divider" />

        <div className="patient-field">
          <span className="patient-field-label">Hipótese Diagnóstica</span>
          <span className="diagnosis-badge">{MOCK_PATIENT.diagnosis}</span>
        </div>
      </div>

      <button className="exams-toggle" onClick={() => setExamsOpen((v) => !v)}>
        <span className="exams-toggle-label">
          <span className="exams-icon" aria-hidden>
            🧪
          </span>
          Exames do Paciente
          <span className="exams-count">{examCount}</span>
        </span>
        <span className={`exams-chevron ${examsOpen ? "open" : ""}`}>⌄</span>
      </button>

      {examsOpen && (
        <div className="exams-body">
          <UploadPanel roomId={roomId} />
        </div>
      )}
    </aside>
  );
}

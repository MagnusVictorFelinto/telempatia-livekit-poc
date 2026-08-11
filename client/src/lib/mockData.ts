// Dados estáticos usados apenas para compor visualmente o dashboard do
// especialista (fila de atendimento e ficha do paciente). Nada aqui vem do
// backend — quando o produto evoluir, essas estruturas viram chamadas reais
// de API/Prisma.

export interface QueuePatient {
  id: string;
  initials: string;
  name: string;
  color: string;
}

export interface QueueGroup {
  id: string;
  title: string;
  callButtonVariant: "primary" | "warning";
  patients: QueuePatient[];
}

export const MOCK_QUEUE: QueueGroup[] = [
  {
    id: "primeiro-atendimento",
    title: "Primeiro atendimento",
    callButtonVariant: "primary",
    patients: [
      { id: "lm", initials: "LM", name: "Lucas Mendes", color: "#dbeafe" },
      { id: "as", initials: "AS", name: "Ana Silva", color: "#dbeafe" },
      { id: "cr", initials: "CR", name: "Carlos Ramos", color: "#dbeafe" },
      { id: "rs", initials: "RS", name: "Rafael Souza", color: "#dbeafe" },
    ],
  },
  {
    id: "retorno-conclusao",
    title: "Retorno para conclusão",
    callButtonVariant: "warning",
    patients: [
      { id: "lm2", initials: "LM", name: "Lucas Mendes", color: "#fde8d7" },
      { id: "as2", initials: "AS", name: "Ana Silva", color: "#fde8d7" },
      { id: "cr2", initials: "CR", name: "Carlos Ramos", color: "#fde8d7" },
      { id: "rs2", initials: "RS", name: "Rafael Souza", color: "#fde8d7" },
    ],
  },
];

export interface MockPatient {
  name: string;
  ageSex: string;
  vitals: string;
  history: string;
  measures: string;
  physicalExam: string;
  complementaryExams: string;
  diagnosis: string;
}

export const MOCK_PATIENT: MockPatient = {
  name: "M. Oliveira",
  ageSex: "65 anos · Masculino",
  vitals: "PA: 130/85 mmHg · FC: 98 bpm · FR: 22 rpm · Tax: 38,7°C · SpO2: 94%",
  history:
    "Paciente com tosse produtiva há 5 dias, febre (38,7°C), dispneia leve e dor pleurítica à direita.",
  measures: "Dipirona 1g EV, hidratação venosa com SF 0,9% 500ml, oxigenoterapia 2L/min.",
  physicalExam: "MV abolido em base D, macicez à percussão, egofonia presente.",
  complementaryExams: "Leucocitose (14.500), PCR elevada. RX tórax com consolidação em base direita.",
  diagnosis: "Pneumonia Bacteriana",
};

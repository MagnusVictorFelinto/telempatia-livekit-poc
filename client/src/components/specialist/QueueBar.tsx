import { useNavigate } from "react-router-dom";
import { MOCK_QUEUE } from "../../lib/mockData";

// Barra superior do dashboard do especialista: link para sair da sala e as
// duas filas de atendimento (dados mockados, ver lib/mockData.ts).
export default function QueueBar() {
  const navigate = useNavigate();

  return (
    <div className="queue-bar">
      <button className="queue-exit" onClick={() => navigate("/")}>
        Sair
      </button>

      {MOCK_QUEUE.map((group, idx) => (
        <div className="queue-group" key={group.id} 
        >
          {idx > 0 && <div className="queue-divider" />}
      { group.title.toUpperCase() == 'RETORNO PARA CONCLUSÃO' &&

        <div className="queue-group-header">
            <span className="queue-group-title">{group.title.toUpperCase()}</span>
            <button className={`queue-call-btn queue-call-btn-${group.callButtonVariant}`}>
              Chamar próximo
            </button>
          </div>
          }
          <div className="queue-avatars">
            {group.patients.map((p) => (
              <div className="queue-avatar-item" key={p.id}>
                <div className="queue-avatar" style={{ background: p.color }}>
                  {p.initials}
                </div>
                <span className="queue-avatar-name">{p.name}</span>
              </div>
            ))}
          </div>
          { group.title.toUpperCase() == 'PRIMEIRO ATENDIMENTO' &&
          <div className="queue-group-header">
            <span className="queue-group-title">{group.title.toUpperCase()}</span>
            <button className={`queue-call-btn queue-call-btn-${group.callButtonVariant}`}>
              Chamar próximo
            </button>
          </div>
           }
        </div>
      ))}
    </div>
  );
}

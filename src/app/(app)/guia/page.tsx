import {
  Users,
  HeartHandshake,
  CalendarPlus,
  UserCheck,
  Boxes,
  MessageCircle,
  DoorOpen,
  CheckCircle2,
  BarChart3,
  PartyPopper,
  Star,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import type { LucideIcon } from "lucide-react";

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Users,
    title: "1. Cadastre os pré-adolescentes",
    body: "Uma vez só: nome, nascimento, sexo e responsável (com telefone). Cada um recebe um ID (ex: CF-0042). Depois é só reutilizar a cada culto.",
  },
  {
    icon: HeartHandshake,
    title: "2. Cadastre os voluntários",
    body: "Informe sexo e data de nascimento — são usados para o voluntário poder liderar um grupo (mesmo sexo, idade próxima).",
  },
  {
    icon: CalendarPlus,
    title: "3. Abra o culto",
    body: "Digite a data (dd/mm/aaaa) ou escolha no calendário, e toque no horário da sua unidade. Cada unidade tem seus próprios horários.",
  },
  {
    icon: UserCheck,
    title: "4. Faça o check-in",
    body: "Busque por nome ou ID e registre quem chega. Não encontrou? Cadastre na hora, sem sair da tela.",
  },
  {
    icon: HeartHandshake,
    title: "5. Marque os voluntários presentes",
    body: "Faça isso ANTES de gerar os grupos — a quantidade de grupos segue os voluntários presentes.",
  },
  {
    icon: Boxes,
    title: "6. Gere os pequenos grupos",
    body: "Automático por sexo e idade. Cada grupo ganha um líder voluntário. Você pode mover alguém de grupo pelo ícone de detalhes.",
  },
  {
    icon: MessageCircle,
    title: "7. Notifique os responsáveis",
    body: "Ao fim do culto, avise pelo WhatsApp que o filho está esperando — todos de uma vez ou um por um.",
  },
  {
    icon: DoorOpen,
    title: "8. Libere a saída",
    body: "Quando o responsável chegar, clique em Liberar. O pré-adolescente passa de Presente para Liberado.",
  },
  {
    icon: CheckCircle2,
    title: "9. Encerre o culto",
    body: "Quando todos tiverem sido liberados, toque no ícone de encerrar (✓) no topo da tela — ele só fica ativo depois que ninguém está mais presente. Um admin pode reabrir pelo ícone de cadeado.",
  },
  {
    icon: PartyPopper,
    title: "10. Crie eventos especiais",
    body: "Em Eventos, toque em Novo evento: dê nome, data e horário e escolha se é para todas as unidades ou apenas uma. Serve para ações fora do culto de sempre, como o TocaPlay no Pátio.",
  },
  {
    icon: Star,
    title: "11. Receba no evento — inclusive visitantes",
    body: "No evento a presença é registrada de três formas: buscar quem já é cadastrado, cadastrar um novo (escolhendo a unidade) ou adicionar um visitante, que não pertence a nenhuma unidade. Check-in, liberar, notificar e encerrar funcionam como no culto (encerrar/excluir ficam nos ícones do topo).",
  },
  {
    icon: BarChart3,
    title: "12. Acompanhe os relatórios",
    body: "Veja o crescimento dos pré-adolescentes, o engajamento dos voluntários e a presença por evento (com visitantes) ao longo do tempo.",
  },
];

export default async function GuiaPage() {
  const ctx = await requireSession();

  return (
    <>
      <PageHeader
        title="Guia do TocaPlay"
        subtitle="O passo a passo completo, do cadastro ao encerramento de cultos e eventos."
      />

      <Card className="mb-5">
        <p className="text-sm text-muted">
          Você entrou como{" "}
          <span className="font-semibold text-ink">
            {ROLE_LABELS[ctx.profile.role]}
          </span>
          {ctx.unit ? ` · ${ctx.unit.name}` : " (vê todas as unidades)"}. Admin
          geral gerencia todas as unidades; admin da unidade cuida da sua;
          voluntário faz check-in e grupos.
        </p>
      </Card>

      <ol className="flex flex-col gap-3">
        {STEPS.map((s) => (
          <li key={s.title} className="panel flex items-start gap-4 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-night-700 bg-night-800 text-grass">
              <s.icon className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <h3 className="pixel text-[0.72rem] text-ink">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

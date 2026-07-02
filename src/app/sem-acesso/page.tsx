import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Wordmark } from "@/components/ui/Wordmark";

export default function SemAcessoPage() {
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Wordmark size="md" />
        </div>
        <div className="panel p-6">
          <h1 className="mb-2 font-display text-sm text-orange [word-spacing:-0.15em]">
            Conta sem unidade
          </h1>
          <p className="mb-5 text-sm text-muted">
            Sua conta ainda não foi vinculada a uma unidade. Peça a um líder para
            liberar seu acesso.
          </p>
          <form action={signOut}>
            <Button type="submit" variant="terra" className="w-full">
              Sair
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

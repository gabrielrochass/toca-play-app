import { Suspense } from "react";
import { Wordmark } from "@/components/ui/Wordmark";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm">
        {/* Hero: wordmark over a torch glow */}
        <div className="relative mb-8 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange/20 blur-3xl"
          />
          <div className="relative flex flex-col items-center gap-4">
            <Wordmark size="lg" />
            <p className="font-display text-[0.7rem] leading-relaxed text-muted [word-spacing:-0.1em]">
              Check-in · Igreja Aponte
            </p>
          </div>
        </div>

        <div className="panel p-6">
          <h1 className="mb-1 font-display text-sm text-ink [word-spacing:-0.15em]">
            Entrar
          </h1>
          <p className="mb-5 text-sm text-muted">
            Acesse com sua conta de voluntário ou líder.
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Sem acesso? Fale com o líder da sua unidade.
        </p>
      </div>
    </div>
  );
}

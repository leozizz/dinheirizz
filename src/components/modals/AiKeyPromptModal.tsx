import React from 'react'
import { Sparkles, KeyRound, ExternalLink, X, ShieldCheck } from 'lucide-react'

export interface AiKeyPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onConfigureKey: () => void
}

export const AiKeyPromptModal = ({
  isOpen,
  onClose,
  onConfigureKey
}: AiKeyPromptModalProps) => {
  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-key-modal-title"
      data-testid="ai-key-prompt-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 text-white shadow-2xl space-y-5">
        <button
          type="button"
          data-testid="close-ai-key-modal-btn"
          onClick={onClose}
          aria-label="Fechar modal"
          className="min-h-[44px] min-w-[44px] absolute top-4 right-4 text-white/50 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 id="ai-key-modal-title" className="text-lg font-semibold text-white">
              Chave de IA Necessária
            </h3>
            <p className="text-xs text-white/60">
              Leitura automática de comprovantes com Gemini Multimodal
            </p>
          </div>
        </div>

        <div className="text-sm text-white/80 space-y-3 leading-relaxed">
          <p>
            A extração instantânea de despesas a partir de fotos e PDFs utiliza visão computacional de ponta.
          </p>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <KeyRound className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>100% Gratuito (BYOK):</strong> Você pode gerar uma chave pessoal gratuita no Google AI Studio e adicioná-la nas configurações do Dinheirizz.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Sua chave é criptografada com AES-256-GCM e nunca é compartilhada com terceiros.
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            data-testid="open-ai-settings-btn"
            onClick={() => {
              onClose()
              onConfigureKey()
            }}
            className="min-h-[44px] flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>Cadastrar Chave Gratuita</span>
          </button>

          <button
            type="button"
            data-testid="close-ai-prompt-btn"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium transition-all cursor-pointer"
          >
            Agora Não
          </button>
        </div>
      </div>
    </div>
  )
}

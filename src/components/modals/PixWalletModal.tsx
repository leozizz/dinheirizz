import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, QrCode, Copy, Check, ShieldCheck } from 'lucide-react'

export interface PixKeyItem {
  id: string
  key_type: string
  key_value: string
  bank_name?: string | null
  description?: string | null
}

interface PixWalletModalProps {
  isOpen: boolean
  pixKeys?: PixKeyItem[]
  onClose: () => void
}

export function PixWalletModal({
  isOpen,
  pixKeys = [],
  onClose
}: PixWalletModalProps) {
  const [selectedKeyId, setSelectedKeyId] = useState<string>('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen && pixKeys.length > 0 && !selectedKeyId) {
      setSelectedKeyId(pixKeys[0].id)
    }
    setCopied(false)
  }, [isOpen, pixKeys, selectedKeyId])

  const selectedKey = pixKeys.find((k) => k.id === selectedKeyId) || pixKeys[0]

  const handleCopy = async () => {
    if (!selectedKey) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(selectedKey.key_value)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
    }
  }

  const formatKeyType = (type: string) => {
    switch (type.toLowerCase()) {
      case 'cpf':
        return 'CPF'
      case 'cnpj':
        return 'CNPJ'
      case 'email':
        return 'E-mail'
      case 'phone':
        return 'Telefone'
      default:
        return 'Chave Aleatória'
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-md glass-card p-6 sm:p-8 rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl bg-[#13111c]/95"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-300 shadow-inner">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">
                    Carteira Pix
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Selecione uma chave para receber pagamentos
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="close-pix-modal-btn"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pixKeys.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 text-sm">
                Nenhuma chave Pix cadastrada no momento.
              </div>
            ) : (
              <div className="space-y-5">
                {/* Seletor de Chave */}
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5 ml-1">
                    Chave Ativa
                  </label>
                  <select
                    data-testid="pix-key-select"
                    value={selectedKey?.id}
                    onChange={(e) => {
                      setSelectedKeyId(e.target.value)
                      setCopied(false)
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all [&>option]:bg-[#1a1625]"
                  >
                    {pixKeys.map((key) => (
                      <option key={key.id} value={key.id}>
                        {formatKeyType(key.key_type)} — {key.key_value} ({key.bank_name || 'Conta'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.04] border border-white/10 shadow-inner">
                  <div className="p-3.5 rounded-2xl bg-white shadow-xl mb-3">
                    {/* Visual QR Code Generator */}
                    <svg
                      className="w-36 h-36"
                      viewBox="0 0 100 100"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Standard QR Code corner markers */}
                      <rect x="5" y="5" width="26" height="26" rx="4" fill="#0d0d12" />
                      <rect x="9" y="9" width="18" height="18" rx="2" fill="white" />
                      <rect x="13" y="13" width="10" height="10" rx="1" fill="#0d0d12" />

                      <rect x="69" y="5" width="26" height="26" rx="4" fill="#0d0d12" />
                      <rect x="73" y="9" width="18" height="18" rx="2" fill="white" />
                      <rect x="77" y="13" width="10" height="10" rx="1" fill="#0d0d12" />

                      <rect x="5" y="69" width="26" height="26" rx="4" fill="#0d0d12" />
                      <rect x="9" y="73" width="18" height="18" rx="2" fill="white" />
                      <rect x="13" y="77" width="10" height="10" rx="1" fill="#0d0d12" />

                      {/* Data dots pattern */}
                      <rect x="36" y="8" width="8" height="8" rx="1" fill="#0d0d12" />
                      <rect x="48" y="12" width="6" height="6" rx="1" fill="#0d0d12" />
                      <rect x="58" y="8" width="6" height="6" rx="1" fill="#0d0d12" />

                      <rect x="36" y="24" width="6" height="6" rx="1" fill="#0d0d12" />
                      <rect x="48" y="22" width="8" height="8" rx="1" fill="#0d0d12" />
                      <rect x="40" y="38" width="6" height="6" rx="1" fill="#0d0d12" />
                      <rect x="52" y="38" width="8" height="8" rx="1" fill="#0d0d12" />
                      <rect x="68" y="38" width="6" height="6" rx="1" fill="#0d0d12" />

                      <rect x="8" y="40" width="8" height="8" rx="1" fill="#0d0d12" />
                      <rect x="22" y="44" width="6" height="6" rx="1" fill="#0d0d12" />
                      <rect x="8" y="54" width="6" height="6" rx="1" fill="#0d0d12" />
                      <rect x="22" y="56" width="6" height="6" rx="1" fill="#0d0d12" />

                      <rect x="38" y="52" width="6" height="6" rx="1" fill="#0d0d12" />
                      <rect x="48" y="52" width="12" height="6" rx="1" fill="#0d0d12" />
                      <rect x="68" y="52" width="8" height="8" rx="1" fill="#0d0d12" />
                      <rect x="82" y="52" width="6" height="6" rx="1" fill="#0d0d12" />

                      <rect x="38" y="68" width="8" height="8" rx="1" fill="#0d0d12" />
                      <rect x="52" y="68" width="6" height="6" rx="1" fill="#0d0d12" />
                      <rect x="64" y="68" width="14" height="8" rx="1" fill="#0d0d12" />

                      <rect x="38" y="82" width="6" height="6" rx="1" fill="#0d0d12" />
                      <rect x="48" y="82" width="14" height="6" rx="1" fill="#0d0d12" />
                      <rect x="68" y="82" width="8" height="8" rx="1" fill="#0d0d12" />
                      <rect x="82" y="82" width="6" height="6" rx="1" fill="#0d0d12" />
                    </svg>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                    <span>Pagamento instantâneo protegido</span>
                  </div>
                </div>

                {/* Exibição da Chave e Botão Copiar */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                  <div className="overflow-hidden">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-teal-400 block mb-0.5">
                      {selectedKey && formatKeyType(selectedKey.key_type)}
                    </span>
                    <p data-testid="active-pix-key-value" className="text-sm font-medium text-white truncate">
                      {selectedKey?.key_value}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      copied
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Chave copiada!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Chave Pix</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

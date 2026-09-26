import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, QrCode, Copy, Check, ShieldCheck, Plus, Trash2, KeyRound } from 'lucide-react'

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
  onCreatePixKey?: (data: {
    keyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
    keyValue: string
    bankName?: string
    label?: string
  }) => Promise<void> | void
  onDeletePixKey?: (id: string) => Promise<void> | void
}

export function PixWalletModal({
  isOpen,
  pixKeys = [],
  onClose,
  onCreatePixKey,
  onDeletePixKey
}: PixWalletModalProps) {
  const [activeTab, setActiveTab] = useState<'my_keys' | 'new_key'>('my_keys')
  const [selectedKeyId, setSelectedKeyId] = useState<string>('')
  const [copied, setCopied] = useState(false)

  // Campos do formulário de nova chave
  const [newKeyType, setNewKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>('email')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [newBankName, setNewBankName] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setActiveTab('my_keys')
      setCopied(false)
      setFormError(null)
      setNewKeyValue('')
      setNewBankName('')
      setNewLabel('')
      if (pixKeys.length > 0 && (!selectedKeyId || !pixKeys.some((k) => k.id === selectedKeyId))) {
        setSelectedKeyId(pixKeys[0].id)
      }
    }
  }, [isOpen, pixKeys])

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

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyValue.trim()) {
      setFormError('Informe a chave Pix')
      return
    }

    if (!onCreatePixKey) return

    try {
      setSubmitting(true)
      setFormError(null)
      await onCreatePixKey({
        keyType: newKeyType,
        keyValue: newKeyValue.trim(),
        bankName: newBankName.trim() || undefined,
        label: newLabel.trim() || undefined
      })
      setActiveTab('my_keys')
      setNewKeyValue('')
    } catch (err: any) {
      setFormError(err?.message || 'Falha ao cadastrar chave')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteKey = async (id: string) => {
    if (!onDeletePixKey) return
    try {
      await onDeletePixKey(id)
    } catch {
      // Handled by hook/query
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

          {/* Modal Content com espaçamento confortável */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-md glass-card p-5 sm:p-8 rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl bg-[#13111c]/95 max-h-[88dvh] overflow-y-auto pb-8 sm:pb-9 my-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-inner flex-shrink-0">
                  <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-display">
                    Carteira Pix
                  </h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Selecione uma chave para receber pagamentos
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="close-pix-modal-btn"
                onClick={onClose}
                className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navegação por Abas */}
            <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('my_keys')}
                className={`flex-1 min-h-[40px] py-2 rounded-xl text-xs font-medium transition-colors ${
                  activeTab === 'my_keys'
                    ? 'bg-primary/20 text-primary border border-primary/30 font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                Minhas Chaves
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('new_key')}
                className={`flex-1 min-h-[40px] py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'new_key'
                    ? 'bg-primary/20 text-primary border border-primary/30 font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Chave</span>
              </button>
            </div>

            {activeTab === 'my_keys' ? (
              pixKeys.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  Nenhuma chave Pix cadastrada no momento.
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('new_key')}
                      className="px-4 py-2.5 bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-semibold hover:bg-primary/30 transition-colors"
                    >
                      Cadastrar Primeira Chave
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-5">
                  {/* Seletor de Chave */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 ml-1">
                      <label className="block text-xs font-medium text-muted-foreground">
                        Chave Ativa
                      </label>
                      {selectedKey && onDeletePixKey && (
                        <button
                          type="button"
                          data-testid={`delete-pix-key-${selectedKey.id}`}
                          onClick={() => handleDeleteKey(selectedKey.id)}
                          className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Excluir Chave</span>
                        </button>
                      )}
                    </div>
                    <select
                      data-testid="pix-key-select"
                      value={selectedKey?.id}
                      onChange={(e) => {
                        setSelectedKeyId(e.target.value)
                        setCopied(false)
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all [&>option]:bg-neutral-900"
                    >
                      {pixKeys.map((key) => (
                        <option key={key.id} value={key.id}>
                          {formatKeyType(key.key_type)} — {key.key_value} ({key.bank_name || 'Conta'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* QR Code Container */}
                  <div className="flex flex-col items-center justify-center p-5 sm:p-6 rounded-2xl bg-white/[0.04] border border-white/10 shadow-inner">
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-white shadow-xl mb-3">
                      <svg
                        className="w-32 h-32 sm:w-36 sm:h-36"
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect x="5" y="5" width="26" height="26" rx="4" fill="#0d0d12" />
                        <rect x="9" y="9" width="18" height="18" rx="2" fill="white" />
                        <rect x="13" y="13" width="10" height="10" rx="1" fill="#0d0d12" />

                        <rect x="69" y="5" width="26" height="26" rx="4" fill="#0d0d12" />
                        <rect x="73" y="9" width="18" height="18" rx="2" fill="white" />
                        <rect x="77" y="13" width="10" height="10" rx="1" fill="#0d0d12" />

                        <rect x="5" y="69" width="26" height="26" rx="4" fill="#0d0d12" />
                        <rect x="9" y="73" width="18" height="18" rx="2" fill="white" />
                        <rect x="13" y="77" width="10" height="10" rx="1" fill="#0d0d12" />

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

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      <span>Pagamento instantâneo protegido</span>
                    </div>
                  </div>

                  {/* Exibição da Chave e Botão Copiar */}
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2.5 sm:gap-3">
                    <div className="overflow-hidden min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-primary block mb-0.5">
                        {selectedKey && formatKeyType(selectedKey.key_type)}
                      </span>
                      <p data-testid="active-pix-key-value" className="text-xs sm:text-sm font-medium text-white truncate font-mono">
                        {selectedKey?.key_value}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0 min-h-[40px] active:scale-95 ${
                        copied
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
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
              )
            ) : (
              /* Aba: Nova Chave */
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-white">Cadastrar Nova Chave</h4>
                </div>

                {formError && (
                  <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-rose-300 text-xs">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Tipo de Chave
                  </label>
                  <select
                    value={newKeyType}
                    onChange={(e) => setNewKeyType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent [&>option]:bg-neutral-900"
                  >
                    <option value="cpf">CPF</option>
                    <option value="cnpj">CNPJ</option>
                    <option value="email">E-mail</option>
                    <option value="phone">Telefone (Celular)</option>
                    <option value="random">Chave Aleatória (EVP)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Valor da Chave
                  </label>
                  <input
                    type="text"
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                    placeholder="Digite sua chave Pix (ex: email, CPF...)"
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent placeholder-neutral-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Instituição (opcional)
                    </label>
                    <input
                      type="text"
                      value={newBankName}
                      onChange={(e) => setNewBankName(e.target.value)}
                      placeholder="Ex: Nubank, Inter"
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent placeholder-neutral-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Identificação (opcional)
                    </label>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Ex: Principal"
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent placeholder-neutral-500"
                    />
                  </div>
                </div>

                <div className="pt-4 pb-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('my_keys')}
                    className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl border border-white/10 text-neutral-300 text-xs sm:text-sm font-medium hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-primary/20 active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Salvando...' : 'Salvar Chave'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

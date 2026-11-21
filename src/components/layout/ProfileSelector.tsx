import React, { useState } from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Layers, User, Building2, ChevronDown, Check, Plus, X } from 'lucide-react'
import type { FinancialProfile } from '../../hooks/useWorkspaces'
import type { WorkspaceFormData, WorkspaceType } from '../../schemas/goals'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/Select'
import { cn } from '../../lib/utils'

export interface ProfileSelectorProps {
  profiles: FinancialProfile[]
  selectedProfileId: string
  onSelectProfile: (profileId: string) => void
  onCreateProfile: (data: WorkspaceFormData) => Promise<FinancialProfile | void>
  isCreating?: boolean
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profiles,
  selectedProfileId,
  onSelectProfile,
  onCreateProfile,
  isCreating = false
}) => {
  const [open, setOpen] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<WorkspaceType>('business')
  const [formError, setFormError] = useState<string | null>(null)

  const activeProfile =
    selectedProfileId === 'all'
      ? null
      : (profiles.find((p) => p.id === selectedProfileId) ?? null)

  const renderProfileIcon = (type: WorkspaceType | 'all', className = 'w-4 h-4') => {
    if (type === 'all') return <Layers className={className} />
    if (type === 'business') return <Building2 className={className} />
    return <User className={className} />
  }

  const activeLabel = activeProfile ? activeProfile.name : 'Todos'
  const activeType: WorkspaceType | 'all' = activeProfile ? activeProfile.type : 'all'

  const handleSelect = (id: string) => {
    onSelectProfile(id)
    setOpen(false)
    setShowCreateForm(false)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) {
      setFormError('Informe o nome do perfil')
      return
    }
    if (trimmed.length > 60) {
      setFormError('Máximo de 60 caracteres')
      return
    }

    setFormError(null)
    try {
      const created = await onCreateProfile({
        name: trimmed,
        type: newType,
        currency: 'BRL',
        isDefault: false
      })
      setNewName('')
      setShowCreateForm(false)
      if (created && typeof created === 'object' && 'id' in created) {
        onSelectProfile(created.id)
      }
      setOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar perfil'
      setFormError(msg)
    }
  }

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setShowCreateForm(false)
          setFormError(null)
        }
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          data-testid="header-profile-selector"
          aria-label={`Perfil financeiro ativo: ${activeLabel}`}
          className={cn(
            'min-h-[44px] sm:min-h-[40px] max-w-[132px] sm:max-w-[190px] px-2.5 sm:px-3 rounded-xl glass-card-interactive',
            'flex items-center gap-1.5 sm:gap-2 text-xs font-medium text-foreground border border-border',
            'cursor-pointer active:scale-95 transition-all'
          )}
        >
          <span className="text-primary flex-shrink-0">
            {renderProfileIcon(activeType, 'w-3.5 h-3.5 sm:w-4 sm:h-4')}
          </span>
          <span className="truncate">{activeLabel}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-[70] w-72 max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-xl p-2 space-y-1.5"
        >
          <div className="px-2.5 py-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Contexto Financeiro
            </span>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              data-testid="profile-option-all"
              onClick={() => handleSelect('all')}
              className={cn(
                'w-full min-h-[44px] px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 text-sm transition-colors cursor-pointer',
                selectedProfileId === 'all'
                  ? 'bg-primary/15 text-foreground font-semibold'
                  : 'text-foreground hover:bg-muted/70'
              )}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Layers className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="truncate">Todos os perfis</span>
              </span>
              {selectedProfileId === 'all' && (
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </button>

            {profiles.map((profile) => {
              const isSelected = selectedProfileId === profile.id
              return (
                <button
                  key={profile.id}
                  type="button"
                  data-testid={`profile-option-${profile.id}`}
                  onClick={() => handleSelect(profile.id)}
                  className={cn(
                    'w-full min-h-[44px] px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 text-sm transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-primary/15 text-foreground font-semibold'
                      : 'text-foreground hover:bg-muted/70'
                  )}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="text-muted-foreground flex-shrink-0">
                      {renderProfileIcon(profile.type)}
                    </span>
                    <span className="truncate">{profile.name}</span>
                  </span>
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {profile.type === 'business' ? 'PJ' : 'PF'}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="border-t border-border pt-1.5">
            {!showCreateForm ? (
              <button
                type="button"
                data-testid="profile-create-btn"
                onClick={() => setShowCreateForm(true)}
                className="w-full min-h-[44px] px-2.5 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Perfil</span>
              </button>
            ) : (
              <form onSubmit={handleCreateSubmit} className="p-2 rounded-xl bg-muted/40 border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Novo Perfil</span>
                  <button
                    type="button"
                    aria-label="Cancelar criação de perfil"
                    onClick={() => {
                      setShowCreateForm(false)
                      setFormError(null)
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {formError && (
                  <p className="text-[11px] text-rose-400 font-medium">{formError}</p>
                )}

                <input
                  type="text"
                  data-testid="profile-create-name-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Empresa / PJ"
                  maxLength={60}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-input/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />

                <Select value={newType} onValueChange={(v) => setNewType(v as WorkspaceType)}>
                  <SelectTrigger
                    data-testid="profile-create-type-select"
                    aria-label="Tipo do perfil"
                  >
                    <SelectValue placeholder="Tipo do perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Pessoal (PF)</SelectItem>
                    <SelectItem value="business">Empresa / PJ</SelectItem>
                  </SelectContent>
                </Select>

                <button
                  type="submit"
                  data-testid="profile-create-submit-btn"
                  disabled={isCreating}
                  className="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isCreating ? 'Criando...' : 'Criar Perfil'}
                </button>
              </form>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

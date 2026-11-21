export const normalizeProfileId = (profileId?: string | null): string | null => {
  if (!profileId || profileId === 'all') {
    return null
  }
  return profileId
}

export const appendProfileIdParam = (
  params: URLSearchParams,
  profileId?: string | null
): void => {
  const normalized = normalizeProfileId(profileId)
  if (normalized) {
    params.set('profileId', normalized)
  }
}

export const getApiOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

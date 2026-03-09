import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { getConfig } from '@/lib/client/localstorage'

import type { AppConfig, Collection, QueryResult } from '@/lib/types'

export function useGetConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: getConfig,
    retry: false,
  })
}

function buildSearchParams(config?: AppConfig, extraParams?: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams()

  if (config?.connectionString) {
    searchParams.set('connectionString', config.connectionString)
  }

  if (config?.chromaCliBin) {
    searchParams.set('chromaCliBin', config.chromaCliBin)
  }

  if (config?.connectionMode) {
    searchParams.set('connectionMode', config.connectionMode)
  }

  if (config?.tenant) {
    searchParams.set('tenant', config.tenant)
  }

  if (config?.database) {
    searchParams.set('database', config.database)
  }

  if (config?.authType === 'basic') {
    searchParams.set('authType', 'basic')
    searchParams.set('username', config.username)
    searchParams.set('password', config.password)
  } else if (config?.authType === 'token') {
    searchParams.set('authType', 'token')
    searchParams.set('token', config.token)
  }

  for (const [key, value] of Object.entries(extraParams ?? {})) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value))
    }
  }

  return searchParams.toString()
}

function buildApiUrl(path: string, config?: AppConfig, extraParams?: Record<string, string | number | undefined>) {
  const searchParams = buildSearchParams(config, extraParams)
  return searchParams ? `${path}?${searchParams}` : path
}

export function useGetCollections(config?: AppConfig) {
  return useQuery({
    queryKey: [
      'config',
      config?.connectionMode,
      config?.connectionString,
      config?.tenant,
      config?.database,
      'collections',
    ],
    queryFn: async (): Promise<Collection[]> => {
      const response = await fetch(buildApiUrl('/api/collections', config))
      if (!response.ok) {
        throw new Error(`API getCollections returns response code: ${response.status}, message: ${response.statusText}`)
      }
      return response.json()
    },
    enabled: !!config?.connectionString,
    retry: false,
  })
}

export function useGetCollectionRecords(config?: AppConfig, collectionName?: string, page?: number, query?: string) {
  return useQuery({
    queryKey: [
      'collections',
      config?.connectionMode,
      config?.connectionString,
      config?.tenant,
      config?.database,
      collectionName,
      'records',
      query,
      page,
    ],
    queryFn: async (): Promise<QueryResult> => {
      if (query === undefined || query === '') {
        const response = await fetch(buildApiUrl(`/api/collections/${collectionName}/records`, config, { page }))
        return response.json()
      } else {
        const response = await fetch(buildApiUrl(`/api/collections/${collectionName}/records`, config), {
          method: 'POST',
          body: JSON.stringify({ query: query }),
        })
        return response.json()
      }
    },
    enabled: !!config?.connectionString,
    retry: false,
  })
}

export function useDeleteRecord(collectionName: string) {
  const queryClient = useQueryClient()
  const config = getConfig()

  return useMutation({
    mutationFn: async (recordId: string) => {
      const response = await fetch(buildApiUrl(`/api/collections/${collectionName}/records`, config), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: recordId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete record')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['collections', config?.connectionMode, config?.connectionString] })
    },
  })
}

export function useGetEmbedding() {
  return useMutation({
    mutationFn: async ({ text, modelUrl, model }: { text: string; modelUrl: string; model?: string }) => {
      const response = await fetch('/api/embedding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, modelUrl, model }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get embedding')
      }

      return response.json()
    },
  })
}

export function useDeleteCollection() {
  const queryClient = useQueryClient()
  const config = getConfig()

  return useMutation({
    mutationFn: async (collectionName: string) => {
      const response = await fetch(buildApiUrl('/api/collections', config), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: collectionName }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete collection')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          'config',
          config?.connectionMode,
          config?.connectionString,
          config?.tenant,
          config?.database,
          'collections',
        ],
      })
    },
  })
}

export function useRenameCollection() {
  const queryClient = useQueryClient()
  const config = getConfig()

  return useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      const response = await fetch(buildApiUrl('/api/collections', config), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldName, newName }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to rename collection')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          'config',
          config?.connectionMode,
          config?.connectionString,
          config?.tenant,
          config?.database,
          'collections',
        ],
      })
    },
  })
}

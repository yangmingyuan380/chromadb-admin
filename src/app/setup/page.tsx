'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { IconDatabase } from '@tabler/icons-react'
import { Alert, Button, Container, Group, Paper, Radio, Text, TextInput, Title } from '@mantine/core'

import { useGetConfig } from '@/lib/client/query'
import { updateConfig } from '@/lib/client/localstorage'

import type { ConnectionMode } from '@/lib/types'

export default function SetupPage() {
  const router = useRouter()
  const { data: appConfig } = useGetConfig()
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(appConfig?.connectionMode || 'remote')
  const [connectionString, setConnectionString] = useState(appConfig?.connectionString || '')
  const [chromaCliBin, setChromaCliBin] = useState(appConfig?.chromaCliBin || '')
  const [tenant, setTenant] = useState(appConfig?.tenant || 'default_tenant')
  const [database, setDatabase] = useState(appConfig?.database || 'default_database')
  const [authType, setAuthType] = useState(appConfig?.authType || 'no_auth')
  const [username, setUsername] = useState(appConfig?.username || '')
  const [password, setPassword] = useState(appConfig?.password || '')
  const [token, setToken] = useState(appConfig?.token || '')
  const [embeddingModelUrl, setEmbeddingModelUrl] = useState(appConfig?.embeddingModelUrl || '')
  const [embeddingModel, setEmbeddingModel] = useState(appConfig?.embeddingModel || 'text-embedding-3-small')

  useEffect(() => {
    if (appConfig == null) {
      return
    }

    setConnectionMode(appConfig.connectionMode || 'remote')
    setConnectionString(appConfig.connectionString || '')
    setChromaCliBin(appConfig.chromaCliBin || '')
    setTenant(appConfig.tenant || 'default_tenant')
    setDatabase(appConfig.database || 'default_database')
    setAuthType(appConfig.authType || 'no_auth')
    setUsername(appConfig.username || '')
    setPassword(appConfig.password || '')
    setToken(appConfig.token || '')
    setEmbeddingModelUrl(appConfig.embeddingModelUrl || '')
    setEmbeddingModel(appConfig.embeddingModel || 'text-embedding-3-small')
  }, [appConfig])

  const queryClient = useQueryClient()

  const connectButtonClicked = () => {
    let formattedConnectionString = connectionString.trim()

    if (formattedConnectionString.length === 0) {
      alert(
        connectionMode === 'local'
          ? 'Please enter the local Chroma persistence directory.'
          : 'Please enter the Chroma server URL.'
      )
      return
    }

    if (connectionMode === 'remote') {
      try {
        if (!formattedConnectionString.startsWith('http://') && !formattedConnectionString.startsWith('https://')) {
          formattedConnectionString = 'http://' + formattedConnectionString
        }

        const url = new URL(formattedConnectionString)

        if (!url.port) {
          url.port = '8000'
          formattedConnectionString = url.toString()
        }

        formattedConnectionString = formattedConnectionString.replace(/\/$/, '')
      } catch (error) {
        console.error(error)
        alert('Invalid server URL format. Please use http://hostname:port or https://hostname:port')
        return
      }
    }

    updateConfig({
      connectionMode,
      connectionString: formattedConnectionString,
      chromaCliBin: connectionMode === 'local' ? chromaCliBin.trim() : '',
      authType: connectionMode === 'local' ? 'no_auth' : authType,
      username: connectionMode === 'local' ? '' : username,
      password: connectionMode === 'local' ? '' : password,
      token: connectionMode === 'local' ? '' : token,
      currentCollection: '',
      tenant,
      database,
      embeddingModelUrl,
      embeddingModel,
    })
    queryClient.setQueryData(['config'], {
      connectionMode,
      connectionString: formattedConnectionString,
      chromaCliBin: connectionMode === 'local' ? chromaCliBin.trim() : '',
      authType: connectionMode === 'local' ? 'no_auth' : authType,
      username: connectionMode === 'local' ? '' : username,
      password: connectionMode === 'local' ? '' : password,
      token: connectionMode === 'local' ? '' : token,
      currentCollection: '',
      tenant,
      database,
      embeddingModelUrl,
      embeddingModel,
    })
    router.push('/collections')
  }

  const backButtonClicked = () => {
    router.push('/collections')
  }

  return (
    <Container size={460} my={30}>
      <Title order={1} ta="center">
        Chromadb Admin
      </Title>
      <Paper withBorder shadow="md" p={30} radius="md" mt="xl">
        <Radio.Group
          label="Connection Mode"
          value={connectionMode}
          onChange={value => setConnectionMode(value as ConnectionMode)}
        >
          <Group mt="xs">
            <Radio value="remote" label="Remote Server URL" />
            <Radio value="local" label="Local Persistent Directory" />
          </Group>
        </Radio.Group>
        {connectionMode === 'local' && (
          <Alert icon={<IconDatabase size={16} />} mt="md" color="blue" variant="light">
            <Text size="sm">
              The JavaScript SDK cannot open a local embedded directory directly. In this mode, the server will try to
              run <code>chroma run --path ...</code> to start a temporary loopback-only bridge service.
            </Text>
          </Alert>
        )}
        <TextInput
          label={connectionMode === 'local' ? 'Local Chroma Directory' : 'Chroma connection string'}
          description={
            connectionMode === 'local'
              ? 'For example, /Users/you/chroma-data or ./chroma; the directory must contain chroma.sqlite3.'
              : 'For example, http://localhost:8000'
          }
          placeholder={connectionMode === 'local' ? '/Users/you/chroma-data' : 'http://localhost:8000'}
          value={connectionString}
          onChange={e => setConnectionString(e.currentTarget.value)}
          mt="md"
        />
        {connectionMode === 'local' && (
          <TextInput
            label="Chroma CLI Path"
            description="Optional. Enter the path to the chroma executable. If empty, it falls back to CHROMA_CLI_BIN or PATH."
            placeholder="/Users/rick2/code/nodejs/fxs-bitbucket-review/node_modules/.bin/chroma"
            value={chromaCliBin}
            onChange={e => setChromaCliBin(e.currentTarget.value)}
            mt="md"
          />
        )}
        <TextInput
          label="Tenant"
          description="The tenant to set."
          placeholder="default_tenant"
          value={tenant}
          onChange={e => setTenant(e.currentTarget.value)}
        />
        <TextInput
          label="Database"
          description="The database to set."
          placeholder="default_database"
          value={database}
          onChange={e => setDatabase(e.currentTarget.value)}
        />
        <TextInput
          label="Embedding Model URL (Optional)"
          description="Supports full endpoint or base URL. LM Studio: http://localhost:1234/v1/embeddings | Ollama (OpenAI mode): http://localhost:11434/v1 | Ollama (native): http://localhost:11434/api/embeddings"
          placeholder="http://localhost:1234/v1/embeddings"
          value={embeddingModelUrl}
          onChange={e => setEmbeddingModelUrl(e.currentTarget.value)}
          mt="md"
        />
        <TextInput
          label="Embedding Model (Optional)"
          description="Model name, e.g.: text-embedding-3-small (OpenAI/LM Studio) or llama2 (Ollama)"
          placeholder="text-embedding-3-small"
          value={embeddingModel}
          onChange={e => setEmbeddingModel(e.currentTarget.value)}
          mt="md"
        />
        {connectionMode === 'remote' && (
          <>
            <Radio.Group label="Authentication Type" value={authType} onChange={setAuthType} mt="md">
              <Group mt="xs">
                <Radio value="no_auth" label="No Auth" />
                <Radio value="token" label="Token" />
                <Radio value="basic" label="Basic" />
              </Group>
            </Radio.Group>
            {authType === 'token' && (
              <TextInput
                label="Token"
                placeholder="Enter your token"
                mt="md"
                value={token}
                onChange={e => setToken(e.currentTarget.value)}
              />
            )}
            {authType === 'basic' && (
              <div>
                <TextInput
                  label="Username"
                  placeholder="Enter your username"
                  mt="md"
                  value={username}
                  onChange={e => setUsername(e.currentTarget.value)}
                />
                <TextInput
                  label="Password"
                  placeholder="Enter your password"
                  mt="md"
                  value={password}
                  onChange={e => setPassword(e.currentTarget.value)}
                  type="password"
                />
              </div>
            )}
          </>
        )}
        <Group mt="lg" justify="flex-end">
          {appConfig?.connectionString && (
            <Button variant="default" onClick={backButtonClicked}>
              Back
            </Button>
          )}
          <Button onClick={connectButtonClicked}>Connect</Button>
        </Group>
      </Paper>
    </Container>
  )
}

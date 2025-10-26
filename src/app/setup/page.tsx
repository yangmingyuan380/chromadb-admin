'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Container, Title, Paper, TextInput, Group, Button, Radio } from '@mantine/core'

import { useGetConfig } from '@/lib/client/query'
import { updateConfig } from '@/lib/client/localstorage'

export default function SetupPage() {
  const router = useRouter()
  const { data: appConfig } = useGetConfig()
  const [connectionString, setConnectionString] = useState(appConfig?.connectionString || '')
  const [tenant, setTenant] = useState(appConfig?.tenant || 'default_tenant')
  const [database, setDatabase] = useState(appConfig?.database || 'default_database')
  const [authType, setAuthType] = useState(appConfig?.authType || 'no_auth')
  const [username, setUsername] = useState(appConfig?.username || '')
  const [password, setPassword] = useState(appConfig?.password || '')
  const [token, setToken] = useState(appConfig?.token || '')
  const [embeddingModelUrl, setEmbeddingModelUrl] = useState(appConfig?.embeddingModelUrl || '')
  const [embeddingModel, setEmbeddingModel] = useState(appConfig?.embeddingModel || 'text-embedding-3-small')

  useEffect(() => {
    if (appConfig != null && appConfig.connectionString) {
      setConnectionString(appConfig.connectionString)
    }
  }, [appConfig])

  const queryClient = useQueryClient()

  const connectButtonClicked = () => {
    let formattedConnectionString = connectionString.trim()

    try {
      // Add http:// if no protocol specified
      if (!formattedConnectionString.startsWith('http://') && !formattedConnectionString.startsWith('https://')) {
        formattedConnectionString = 'http://' + formattedConnectionString
      }

      // Parse the URL
      const url = new URL(formattedConnectionString)

      // If no port specified, add default port 8000
      if (!url.port) {
        url.port = '8000'
        formattedConnectionString = url.toString()
      }

      // Remove trailing slash if exists
      formattedConnectionString = formattedConnectionString.replace(/\/$/, '')
    } catch (error) {
      console.error(error)
      alert('Invalid connection string format. Please use format: http://hostname:port or https://hostname:port')
      return
    }

    updateConfig({
      connectionString: formattedConnectionString,
      authType,
      username,
      password,
      token,
      currentCollection: '',
      tenant,
      database,
      embeddingModelUrl,
      embeddingModel,
    })
    queryClient.setQueryData(['config'], {
      connectionString: formattedConnectionString,
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
        <TextInput
          label="Chroma connection string"
          description="For example, http://localhost:8000"
          placeholder="http://localhost:8000"
          value={connectionString}
          onChange={e => setConnectionString(e.currentTarget.value)}
        />
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

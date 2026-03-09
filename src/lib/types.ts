export type ConnectionMode = 'remote' | 'local'

export type AppConfig = {
  connectionMode: ConnectionMode
  connectionString: string
  chromaCliBin: string
  currentCollection: string
  authType: string
  token: string
  username: string
  password: string
  tenant: string
  database: string
  embeddingModelUrl: string
  embeddingModel: string
}

export type Collection = string

export type Record = {
  id: string
  document: string
  metadata: { source: string }
  embedding: number[]
  distance: number
}

export type RecordsPage = {
  total: number
  page: number
  records: Record[]
}

export type ErrorResponse = {
  error: string
}

export type QueryResult = RecordsPage | ErrorResponse

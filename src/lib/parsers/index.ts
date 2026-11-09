import type { ParsedStatementResult } from '../../types/import'
import { parseOFX } from './ofx'
import { parseCSV } from './csv'
import { parsePDF } from './pdf'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

const readFileAsText = async (file: File): Promise<string> => {
  if (typeof file.text === 'function') {
    return file.text()
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Erro ao ler o conteúdo do arquivo.'))
    reader.readAsText(file)
  })
}

export const parseStatementFile = async (file: File): Promise<ParsedStatementResult> => {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Arquivo muito grande. O limite máximo permitido para importação é 10MB.')
  }

  const fileName = file.name.toLowerCase()

  const isOfx = fileName.endsWith('.ofx')
  const isCsv = fileName.endsWith('.csv') || fileName.endsWith('.tsv') || fileName.endsWith('.txt')
  const isPdf = fileName.endsWith('.pdf')

  if (!isOfx && !isCsv && !isPdf) {
    throw new Error('Formato de arquivo não suportado. Por favor, envie um arquivo .ofx, .csv ou .pdf.')
  }

  const content = await readFileAsText(file)

  if (isOfx) {
    return parseOFX(content, file.name)
  }

  if (isCsv) {
    return parseCSV(content, file.name)
  }

  return parsePDF(content, file.name)
}

export { parseOFX, parseCSV, parsePDF }

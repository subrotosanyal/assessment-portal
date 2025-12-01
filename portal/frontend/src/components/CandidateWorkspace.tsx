import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge, Box, Button, Divider, Flex, HStack, IconButton, Input, Stack, Tag, Text, Textarea, VStack, useToast
} from '@chakra-ui/react'
import { AddIcon, AttachmentIcon, CheckIcon, DeleteIcon, HamburgerIcon } from '@chakra-ui/icons'
import JSZip from 'jszip'
import { API_BASE } from '../config'

type FileEntry = { path: string; content: string }

type SyntaxStatus = { status: 'ok' | 'error'; message?: string }

type Props = {
  assignmentId: string
  onArchiveReady: (path: string) => void
  onVerify: (path: string) => void
  verifyLoading: boolean
}

const starterFiles: FileEntry[] = []

function normalizePath(raw: string) {
  return raw.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '').trim()
}

export default function CandidateWorkspace({ assignmentId, onArchiveReady, onVerify, verifyLoading }: Props) {
  const [files, setFiles] = useState<FileEntry[]>(starterFiles)
  const [folders, setFolders] = useState<string[]>([''])
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [selected, setSelected] = useState<string>('')
  const [newFile, setNewFile] = useState('')
  const [newFolder, setNewFolder] = useState('')
  const [archivePath, setArchivePath] = useState('')
  const [archiveName, setArchiveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [syntax, setSyntax] = useState<Record<string, SyntaxStatus>>({})
  const [importing, setImporting] = useState(false)
  const toast = useToast()
  const tsModule = useRef<any>(null)
  const importRef = useRef<HTMLInputElement | null>(null)

  const current = useMemo(() => files.find(f => f.path === selected), [files, selected])
  const lineNumbers = useMemo(() => (current?.content || '').split('\n').map((_, i) => i + 1), [current?.content])

  useEffect(() => {
    if (!files.length) {
      setSelected('')
      return
    }
    if (!selected || !files.some(f => f.path === selected)) {
      setSelected(files[0].path)
    }
  }, [files, selected])

  const folderFiles = useMemo(() => {
    const base = normalizePath(selectedFolder)
    return files.filter(f => {
      const p = normalizePath(f.path)
      if (!base) return true
      return p === base || p.startsWith(`${base}/`)
    })
  }, [files, selectedFolder])

  const ensureFolder = (folderPath: string) => {
    const clean = normalizePath(folderPath)
    if (!folders.includes(clean)) setFolders(prev => [...prev, clean])
  }

  const addFolder = () => {
    const clean = normalizePath(newFolder)
    if (!clean) return
    if (clean.includes('..')) {
      toast({ title: 'Invalid folder', description: 'Use relative folders without ..', status: 'warning' })
      return
    }
    if (folders.includes(clean)) {
      toast({ title: 'Folder already exists', status: 'info' })
      return
    }
    setFolders(prev => [...prev, clean])
    setSelectedFolder(clean)
    setNewFolder('')
  }

  const addFile = () => {
    const cleanName = normalizePath(newFile)
    if (!cleanName) return
    if (cleanName.includes('..')) {
      toast({ title: 'Invalid path', description: 'Use relative paths without ..', status: 'warning' })
      return
    }
    const base = normalizePath(selectedFolder)
    const full = base ? `${base}/${cleanName}` : cleanName
    if (files.some(f => normalizePath(f.path) === full)) {
      toast({ title: 'File already exists', status: 'info' })
      return
    }
    ensureFolder(base)
    const updated = [...files, { path: full, content: '' }]
    setFiles(updated)
    setSelected(full)
    setNewFile('')
  }


  const removeFile = (path: string) => {
    const remaining = files.filter(f => f.path !== path)
    setFiles(remaining)
    setSelected(remaining[0]?.path || '')
    setSyntax(prev => {
      const clone = { ...prev }
      delete clone[path]
      return clone
    })
  }

  const setContent = (path: string, content: string) => {
    setFiles(prev => prev.map(f => f.path === path ? { ...f, content } : f))
    runSyntax(path, content)
  }

  const loadTs = async () => {
    if (!tsModule.current) {
      tsModule.current = await import('typescript')
    }
    return tsModule.current
  }

  const runSyntax = async (path: string, content: string) => {
    const lower = path.toLowerCase()
    try {
      if (lower.endsWith('.json')) {
        JSON.parse(content || '{}')
        setSyntax(s => ({ ...s, [path]: { status: 'ok' } }))
        return
      }
      if (lower.endsWith('.ts') || lower.endsWith('.tsx')) {
        const ts = await loadTs()
        const out = ts.transpileModule(content || '', { compilerOptions: { jsx: ts.JsxEmit.React }, reportDiagnostics: true })
        if (out.diagnostics?.length) {
          const diag = out.diagnostics[0]
          const msg = ts.flattenDiagnosticMessageText(diag.messageText, '\n')
          const offset = diag.start ?? 0
          const snippet = content.slice(0, offset)
          const line = snippet.split('\n').length
          const col = offset - snippet.lastIndexOf('\n')
          setSyntax(s => ({ ...s, [path]: { status: 'error', message: `Line ${line}, Col ${col}: ${msg}` } }))
          return
        }
        setSyntax(s => ({ ...s, [path]: { status: 'ok' } }))
        return
      }
      if (lower.endsWith('.js') || lower.endsWith('.jsx')) {
        // Basic syntax check for JS
        // eslint-disable-next-line no-new-func
        new Function(content || '')
        setSyntax(s => ({ ...s, [path]: { status: 'ok' } }))
        return
      }
      setSyntax(s => ({ ...s, [path]: { status: 'ok' } }))
    } catch (e: any) {
      setSyntax(s => ({ ...s, [path]: { status: 'error', message: e?.message || 'Syntax error' } }))
    }
  }

  useEffect(() => {
    if (current) runSyntax(current.path, current.content)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const importZip = async (file: File) => {
    setImporting(true)
    try {
      const buf = await file.arrayBuffer()
      const zip = await JSZip.loadAsync(buf)
      const entries = Object.values(zip.files)
      const imported: FileEntry[] = []
      for (const entry of entries) {
        if (entry.dir) continue
        const rel = normalizePath(entry.name)
        if (!rel) continue
        const content = await entry.async('string')
        imported.push({ path: rel, content })
        const folderPart = rel.includes('/') ? rel.split('/').slice(0, -1).join('/') : ''
        if (folderPart) ensureFolder(folderPart)
      }
      if (!imported.length) {
        toast({ title: 'No files imported', description: 'Zip did not contain files.', status: 'warning' })
        return
      }
      setFiles(imported)
      setSelected(imported[0].path)
      toast({ title: 'Imported from zip', description: `${imported.length} files loaded`, status: 'success' })
    } catch (e: any) {
      toast({ title: 'Import failed', description: e?.message, status: 'error' })
    } finally {
      setImporting(false)
    }
  }

  const createArchive = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/candidate/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, files })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Could not build archive')
      setArchivePath(data.path)
      setArchiveName(data.name)
      onArchiveReady(data.path)
      toast({ title: 'Archive created', description: data.name, status: 'success' })
    } catch (e: any) {
      toast({ title: 'Archive failed', description: e?.message, status: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box borderWidth="1px" rounded="md" p={4} mb={6} w="full" maxW="full">
      <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} mb={3} flexDir={{ base: 'column', md: 'row' }} gap={2}>
        <Box>
          <Text fontWeight="bold">Candidate workspace</Text>
          <Text fontSize="sm" color="gray.500">Import a zip or create folders/files, then build an archive to grade.</Text>
          <HStack spacing={2} mt={1} flexWrap="wrap">
            <Tag size="sm" colorScheme="purple">{files.length} file{files.length === 1 ? '' : 's'}</Tag>
            {archiveName && <Tag size="sm" colorScheme="green">Archive ready</Tag>}
          </HStack>
        </Box>
        <HStack spacing={2}>
          <input
            ref={importRef}
            type="file"
            accept=".zip"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && importZip(e.target.files[0])}
          />
          <Button size="sm" leftIcon={<AttachmentIcon />} onClick={() => importRef.current?.click()} isLoading={importing}>
            Import zip as starter
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setFiles([]); setSelected(''); setFolders(['']); setSelectedFolder(''); toast({ title: 'Workspace reset', status: 'info' })}}>
            Reset workspace
          </Button>
        </HStack>
      </Flex>

      <Stack direction={{ base: 'column', md: 'row' }} spacing={4} align="stretch">
        <VStack align="stretch" minW={{ base: '100%', md: '38%' }} spacing={3}>
          <Flex gap={2}>
            <Input size="sm" placeholder="Add folder (e.g. tests or src/utils)" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} />
            <IconButton aria-label="Add folder" icon={<AddIcon />} onClick={addFolder} colorScheme="purple" size="sm" />
          </Flex>
          <Flex gap={2}>
            <Input size="sm" placeholder="Add file (e.g. portal.spec.ts)" value={newFile} onChange={(e) => setNewFile(e.target.value)} />
            <IconButton aria-label="Add file" icon={<AddIcon />} onClick={addFile} colorScheme="blue" size="sm" />
          </Flex>


          <Box borderWidth="1px" rounded="md" p={2} bg="gray.50">
            <Text fontWeight="semibold" mb={2}>Folders</Text>
            <VStack align="stretch" spacing={1} maxH="260px" overflowY="auto">
              {folders.map(f => (
                <Button
                  key={f || 'root'}
                  variant={f === selectedFolder ? 'solid' : 'ghost'}
                  colorScheme="purple"
                  size="sm"
                  justifyContent="space-between"
                  onClick={() => setSelectedFolder(f)}
                  leftIcon={<HamburgerIcon />}
                >
                  {f || '/'} <Tag size="sm" colorScheme="gray">{files.filter(fl => normalizePath(fl.path).startsWith(f ? `${f}/` : '') || normalizePath(fl.path) === f).length}</Tag>
                </Button>
              ))}
            </VStack>
          </Box>

          <Box borderWidth="1px" rounded="md" p={2} bg="gray.50">
            <Text fontWeight="semibold" mb={2}>Files</Text>
            <VStack align="stretch" spacing={1} maxH="320px" overflowY="auto">
              {folderFiles.map(f => (
                <Flex key={f.path} align="center" justify="space-between" borderWidth="1px" rounded="md" p={2} bg={f.path === selected ? 'purple.50' : 'white'}>
                  <Button variant="link" textAlign="left" onClick={() => setSelected(f.path)} colorScheme="purple">
                    {f.path}
                  </Button>
                  <HStack>
                    {syntax[f.path]?.status === 'error' && <Tag colorScheme="red" size="sm">Needs fix</Tag>}
                    {syntax[f.path]?.status === 'ok' && <Tag colorScheme="green" size="sm">OK</Tag>}
                    <IconButton size="xs" aria-label="Delete file" icon={<DeleteIcon />} variant="ghost" colorScheme="red" onClick={() => removeFile(f.path)} />
                  </HStack>
                </Flex>
              ))}
              {!folderFiles.length && <Text fontSize="sm" color="gray.500">No files in this folder.</Text>}
            </VStack>
          </Box>
        </VStack>

        <Box flex="1" borderWidth="1px" rounded="md" p={3} bg="gray.50" minH="320px">
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="semibold">{current?.path || 'No file selected'}</Text>
            {syntax[current?.path || ''] && (
              <Badge colorScheme={syntax[current!.path].status === 'ok' ? 'green' : 'red'}>
                {syntax[current!.path].status === 'ok' ? 'Syntax OK' : 'Syntax error'}
              </Badge>
            )}
          </HStack>
          <Flex borderWidth="1px" rounded="md" overflow="hidden" bg="white" minH="260px">
            <Box w="52px" bg="gray.100" color="gray.600" textAlign="right" pr={2} pl={1} borderRight="1px solid #e2e8f0" fontFamily="monospace" fontSize="sm">
              {lineNumbers.map(n => <Text key={n} lineHeight="1.6">{n}</Text>)}
            </Box>
            <Textarea
              value={current?.content || ''}
              onChange={(e) => current && setContent(current.path, e.target.value)}
              minH="260px"
              fontFamily="monospace"
              resize="vertical"
              border="none"
              _focus={{ boxShadow: 'none' }}
            />
          </Flex>
          {syntax[current?.path || '']?.status === 'error' && (
            <Text mt={2} color="red.500" fontSize="sm">{syntax[current!.path].message}</Text>
          )}
        </Box>
      </Stack>

      <Divider my={4} />
      <HStack spacing={3} justify="flex-end" align="center" flexWrap="wrap">
        {archiveName && <Tag colorScheme="gray" size="md" icon={<CheckIcon /> as any}>Latest archive: {archiveName}</Tag>}
        <Button onClick={createArchive} colorScheme="blue" isLoading={saving} leftIcon={<AttachmentIcon />}>Create archive</Button>
        <Button onClick={() => archivePath && onVerify(archivePath)} colorScheme="green" isDisabled={!archivePath} isLoading={verifyLoading}>Grade this archive</Button>
      </HStack>
    </Box>
  )
}

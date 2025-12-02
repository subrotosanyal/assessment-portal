import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Heading, Text, Button, Input, VStack, Collapse, Textarea, useToast, Code, Badge, HStack, Alert, AlertIcon, AlertDescription, Flex } from '@chakra-ui/react'
import { io } from 'socket.io-client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import { API_BASE, SOCKET_URL } from '../config'
import { useRole } from '../role'
import CandidateWorkspace from '../components/CandidateWorkspace'
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'

const socket = io(SOCKET_URL)

export default function AssignmentDetail() {
  const { id } = useParams()
  const { role } = useRole()
  const [docs, setDocs] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [enabled, setEnabled] = useState(true)
  const mdRef = useRef<HTMLDivElement | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadedPath, setUploadedPath] = useState<string>('')
  const [logs, setLogs] = useState('')
  const [open, setOpen] = useState(false)
  const [instructionsOpen, setInstructionsOpen] = useState(true)
  const [result, setResult] = useState<any>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [runLoading, setRunLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    // Fetch assignment docs
    fetch(`${API_BASE}/api/assignments/${id}/docs`).then(async r => {
      if (r.ok) setDocs(await r.text())
    })

    // Fetch assignments list to get the title for this id
    fetch(`${API_BASE}/api/assignments`).then(async r => {
      if (!r.ok) return
      try {
        const items = await r.json()
        const item = items.find((it:any) => it.id === id)
        if (item && item.title) setTitle(item.title)
        if (item && item.type) setType(item.type)
        if (item) setEnabled(item.enabled !== false)
      } catch (e) {
        // ignore
      }
    })
  }, [id])

  useEffect(() => {
    socket.on('log', (msg) => setLogs(prev => prev + msg))
    socket.on('result', (r) => setResult(r))
    socket.on('done', () => {
      setRunLoading(false)
      toast({ title: 'Grading finished', status: 'success' })
    })
    return () => { socket.off('log'); socket.off('result'); socket.off('done'); }
  }, [])

  const upload = async () => {
    if (!file) return
    setUploadLoading(true)
    try {
      const fd = new FormData()
      fd.append('submission', file)
      const res = await fetch(`${API_BASE}/api/assignments/${id}/upload`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Upload failed')
      }
      const resolvedPath = data?.path || data?.file || data?.uploadedPath
      if (!resolvedPath) {
        throw new Error('Upload succeeded but no path returned from server')
      }
      setUploadedPath(String(resolvedPath))
      toast({ title: 'Upload complete', description: resolvedPath, status: 'info' })
    } catch (e:any) {
      toast({ title: 'Upload failed', status: 'error', description: e?.message })
    } finally {
      setUploadLoading(false)
    }
  }

  const normalizePath = (p: any) => {
    if (!p) return ''
    if (typeof p === 'string') return p
    if (typeof p === 'object' && typeof p.path === 'string') return p.path
    return ''
  }

  const run = async (pathOverride?: any) => {
    const path = normalizePath(pathOverride || uploadedPath)
    if (!path) { toast({ title: 'Upload a zip first', status: 'warning' }); return; }
    const safePath = String(path)
    setRunLoading(true)
    setLogs('')
    setOpen(true)
    setResult(null)
    try {
      await fetch(`${API_BASE}/api/assignments/${id}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: safePath, socketId: socket.id })
      })
    } catch (e:any) {
      toast({ title: 'Could not start grader', status: 'error', description: e?.message })
      setRunLoading(false)
    }
  }

  const downloadPdf = async () => {
    const el = mdRef.current
    if (!el) {
      toast({ title: 'Nothing to export', status: 'warning' })
      return
    }
    setPdfLoading(true)
    try {
      const mod = await import('html2pdf.js')
      const html2pdf = (mod && (mod.default || mod)) as any
      const opts = {
        margin: 12,
        filename: `${(title || id)}-instructions.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }
      await html2pdf().set(opts).from(el).save()
      toast({ title: 'PDF saved', status: 'success' })
    } catch (e:any) {
      console.error(e)
      toast({ title: 'Could not create PDF', status: 'error', description: e?.message })
    } finally {
      setPdfLoading(false)
    }
  }

  const disabledActions = enabled === false

  const titleBlock = useMemo(() => (
    <HStack align="center" spacing={3} mb={2}>
      <Heading size="lg">{title || id}</Heading>
      {type && <Badge colorScheme="purple" fontSize="0.85em">{type}</Badge>}
      {!enabled && (
        <Badge colorScheme="red" variant="outline">Disabled</Badge>
      )}
    </HStack>
  ), [title, id, type, enabled])

  return (
    <Box py={8}>
      {titleBlock}
      {!enabled && (
        <Alert status="warning" mb={4} borderRadius="md">
          <AlertIcon />
          <AlertDescription>This assignment is currently disabled. You can still preview instructions.</AlertDescription>
        </Alert>
      )}
      <Box mb={6} p={4} borderWidth="1px" rounded="md">
        <Flex align="center" justify="space-between" gap={3} flexWrap="wrap">
          <Heading size="sm">Instructions</Heading>
          <HStack spacing={2}>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={instructionsOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
              onClick={() => setInstructionsOpen((v) => !v)}
            >
              {instructionsOpen ? 'Hide' : 'Show'}
            </Button>
            <Button size="sm" colorScheme="purple" onClick={downloadPdf} isLoading={pdfLoading}>Download PDF</Button>
          </HStack>
        </Flex>
        <Collapse in={instructionsOpen} animateOpacity>
          <Box mt={3} className="markdown-body" ref={mdRef}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize, rehypeHighlight]}
              components={{
                h1: ({node, ...props}) => <Heading as="h1" size="lg" my={4} {...props} />,
                h2: ({node, ...props}) => <Heading as="h2" size="md" my={3} {...props} />,
                h3: ({node, ...props}) => <Heading as="h3" size="sm" my={2} {...props} />,
                p: ({node, ...props}) => <Text mt={2} {...props} />,
                code: ({node, inline, className, children, ...props}) => {
                  if (inline) return <Code {...props} fontSize="0.85em">{children}</Code>
                  return (
                    <Box as="pre" bg="gray.800" color="green.200" p={3} rounded="md" overflowX="auto">
                      <code className={className} {...props}>{children}</code>
                    </Box>
                  )
                },
                a: ({node, ...props}) => <Text as="a" color="blue.400" {...props} />,
                li: ({node, ...props}) => <Box as="li" ml={4} {...props} />
              }}
            >
              {docs || ''}
            </ReactMarkdown>
          </Box>
        </Collapse>
      </Box>

      {role === 'candidate' && id && (
        <CandidateWorkspace
          assignmentId={id}
          onArchiveReady={(path) => setUploadedPath(path)}
          onVerify={(path) => run(path)}
          verifyLoading={runLoading}
        />
      )}

      <VStack align="stretch" spacing={3} mb={4}>
        <Input type="file" accept=".zip" onChange={(e) => setFile(e.target.files?.[0] || null)} isDisabled={disabledActions} />
        <Button colorScheme="blue" onClick={upload} isDisabled={disabledActions || uploadLoading} isLoading={uploadLoading} loadingText="Uploading...">Upload</Button>
        {uploadedPath && <Text fontSize="sm" color="gray.600">Uploaded archive: {uploadedPath}</Text>}
        <Button colorScheme="green" onClick={() => run()} isDisabled={disabledActions || runLoading} isLoading={runLoading} loadingText="Grading...">Run grader</Button>
      </VStack>

      <Collapse in={open}>
        <Box p={3} bg="gray.900" color="green.200" rounded="md">
          <Textarea value={logs} readOnly height="320px" fontFamily="monospace" />
        </Box>
      </Collapse>

      {result && (
        <Box mt={4} p={3} borderWidth="1px" rounded="md">
          <Heading size="sm">Result</Heading>
          {result.resultPath && (
            <Text mt={2}>Results: <a href={result.resultPath} target="_blank" rel="noopener noreferrer">{result.resultPath}</a></Text>
          )}
          <Text mt={2}>Score: {result.score}</Text>
          {result.sections?.map((s:any) => (
            <Text key={s.name}>{s.name}: {s.score}/{s.max}</Text>
          ))}
          <Text mt={2}>{result.feedback}</Text>
        </Box>
      )}
    </Box>
  )
}

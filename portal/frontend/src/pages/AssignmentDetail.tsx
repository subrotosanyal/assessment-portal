import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Heading, Text, Button, Input, VStack, Collapse, Textarea, useToast, Code } from '@chakra-ui/react'
import { io } from 'socket.io-client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'

const socket = io('http://localhost:4000')

export default function AssignmentDetail() {
  const { id } = useParams()
  const [docs, setDocs] = useState('')
  const [title, setTitle] = useState('')
  const mdRef = useRef<HTMLDivElement | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadedPath, setUploadedPath] = useState<string>('')
  const [logs, setLogs] = useState('')
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<any>(null)
  const toast = useToast()

  useEffect(() => {
    // Fetch assignment docs
    fetch(`http://localhost:4000/api/assignments/${id}/docs`).then(async r => {
      if (r.ok) setDocs(await r.text())
    })

    // Fetch assignments list to get the title for this id
    fetch('http://localhost:4000/api/assignments').then(async r => {
      if (!r.ok) return
      try {
        const items = await r.json()
        const item = items.find((it:any) => it.id === id)
        if (item && item.title) setTitle(item.title)
      } catch (e) {
        // ignore
      }
    })
  }, [id])

  useEffect(() => {
    socket.on('log', (msg) => setLogs(prev => prev + msg))
    socket.on('result', (r) => setResult(r))
    socket.on('done', () => toast({ title: 'Grading finished', status: 'success' }))
    return () => { socket.off('log'); socket.off('result'); socket.off('done'); }
  }, [])

  const upload = async () => {
    if (!file) return
    const fd = new FormData()
    fd.append('submission', file)
    const res = await fetch(`http://localhost:4000/api/assignments/${id}/upload`, { method: 'POST', body: fd })
    const data = await res.json()
    setUploadedPath(data.path)
    toast({ title: 'Upload complete', status: 'info' })
  }

  const run = async () => {
    if (!uploadedPath) { toast({ title: 'Upload a zip first', status: 'warning' }); return; }
    setLogs('')
    setOpen(true)
    setResult(null)
    await fetch(`http://localhost:4000/api/assignments/${id}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: uploadedPath, socketId: socket.id })
    })
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

  return (
    <Box py={8}>
  <Heading mb={4}>{title || id}</Heading>
      <Box mb={6} p={4} borderWidth="1px" rounded="md">
        <Heading size="sm">Instructions</Heading>
        <Box textAlign="right" mb={2}>
          <Button size="sm" colorScheme="purple" onClick={downloadPdf} isLoading={pdfLoading}>Download PDF</Button>
        </Box>
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
      </Box>

      <VStack align="stretch" spacing={3} mb={4}>
        <Input type="file" accept=".zip" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <Button colorScheme="blue" onClick={upload}>Upload</Button>
        <Button colorScheme="green" onClick={run}>Run grader</Button>
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

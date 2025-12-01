import { useEffect, useMemo, useState } from 'react'
import {
  Box, Button, Divider, Flex, FormControl, FormHelperText, FormLabel, HStack, Input, Modal, ModalBody,
  ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Switch, Text, Textarea, useToast
} from '@chakra-ui/react'
import { API_BASE } from '../config'

type Step = 0 | 1 | 2

type Props = {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

const defaultMeta = { id: '', title: '', description: '', type: '', enabled: true }

export default function AssignmentWizard({ isOpen, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>(0)
  const [meta, setMeta] = useState(defaultMeta)
  const [instructions, setInstructions] = useState('')
  const [instructionsFile, setInstructionsFile] = useState<File | null>(null)
  const [graderZip, setGraderZip] = useState<File | null>(null)
  const [assetsZip, setAssetsZip] = useState<File | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)
  const toast = useToast()

  const canGoNext = useMemo(() => {
    if (step === 0) return !!(meta.id && meta.title && meta.description && meta.type)
    if (step === 1) return !!(instructions || instructionsFile)
    return true
  }, [step, meta, instructions, instructionsFile])

  const close = () => {
    setStep(0)
    setMeta(defaultMeta)
    setInstructions('')
    setInstructionsFile(null)
    setGraderZip(null)
    setAssetsZip(null)
    setSubmitting(false)
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    setStep(0)
  }, [isOpen])

  const submit = async () => {
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('metadata', JSON.stringify({ ...meta, instructions }))
      if (instructionsFile) fd.append('instructionsFile', instructionsFile)
      if (graderZip) fd.append('graderZip', graderZip)
      if (assetsZip) fd.append('assetsZip', assetsZip)
      const res = await fetch(`${API_BASE}/api/assignments`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Upload failed')
      toast({ title: 'Assignment created', status: 'success' })
      close()
      onCreated()
    } catch (e: any) {
      toast({ title: 'Could not create assignment', description: e?.message, status: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={close} size="4xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Assignment wizard</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex gap={4} flexDir="column">
            <Stepper step={step} />
            {step === 0 && (
              <Box>
                <FormControl isRequired mb={3}>
                  <FormLabel>Assignment ID</FormLabel>
                  <Input value={meta.id} onChange={(e) => setMeta({ ...meta, id: e.target.value.trim() })} placeholder="slug (no spaces)" />
                  <FormHelperText>Used in URLs and folder names. Keep it short and stable.</FormHelperText>
                </FormControl>
                <FormControl isRequired mb={3}>
                  <FormLabel>Title</FormLabel>
                  <Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
                </FormControl>
                <FormControl isRequired mb={3}>
                  <FormLabel>Description</FormLabel>
                  <Textarea value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
                </FormControl>
                <FormControl isRequired mb={3}>
                  <FormLabel>Discipline / type</FormLabel>
                  <Input value={meta.type} onChange={(e) => setMeta({ ...meta, type: e.target.value })} placeholder="e.g. backend, qa, devops" />
                </FormControl>
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0">Enabled on publish</FormLabel>
                  <Switch isChecked={meta.enabled} onChange={(e) => setMeta({ ...meta, enabled: e.target.checked })} />
                </FormControl>
              </Box>
            )}
            {step === 1 && (
              <Box>
                <FormControl mb={3}>
                  <FormLabel>Instructions (Markdown)</FormLabel>
                  <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={8} placeholder="Paste or write the problem statement" />
                  <FormHelperText>Supports Markdown with code fences. You can also upload an .md file.</FormHelperText>
                </FormControl>
                <FormControl>
                  <FormLabel>Upload instructions file</FormLabel>
                  <Input type="file" accept=".md,.markdown" onChange={(e) => setInstructionsFile(e.target.files?.[0] || null)} />
                </FormControl>
              </Box>
            )}
            {step === 2 && (
              <Box>
                <FormControl mb={3}>
                  <FormLabel>Grader package (.zip)</FormLabel>
                  <Input type="file" accept=".zip" onChange={(e) => setGraderZip(e.target.files?.[0] || null)} />
                  <FormHelperText>Bundle your grader folder (with Dockerfile/run scripts) as a zip.</FormHelperText>
                </FormControl>
                <FormControl mb={3}>
                  <FormLabel>Assets for docs (.zip)</FormLabel>
                  <Input type="file" accept=".zip" onChange={(e) => setAssetsZip(e.target.files?.[0] || null)} />
                  <FormHelperText>Optional images or attachments referenced from the instructions.</FormHelperText>
                </FormControl>
                <Text fontSize="sm" color="gray.500">Files are unpacked into <code>docs/assets</code> and <code>grader</code> under the assignment directory.</Text>
              </Box>
            )}
          </Flex>
        </ModalBody>
        <ModalFooter>
          <HStack w="full" justify="space-between">
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <HStack>
              <Button onClick={() => setStep((s) => Math.max(0, (s - 1) as Step))} isDisabled={step === 0}>Back</Button>
              {step < 2 && (
                <Button colorScheme="blue" onClick={() => setStep((s) => Math.min(2, (s + 1) as Step))} isDisabled={!canGoNext}>Next</Button>
              )}
              {step === 2 && (
                <Button colorScheme="green" onClick={submit} isLoading={isSubmitting}>Create</Button>
              )}
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

function Stepper({ step }: { step: Step }) {
  const labels = ['Basics', 'Instructions', 'Packages']
  return (
    <HStack spacing={0} divider={<Divider orientation="vertical" h="6" />}>
      {labels.map((label, idx) => (
        <Flex key={label} direction="column" align="center" px={3} py={2} bg={idx === step ? 'blue.50' : 'gray.50'} borderWidth="1px" borderColor={idx === step ? 'blue.200' : 'gray.100'} rounded="md" flex="1">
          <Text fontWeight="semibold">{label}</Text>
          <Text fontSize="xs" color="gray.500">Step {idx + 1}</Text>
        </Flex>
      ))}
    </HStack>
  )
}

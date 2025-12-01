import { useEffect, useState } from 'react'
import {
  Badge, Box, Button, Flex, Heading, IconButton, Spinner, Stack, Switch, Table, Tbody, Td, Text, Th, Thead, Tr,
  useDisclosure, useToast
} from '@chakra-ui/react'
import { DeleteIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Link } from 'react-router-dom'
import AssignmentWizard from '../components/AssignmentWizard'
import { API_BASE } from '../config'

type Assignment = { id: string; title: string; description: string; type: string; enabled?: boolean }

export default function CreatorDashboard() {
  const [items, setItems] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const wizard = useDisclosure()

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/assignments`)
      const data = await res.json()
      setItems(data || [])
    } catch (e: any) {
      toast({ title: 'Could not load assignments', description: e?.message, status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await fetch(`${API_BASE}/api/assignments/${id}/enabled`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })
      setItems(prev => prev.map(it => it.id === id ? { ...it, enabled } : it))
      toast({ title: enabled ? 'Assignment enabled' : 'Assignment disabled', status: 'success' })
    } catch (e: any) {
      toast({ title: 'Toggle failed', description: e?.message, status: 'error' })
    }
  }

  const remove = async (id: string) => {
    const ok = window.confirm(`Delete assignment "${id}"? This cannot be undone.`)
    if (!ok) return
    try {
      await fetch(`${API_BASE}/api/assignments/${id}`, { method: 'DELETE' })
      setItems(prev => prev.filter(it => it.id !== id))
      toast({ title: 'Assignment deleted', status: 'info' })
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.message, status: 'error' })
    }
  }

  return (
    <Box>
      <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} flexDir={{ base: 'column', md: 'row' }} gap={3} mb={4}>
        <Box>
          <Heading size="md">Assignment creator</Heading>
          <Text color="gray.500">Upload, enable, or retire assignments across teams.</Text>
        </Box>
        <Stack direction={{ base: 'column', sm: 'row' }} spacing={3}>
          <Button onClick={load} variant="outline">Refresh</Button>
          <Button colorScheme="purple" onClick={wizard.onOpen}>New assignment</Button>
        </Stack>
      </Flex>

      {loading ? (
        <Flex align="center" justify="center" py={10}><Spinner /></Flex>
      ) : (
        <Table variant="simple" size="md">
          <Thead>
            <Tr>
              <Th>Title</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {items.map(a => (
              <Tr key={a.id}>
                <Td>
                  <Stack spacing={1}>
                    <Text fontWeight="semibold">{a.title}</Text>
                    <Text fontSize="sm" color="gray.600">{a.description}</Text>
                  </Stack>
                </Td>
                <Td><Badge colorScheme="blue">{a.type}</Badge></Td>
                <Td>
                  <Flex align="center" gap={2}>
                    <Switch isChecked={a.enabled !== false} onChange={(e) => toggleEnabled(a.id, e.target.checked)} />
                    <Text fontSize="sm" color="gray.600">{a.enabled === false ? 'Disabled' : 'Enabled'}</Text>
                  </Flex>
                </Td>
                <Td>
                  <Stack direction="row" spacing={2}>
                    <Button as={Link} to={`/assignment/${a.id}`} size="sm" rightIcon={<ExternalLinkIcon />}>Preview</Button>
                    <IconButton aria-label="Delete" icon={<DeleteIcon />} size="sm" variant="ghost" onClick={() => remove(a.id)} />
                  </Stack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <AssignmentWizard isOpen={wizard.isOpen} onClose={wizard.onClose} onCreated={load} />
    </Box>
  )
}

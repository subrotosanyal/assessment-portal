import { useEffect, useMemo, useState } from 'react'
import { Box, Heading, Text, SimpleGrid, Card, CardHeader, CardBody, Button, Badge, HStack, Input, Flex, Spinner } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../config'

type Assignment = { id: string; title: string; description: string; type: string; enabled?: boolean }

export default function Assignments() {
  const [items, setItems] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE}/api/assignments`).then(async r => {
      const data = await r.json()
      setItems(Array.isArray(data) ? data : [])
    }).finally(() => setLoading(false))
  }, [])

  const visible = useMemo(() => {
    const enabledOnly = items.filter(a => a.enabled !== false)
    if (!query) return enabledOnly
    return enabledOnly.filter(a => `${a.title} ${a.description} ${a.type}`.toLowerCase().includes(query.toLowerCase()))
  }, [items, query])

  return (
    <Box py={4}>
      <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} gap={3} mb={4} direction={{ base: 'column', md: 'row' }}>
        <Heading size="md">Assignments</Heading>
        <Input placeholder="Search by title/type" maxW="320px" value={query} onChange={(e) => setQuery(e.target.value)} />
      </Flex>
      {loading ? (
        <Flex align="center" justify="center" py={10}><Spinner /></Flex>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          {visible.map(a => (
            <Card key={a.id}>
              <CardHeader>
                <HStack justify="space-between" align="flex-start">
                  <Heading size="md">{a.title}</Heading>
                  <Badge colorScheme="blue">{a.type}</Badge>
                </HStack>
              </CardHeader>
              <CardBody>
                <Text mb={3}>{a.description}</Text>
                <Button as={Link} to={`/assignment/${a.id}`} colorScheme="blue">Open</Button>
              </CardBody>
            </Card>
          ))}
          {!visible.length && <Text color="gray.500">No assignments match your filters.</Text>}
        </SimpleGrid>
      )}
    </Box>
  )
}

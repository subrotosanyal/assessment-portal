import { useEffect, useState } from 'react'
import { Box, Heading, Text, SimpleGrid, Card, CardHeader, CardBody, Button } from '@chakra-ui/react'
import { Link } from 'react-router-dom'

type Assignment = { id: string; title: string; description: string; type: string }

export default function Assignments() {
  const [items, setItems] = useState<Assignment[]>([])
  useEffect(() => { fetch('http://localhost:4000/api/assignments').then(r=>r.json()).then(setItems) }, [])
  return (
    <Box py={8}>
      <Heading mb={6}>Assignments</Heading>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        {items.map(a => (
          <Card key={a.id}>
            <CardHeader><Heading size="md">{a.title}</Heading></CardHeader>
            <CardBody>
              <Text mb={3}>{a.description}</Text>
              <Button as={Link} to={`/assignment/${a.id}`} colorScheme="blue">Open</Button>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
    </Box>
  )
}

import { Box, Container, Flex, Heading, HStack, Select, Text, Tooltip, IconButton } from '@chakra-ui/react'
import { Outlet, useNavigate } from 'react-router-dom'
import { ROLE_OPTIONS, useRole } from '../role'
import { ArrowBackIcon } from '@chakra-ui/icons'

export default function AppLayout() {
  const { role, setRole } = useRole()
  const navigate = useNavigate()

  return (
    <Container maxW="14xl" py={6}>
      <Flex align={{ base: 'flex-start', md: 'center' }} justify="space-between" gap={4} mb={6} flexDir={{ base: 'column', md: 'row' }}>
        <Box>
          <Heading size="lg">Assessment Portal</Heading>
          <Text color="gray.500" fontSize="sm">Role-aware console for grading, authoring, and drafting solutions</Text>
        </Box>
        <HStack spacing={3}>
          <Tooltip label="Go back to assignments">
            <IconButton aria-label="Home" icon={<ArrowBackIcon />} onClick={() => navigate('/')} />
          </Tooltip>
          <Select value={role} onChange={(e) => setRole(e.target.value as any)} maxW="220px">
            {ROLE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </HStack>
      </Flex>
      <Outlet />
    </Container>
  )
}

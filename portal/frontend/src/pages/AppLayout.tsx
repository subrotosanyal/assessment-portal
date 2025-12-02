import { Box, Flex, Heading, HStack, IconButton, Select, Text, Tooltip } from '@chakra-ui/react'
import { Outlet, useNavigate } from 'react-router-dom'
import { ROLE_OPTIONS, useRole } from '../role'
import { ArrowBackIcon } from '@chakra-ui/icons'

export default function AppLayout() {
  const { role, setRole } = useRole()
  const navigate = useNavigate()

  return (
    <Flex direction="column" minH="100vh" w="full" bg="gray.50" px={{ base: 4, md: 8 }} py={{ base: 4, md: 6 }}>
      <Flex
        align={{ base: 'flex-start', md: 'center' }}
        justify="space-between"
        gap={4}
        mb={{ base: 4, md: 6 }}
        flexDir={{ base: 'column', md: 'row' }}
      >
        <Box>
          <Heading size="lg">Assessment Portal</Heading>
          <Text color="gray.500" fontSize="sm">
            Role-aware console for grading, authoring, and drafting solutions
          </Text>
        </Box>
        <HStack spacing={3} w={{ base: 'full', md: 'auto' }} justify={{ base: 'flex-start', md: 'flex-end' }}>
          <Tooltip label="Go back to assignments">
            <IconButton aria-label="Home" icon={<ArrowBackIcon />} onClick={() => navigate('/')} />
          </Tooltip>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            maxW="240px"
            w={{ base: 'full', md: 'auto' }}
            bg="white"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </HStack>
      </Flex>
      <Box as="main" flex="1" w="full">
        <Outlet />
      </Box>
    </Flex>
  )
}

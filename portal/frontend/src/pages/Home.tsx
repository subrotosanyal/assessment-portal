import Assignments from './Assignments'
import CreatorDashboard from './CreatorDashboard'
import { useRole } from '../role'
import { Box, Alert, AlertIcon, AlertDescription } from '@chakra-ui/react'

export default function Home() {
  const { role } = useRole()

  return (
    <Box>
      {role === 'creator' ? (
        <CreatorDashboard />
      ) : (
        <>
          {role === 'evaluator' && (
            <Alert status="info" mb={4} borderRadius="md">
              <AlertIcon />
              <AlertDescription>Evaluator view shows only enabled assignments</AlertDescription>
            </Alert>
          )}
          {role === 'candidate' && (
            <Alert status="info" mb={4} borderRadius="md">
              <AlertIcon />
              <AlertDescription>Candidate view adds an in-browser workspace to draft and verify your submission.</AlertDescription>
            </Alert>
          )}
          <Assignments />
        </>
      )}
    </Box>
  )
}
